const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// storage location <project root>/backend/uploads
const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const ACCEPTED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'
]
// keep the file in RAM — we’ll save only the converted WebP
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 5 MB
    fileFilter: (_, file, cb) =>
        ACCEPTED_MIME_TYPES.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error('Unsupported MIME type: ' + file.mimetype + ' (Images only!)'))
});

const uploadSingle = upload.single('file');

router.post('/upload-image', authenticateToken, (req, res, next) => {
    uploadSingle(req, res, async err => {
        const validationError = {
            message: 'Validation failed',
            details: [],
        }
        if (err) {
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                validationError.details.push('No file uploaded');
                return res.status(400).send(validationError);
            }

            if (err.code === 'LIMIT_FILE_SIZE') {
                const bytes = Number(req.headers['content-length'] || 0);
                const maxMB = (upload.limits.fileSize / 1024 / 1024).toFixed(0);
                const actualMB = (bytes / 1024 / 1024).toFixed(1);      // includes multipart overhead

                validationError.details.push(`File too large: limit ${ maxMB } MB, received ≈ ${ actualMB } MB`);
                return res.status(413).send(validationError);
            }

            if (err.message.startsWith('Unsupported MIME type:')) {
                validationError.details.push(err.message);
                return res.status(400).send(validationError);
            }

            return next(err);
        }

        if (!req.file) {
            validationError.details.push('No file uploaded');
            return res.status(400).send(validationError);
        }

        try {
            // deterministic random name → <epoch>-<rand>.webp
            const filename = `${ Date.now() }-${ Math.round(Math.random() * 1e9) }.webp`;
            const target = path.join(UPLOAD_DIR, filename);

            // auto-rotate, optionally down-scale, then encode WebP (quality ≈ 80 %)
            await sharp(req.file.buffer)
                .rotate()                                       // honor EXIF
                .resize({ width: 1600, withoutEnlargement: true }) // keep big images reasonable
                .webp({ quality: 80 })
                .toFile(target);

            res.json({ url: `/uploads/${ filename }` });
        } catch (err) {
            next(err);
        }
    });
});

module.exports = router;
