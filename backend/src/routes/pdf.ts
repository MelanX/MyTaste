import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import axios from 'axios';
import QRCode from 'qrcode';
import rateLimit from 'express-rate-limit';
import type { Recipe } from '../utils/fileService.js';
import { readData } from '../utils/fileService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const ASSETS_DIR = path.resolve(__dirname, '..', '..', 'assets');
const DELIUS_PATH = path.join(ASSETS_DIR, 'Delius-Regular.ttf');
const INDIE_FLOWER_PATH = path.join(ASSETS_DIR, 'IndieFlower-Regular.ttf');
const LOGO_PATH = path.join(ASSETS_DIR, 'logo.png');

const router = express.Router();

// PDF generation is comparatively expensive (image fetch + encode), so rate-limit
// per client. Small burst allowed so a Save-then-Share pair isn't rejected.
const pdfLimiter = rateLimit({
  windowMs: 5000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Zu viele PDF-Anfragen. Bitte kurz warten.',
  // The layout tests render several PDFs back to back; throttling them would turn
  // real assertions into silent 429s.
  skip: () => process.env.NODE_ENV === 'test',
});

// Palette mirrors the app's print tokens.
const ACCENT = '#d99c5e';
const INK = '#1a1a1a';
const GREY = '#6c757d';
const LINE = '#cccccc';
const QR_COLOR = '#3d2b1a';
// Tag pills (recipeType neutral / dietary green), mirroring the app's print tokens.
const TAG_BG = '#f3f3f3';
const TAG_FG = '#444444';
const DIET_BG = '#e8f4ee';
const DIET_FG = '#3a7a52';
const DIET_LINE = '#b2d4c0';

// Code → German label maps, mirroring the frontend's typeLabels / dietaryLabels.
const TYPE_LABELS: Record<string, string> = { cooking: 'Kochen', baking: 'Backen', snack: 'Snack', dessert: 'Dessert' };
const DIETARY_LABELS: Record<string, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarisch',
  glutenfree: 'Glutenfrei',
  dairyfree: 'Laktosefrei',
};

export interface RecipeTag {
  label: string;
  kind: 'type' | 'dietary';
}

/** The recipe's display tags in render order: the recipe type first (neutral pill),
 * then each dietary restriction (green pill). Unknown codes pass through unchanged. */
export function recipeTags(recipe: Recipe): RecipeTag[] {
  const tags: RecipeTag[] = [];
  if (recipe.recipeType) tags.push({ label: TYPE_LABELS[recipe.recipeType] ?? recipe.recipeType, kind: 'type' });
  for (const d of recipe.dietaryRestrictions ?? []) tags.push({ label: DIETARY_LABELS[d] ?? d, kind: 'dietary' });
  return tags;
}

// Delius (the app's handwritten brand font) is used for body/section text, and
// Indie Flower for the recipe title — mirroring the app (App.css `h1`). Delius
// ships a single weight, so markdown emphasis is faked: italic/bold via pdfkit's
// `oblique` slant, underline via the real underline. Each font falls back to
// Helvetica if its asset is missing. Set per-request before the (sync) render.
const DELIUS = 'Delius';
const INDIE_FLOWER = 'IndieFlower';
let titleFont = 'Helvetica-Bold';
let brandFont = 'Helvetica-Bold';
let bodyFont = 'Helvetica';

interface Sized {
  buf: Buffer;
  w: number;
  h: number;
}

/** Fetch the recipe image (local upload or remote URL) and re-encode to JPEG so
 * pdfkit — which only embeds JPEG/PNG — can use it regardless of source format
 * (webp/avif/…). Returns null on any failure so the PDF still renders. */
