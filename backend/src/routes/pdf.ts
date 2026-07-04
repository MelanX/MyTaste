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

// Delius (the app's handwritten brand font) is used throughout, matching the app.
// Delius ships a single weight, so markdown emphasis is faked: italic/bold via
// pdfkit's `oblique` slant, underline via the real underline. Both fonts fall back
// to Helvetica if the asset is missing. Set per-request before the (sync) render.
const DELIUS = 'Delius';
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

  // Title (Delius), left column so it never runs under the QR
  doc.fillColor(INK).font(brandFont).fontSize(23).text(recipe.title, left, topY, { width: leftWidth });
  const titleBottom = doc.y;

  const columnsTop = Math.max(topY, titleBottom + 14);
  const pad = 12;
  const RADIUS = 8;

  // ── Right card: image + ingredients + spices ──
  const rightTop = topY + (qrSize / 6) * 5;
  const rx = rightX + pad;
  const rw = rightWidth - 2 * pad;
  let rc = rightTop + pad;
  if (img) {
    const imgW = Math.min(rw, 150);
    const displayH = Math.min(imgW * (img.h / img.w), 150);
    const imgX = rx + (rw - imgW) / 2;
    doc.save();
    doc.roundedRect(imgX, rc, imgW, displayH, 6).clip();
    doc.image(img.buf, imgX, rc, { width: imgW, height: displayH });
    doc.restore();
    rc += displayH + 14;
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
        rc += 20;
      }
      const diet = tag.kind === 'dietary';
      doc
        .roundedRect(tx, rc, w, 16, 8)
        .lineWidth(0.6)
        .fillAndStroke(diet ? DIET_BG : TAG_BG, diet ? DIET_LINE : LINE);
      doc.fillColor(diet ? DIET_FG : TAG_FG).text(tag.label, tx + 7, rc + 2.5);
      tx += w + 4;
    }
    rc += 24;
  }

  rc = heading(doc, 'Zutaten', rx, rc, rw);
  for (const section of recipe.ingredient_sections ?? []) {
    if (section.title) {
      doc.font(brandFont).fontSize(11).fillColor(ACCENT).text(section.title, rx, rc, { width: rw });
      rc = doc.y + 3;
    }
    for (const ing of section.ingredients ?? []) {
      const amount = `${formatAmount(ing.amount)}${ing.unit ? ` ${ing.unit}` : ''}`.trim();
      const amtW = 56;
      const nameX = rx + amtW;
      const nameW = rw - amtW;
      const yStart = rc;
      doc
        .font(bodyFont)
        .fontSize(9.5)
        .fillColor('#555555')
        .text(amount, rx, yStart, { width: amtW - 4 });
      const afterAmt = doc.y;
      // Split the comma "specification" into italic grey, mirroring the app's ingredient rows.
      const [primary, ...rest] = ing.name.split(',');
      const spec = rest.join(',').trim();
      doc.font(bodyFont).fontSize(9.5).fillColor(INK).text(primary.trim(), nameX, yStart, { width: nameW, continued: !!spec });
      if (spec) doc.font(bodyFont).fontSize(9.5).fillColor(GREY).text(`  ${spec}`, { continued: false, oblique: 10 });
      rc = Math.max(afterAmt, doc.y);
      if (ing.note) {
        doc.font(bodyFont).fontSize(9).fillColor(GREY).text(ing.note, nameX, rc, { width: nameW, oblique: 10 });
        rc = doc.y;
      }
      rc += 4;
    }
  }

  if (recipe.spices && recipe.spices.length > 0) {
    rc += 6;
    rc = heading(doc, 'Gewürze', rx, rc, rw);
    doc.font(bodyFont).fontSize(9);
    let sx = rx;
    for (const spice of recipe.spices) {
      const w = doc.widthOfString(spice) + 14;
      if (sx + w > rx + rw) {
        sx = rx;
        rc += 21;
      }
      doc.roundedRect(sx, rc, w, 16, 8).lineWidth(0.6).strokeColor(LINE).stroke();
      doc.fillColor('#333333').text(spice, sx + 7, rc + 3);
      sx += w + 6;
    }
    rc += 16;
  }
  doc
    .roundedRect(rightX, rightTop, rightWidth, rc + pad - rightTop, RADIUS)
    .lineWidth(0.75)
    .strokeColor(LINE)
    .stroke();

  // ── Left: "Zubereitung" heading, then a card around the steps ──
  let ly = heading(doc, 'Zubereitung', left, columnsTop, leftWidth);
  const lCardTop = ly;
  const lx = left + pad;
  const lw = leftWidth - 2 * pad;
  ly = lCardTop + pad;
  const r = 9; // step-number circle radius
  const textX = lx + 2 * r + 10;
  const textW = lw - 2 * r - 10;
  recipe.instructions.forEach((step, i) => {
    const top = ly;
    doc.circle(lx + r, top + r - 2.5, r).fill(ACCENT);
    doc
      .fillColor('#ffffff')
      .font(brandFont)
      .fontSize(9)
      .text(String(i + 1), lx, top + r - 7.5, { width: 2 * r, align: 'center' });
    const bottom = renderRuns(doc, parseRuns(step), textX, top, textW, 10.5);
    ly = Math.max(bottom, top + 2 * r) + 7;
  });
  doc
    .roundedRect(left, lCardTop, leftWidth, ly - 10 + pad - lCardTop, RADIUS)
    .lineWidth(0.75)
    .strokeColor(LINE)
    .stroke();
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

    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: recipe.title } });
    if (fs.existsSync(DELIUS_PATH)) {
      doc.registerFont(DELIUS, DELIUS_PATH);
      brandFont = DELIUS;
      bodyFont = DELIUS;
    } else {
      brandFont = 'Helvetica-Bold';
      bodyFont = 'Helvetica';
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