async function loadImage(image?: string | null): Promise<Sized | null> {
  if (!image) return null;
  try {
    let raw: Buffer;
    if (image.startsWith('/uploads/')) {
      raw = await fs.promises.readFile(path.join(UPLOAD_DIR, path.basename(image)));
    } else if (/^https?:\/\//.test(image)) {
      const res = await axios.get<ArrayBuffer>(image, { responseType: 'arraybuffer', timeout: 8000 });
      raw = Buffer.from(res.data);
    } else {
      return null;
    }
    const buf = await sharp(raw).resize({ width: 400, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    const meta = await sharp(buf).metadata();
    return { buf, w: meta.width ?? 1, h: meta.height ?? 1 };
  } catch {
    return null;
  }
}

let logoCache: Sized | null | undefined;
async function loadLogo(): Promise<Sized | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const raw = await fs.promises.readFile(LOGO_PATH);
    const buf = await sharp(raw).resize({ width: 320, withoutEnlargement: true }).png().toBuffer();
    const meta = await sharp(buf).metadata();
    logoCache = { buf, w: meta.width ?? 1, h: meta.height ?? 1 };
  } catch {
    logoCache = null;
  }
  return logoCache;
}

async function loadQr(url: string): Promise<Buffer | null> {
  try {
    return await QRCode.toBuffer(url, { margin: 0, width: 160, color: { dark: QR_COLOR, light: '#ffffff' } });
  } catch {
    return null;
  }
}

const formatAmount = (a?: number): string => (a == null ? '' : String(a).replace('.', ','));
const sanitizeFilename = (s: string): string => s.replace(/[^a-z0-9äöüß\-_ ]/gi, '').trim() || 'rezept';

// ── Inline markdown → styled runs (mirrors the app's renderInlineMarkdown) ──
interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}
function parseRuns(text: string, base: Omit<Run, 'text'> = {}): Run[] {
  // Same grammar as the frontend's renderInlineMarkdown: (.+?) + lookarounds so
  // nested emphasis (e.g. *__**x**__*) parses instead of leaking literal markers.
  const pattern = /(\*\*\*(.+?)\*\*\*)|(__(.+?)__)|(\*\*(.+?)\*\*)|(\*(?!\*)(.+?)(?<!\*)\*(?!\*))|(_(?!_)(.+?)(?<!_)_(?!_))/g;
  const runs: Run[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index), ...base });
    if (m[1] != null) runs.push(...parseRuns(m[2], { ...base, bold: true, italic: true }));
    else if (m[3] != null) runs.push(...parseRuns(m[4], { ...base, underline: true }));
    else if (m[5] != null) runs.push(...parseRuns(m[6], { ...base, bold: true }));
    else if (m[7] != null) runs.push(...parseRuns(m[8], { ...base, italic: true }));
    else if (m[9] != null) runs.push(...parseRuns(m[10], { ...base, italic: true }));
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), ...base });
  return runs.filter((r) => r.text.length > 0);
}

function renderRuns(doc: PDFKit.PDFDocument, runs: Run[], x: number, y: number, width: number, fontSize: number): number {
  if (runs.length === 0) return y;
  runs.forEach((run, i) => {
    doc.font(bodyFont).fontSize(fontSize).fillColor(INK);
    // Delius has one weight → slant (oblique) stands in for bold/italic; underline is real.
    const opts = { width, continued: i < runs.length - 1, underline: !!run.underline, oblique: run.italic || run.bold ? 10 : 0 };
    if (i === 0) doc.text(run.text, x, y, opts);
    else doc.text(run.text, opts);
  });
  return doc.y;
}

// ── Page-aware column flow ──────────────────────────────────────────────────
// The layout is two independent columns of stacked blocks, each wrapped in a card
// border. pdfkit auto-inserts a page break when a `text()` call crosses the bottom
// margin, which used to leave the y bookkeeping pointing at the previous page and the
// card border stroked onto the wrong one. So instead: every block is measured before
// it is drawn, page breaks are taken deliberately, and a card that spans pages is
// remembered as one segment per page and stroked at the end.

const CARD_RADIUS = 8;
const CARD_PAD = 12;

interface CardSegment {
  page: number;
  top: number;
  bottom: number;
}

interface Flow {
  /** Index of the page this column is currently writing to. */
  page: number;
  /** Next free y on that page. */
  y: number;
  /** Top edge of the card segment on that page. */
  segTop: number;
  /** Gap between the last block and the card's bottom edge. */
  tailPad: number;
  /** Card segments already closed on earlier pages. */
  segments: CardSegment[];
}

const contentBottom = (doc: PDFKit.PDFDocument): number => doc.page.height - doc.page.margins.bottom;

/** Switch to page `index`, appending pages until it exists. Requires `bufferPages`. */
function goToPage(doc: PDFKit.PDFDocument, index: number): void {
  while (doc.bufferedPageRange().count <= index) doc.addPage();
  doc.switchToPage(index);
}

const newFlow = (page: number, top: number, tailPad: number): Flow => ({
  page,
  y: top + CARD_PAD,
  segTop: top,
  tailPad,
  segments: [],
});

/** Close the current card segment and continue the column at the top of the next page. */
function breakFlow(doc: PDFKit.PDFDocument, flow: Flow): void {
  flow.segments.push({ page: flow.page, top: flow.segTop, bottom: flow.y + flow.tailPad });
  flow.page += 1;
  goToPage(doc, flow.page);
  flow.segTop = doc.page.margins.top;
  flow.y = flow.segTop + CARD_PAD;
}

/** Make room for a block `needed` points tall, breaking to a new page if it doesn't
 * fit. A block taller than a whole page can never fit, so it is placed as-is instead
 * of breaking forever. */
function reserve(doc: PDFKit.PDFDocument, flow: Flow, needed: number): void {
  if (flow.y + needed <= contentBottom(doc)) return;
  if (flow.y <= doc.page.margins.top + CARD_PAD + 0.5) return; // already at the top
  breakFlow(doc, flow);
}

/** Re-sync a flow after pdfkit broke a page on its own (a block taller than a page).
 * Returns true when that happened. */
function resyncAfterOverflow(doc: PDFKit.PDFDocument, flow: Flow, pagesBefore: number): boolean {
  const pagesAfter = doc.bufferedPageRange().count;
  if (pagesAfter === pagesBefore) return false;
  flow.segments.push({ page: flow.page, top: flow.segTop, bottom: contentBottom(doc) });
  for (let p = pagesBefore; p < pagesAfter - 1; p += 1) {
    flow.segments.push({ page: p, top: doc.page.margins.top, bottom: contentBottom(doc) });
  }
  flow.page = pagesAfter - 1;
  flow.segTop = doc.page.margins.top;
  return true;
}

/** Stroke the card border: one rounded rect per page the column spans. */
function strokeCard(doc: PDFKit.PDFDocument, flow: Flow, x: number, width: number): void {
  const segments = [...flow.segments, { page: flow.page, top: flow.segTop, bottom: flow.y + flow.tailPad }];
  for (const seg of segments) {
    const height = seg.bottom - seg.top;
    if (height <= CARD_PAD) continue; // nothing of this column landed on that page
    goToPage(doc, seg.page);
    doc.roundedRect(x, seg.top, width, height, CARD_RADIUS).lineWidth(0.75).strokeColor(LINE).stroke();
  }
}

/** Height the runs will occupy once wrapped — they all share one font and size, so
 * measuring the concatenation matches how `renderRuns` chains them with `continued`. */
const runsHeight = (doc: PDFKit.PDFDocument, runs: Run[], width: number, fontSize: number): number =>
  doc
    .font(bodyFont)
    .fontSize(fontSize)
    .heightOfString(runs.map((r) => r.text).join(''), { width });

function heading(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number): number {
  doc.fillColor(INK).font(brandFont).fontSize(15).text(text, x, y, { width });
  const bottom = doc.y + 2;
  doc
    .moveTo(x, bottom)
    .lineTo(x + width, bottom)
    .lineWidth(0.75)
    .strokeColor(ACCENT)
    .stroke();
  return bottom + 8;
}

function renderRecipe(doc: PDFKit.PDFDocument, recipe: Recipe, img: Sized | null, qr: Buffer | null, logo: Sized | null) {
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Logo, centered at the top
  let topY = doc.page.margins.top - 10;
  let qrY = topY;

  if (logo) {
    const logoW = 100;
    const logoH = logoW * (logo.h / logo.w);
    doc.image(logo.buf, (doc.page.width - logoW) / 2, topY, { width: logoW });
    topY += logoH + 10;
  }

  const gap = 24;
  const rightWidth = 175;
  const leftWidth = contentWidth - rightWidth - gap;
  const rightX = left + leftWidth + gap;
  const qrSize = 58;

  if (qr) {
    const qrX = rightX + rightWidth - qrSize;
    doc.image(qr, qrX, qrY, { width: qrSize });
    // Caption directly below the QR, scaled so its width spans exactly the QR width.
    const label = 'Originalrezept';
    doc.font(bodyFont);
    const fontSize = (qrSize / doc.fontSize(10).widthOfString(label)) * 10;
    doc
      .fontSize(fontSize)
      .fillColor(INK)
      .text(label, qrX, qrY + qrSize + 3, { width: qrSize, align: 'center' });
  }

  // Title (Indie Flower), left column so it never runs under the QR
  doc.fillColor(INK).font(titleFont).fontSize(23).text(recipe.title, left, topY, { width: leftWidth });
  const titleBottom = doc.y;

  const columnsTop = Math.max(topY, titleBottom + 14);
  const pad = CARD_PAD;
  const startPage = doc.bufferedPageRange().count - 1;

  // ── Right card: image + ingredients + spices ──
  const rightTop = topY + (qrSize / 6) * 5;
  const rx = rightX + pad;
  const rw = rightWidth - 2 * pad;
  const rightFlow = newFlow(startPage, rightTop, pad);
  if (img) {
    const imgW = Math.min(rw, 150);
    const displayH = Math.min(imgW * (img.h / img.w), 150);
    const imgX = rx + (rw - imgW) / 2;
    doc.save();
    doc.roundedRect(imgX, rightFlow.y, imgW, displayH, 6).clip();
    doc.image(img.buf, imgX, rightFlow.y, { width: imgW, height: displayH });
    doc.restore();
    rightFlow.y += displayH + 14;
  }

  // Tags (recipe type + dietary restrictions) as pills, above "Zutaten" like the app.
  const tags = recipeTags(recipe);
  if (tags.length > 0) {
    doc.font(bodyFont).fontSize(9);
    let tx = rx;
    for (const tag of tags) {
      const w = doc.widthOfString(tag.label) + 14;
      if (tx > rx && tx + w > rx + rw) {
        tx = rx;
        rightFlow.y += 20;
      }
      const diet = tag.kind === 'dietary';
      doc
        .roundedRect(tx, rightFlow.y, w, 16, 8)
        .lineWidth(0.6)
        .fillAndStroke(diet ? DIET_BG : TAG_BG, diet ? DIET_LINE : LINE);
      doc.fillColor(diet ? DIET_FG : TAG_FG).text(tag.label, tx + 7, rightFlow.y + 2.5);
      tx += w + 4;
    }
    rightFlow.y += 24;
  }

  rightFlow.y = heading(doc, 'Zutaten', rx, rightFlow.y, rw);
  const amtW = 56;
  const nameX = rx + amtW;
  const nameW = rw - amtW;
  for (const section of recipe.ingredient_sections ?? []) {
    if (section.title) {
      doc.font(brandFont).fontSize(11);
      reserve(doc, rightFlow, doc.heightOfString(section.title, { width: rw }));
      doc.fillColor(ACCENT).text(section.title, rx, rightFlow.y, { width: rw });
      rightFlow.y = doc.y + 3;
    }
    for (const ing of section.ingredients ?? []) {
      const amount = `${formatAmount(ing.amount)}${ing.unit ? ` ${ing.unit}` : ''}`.trim();
      // Split the comma "specification" into italic grey, mirroring the app's ingredient rows.
      const [primary, ...rest] = ing.name.split(',');
      const spec = rest.join(',').trim();
      doc.font(bodyFont).fontSize(9.5);
      const rowH = Math.max(
        doc.heightOfString(amount, { width: amtW - 4 }),
        doc.heightOfString(spec ? `${primary.trim()}  ${spec}` : primary.trim(), { width: nameW }),
      );
      const noteH = ing.note ? doc.fontSize(9).heightOfString(ing.note, { width: nameW }) : 0;
      reserve(doc, rightFlow, rowH + noteH);

      const yStart = rightFlow.y;
      doc
        .font(bodyFont)
        .fontSize(9.5)
        .fillColor('#555555')
        .text(amount, rx, yStart, { width: amtW - 4 });
      const afterAmt = doc.y;
      doc.font(bodyFont).fontSize(9.5).fillColor(INK).text(primary.trim(), nameX, yStart, { width: nameW, continued: !!spec });
      if (spec) doc.font(bodyFont).fontSize(9.5).fillColor(GREY).text(`  ${spec}`, { continued: false, oblique: 10 });
      rightFlow.y = Math.max(afterAmt, doc.y);
      if (ing.note) {
        doc.font(bodyFont).fontSize(9).fillColor(GREY).text(ing.note, nameX, rightFlow.y, { width: nameW, oblique: 10 });
        rightFlow.y = doc.y;
      }
      rightFlow.y += 4;
    }
  }

  if (recipe.spices && recipe.spices.length > 0) {
    rightFlow.y += 6;
    reserve(doc, rightFlow, 26 + 16);
    rightFlow.y = heading(doc, 'Gewürze', rx, rightFlow.y, rw);
    doc.font(bodyFont).fontSize(9);
    let sx = rx;
    for (const spice of recipe.spices) {
      const w = doc.widthOfString(spice) + 14;
      if (sx + w > rx + rw) {
        sx = rx;
        rightFlow.y += 21;
        reserve(doc, rightFlow, 16);
      }
      doc.roundedRect(sx, rightFlow.y, w, 16, 8).lineWidth(0.6).strokeColor(LINE).stroke();
      doc.fillColor('#333333').text(spice, sx + 7, rightFlow.y + 3);
      sx += w + 6;
    }
    rightFlow.y += 16;
  }

  // ── Left: "Zubereitung" heading, then a card around the steps ──
  goToPage(doc, startPage); // the right column may have run onto later pages
  const lCardTop = heading(doc, 'Zubereitung', left, columnsTop, leftWidth);
  const leftFlow = newFlow(startPage, lCardTop, pad - 10);
  const lx = left + pad;
  const lw = leftWidth - 2 * pad;
  const r = 9; // step-number circle radius
  const textX = lx + 2 * r + 10;
  const textW = lw - 2 * r - 10;
  recipe.instructions.forEach((step, i) => {
    const runs = parseRuns(step);
    reserve(doc, leftFlow, Math.max(runsHeight(doc, runs, textW, 10.5), 2 * r));

    const top = leftFlow.y;
    doc.circle(lx + r, top + r - 2.5, r).fill(ACCENT);
    doc
      .fillColor('#ffffff')
      .font(brandFont)
      .fontSize(9)
      .text(String(i + 1), lx, top + r - 7.5, { width: 2 * r, align: 'center' });

    const pagesBefore = doc.bufferedPageRange().count;
    const bottom = renderRuns(doc, runs, textX, top, textW, 10.5);
    // `top` belongs to the page the step started on, so it may only be mixed into the
    // running y when the step did not spill onto a page of its own.
    leftFlow.y = resyncAfterOverflow(doc, leftFlow, pagesBefore) ? bottom + 7 : Math.max(bottom, top + 2 * r) + 7;
  });

  strokeCard(doc, rightFlow, rightX, rightWidth);
  strokeCard(doc, leftFlow, left, leftWidth);
}

router.get('/recipe/:id/pdf', pdfLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await readData();
    const recipe = data.recipes.find((r) => r.id === req.params.id);
    if (!recipe) return res.status(404).send('Recipe not found');

    const [img, qr, logo] = await Promise.all([
      loadImage(recipe.image),
      recipe.url ? loadQr(recipe.url) : Promise.resolve(null),
      loadLogo(),
    ]);

    // bufferPages keeps every page addressable until `end()`, so the two columns can
    // be laid out independently and their card borders stroked per page afterwards.
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, info: { Title: recipe.title } });
    if (fs.existsSync(DELIUS_PATH)) {
      doc.registerFont(DELIUS, DELIUS_PATH);
      brandFont = DELIUS;
      bodyFont = DELIUS;
    } else {
      brandFont = 'Helvetica-Bold';
      bodyFont = 'Helvetica';
    }
    // Title font: Indie Flower, falling back to the brand font (Delius/Helvetica).
    if (fs.existsSync(INDIE_FLOWER_PATH)) {
      doc.registerFont(INDIE_FLOWER, INDIE_FLOWER_PATH);
      titleFont = INDIE_FLOWER;
    } else {
      titleFont = brandFont;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${sanitizeFilename(recipe.title)}.pdf"`);
    doc.pipe(res);
    renderRecipe(doc, recipe, img, qr, logo);
    doc.end();
  } catch (err) {
    next(err);
  }
});

export default router;
