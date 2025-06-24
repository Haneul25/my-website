// server.js
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── 1) MIDDLEWARE ────────────────────────────────────────────────────────────
// Enable CORS so your frontend can call the API
app.use(cors());

// Parse JSON bodies (for future blog/posts endpoints, etc.)
app.use(express.json());

// ─── 2) STATIC FILES ──────────────────────────────────────────────────────────
// Serve uploaded files under /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve your client (index.html, script.js, styles.css) from /public
app.use(express.static(path.join(__dirname, 'public')));

// ─── 3) MULTER SETUP ──────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    // prefix timestamp to avoid name collisions
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const upload = multer({ storage });

// ─── 4) GALLERY API ───────────────────────────────────────────────────────────
const PHOTOS_META = path.join(__dirname, 'data', 'photos.json');

function readPhotos() {
  try {
    return JSON.parse(fs.readFileSync(PHOTOS_META));
  } catch {
    return [];
  }
}
function writePhotos(arr) {
  fs.writeFileSync(PHOTOS_META, JSON.stringify(arr, null, 2));
}

// GET all photos metadata
app.get('/api/photos', (req, res) => {
  res.json(readPhotos());
});

// POST a new photo under form field “file”
app.post('/api/photos', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const photos = readPhotos();
  const record = {
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    uploadedAt: Date.now()
  };

  photos.unshift(record);
  writePhotos(photos);

  res.json(record);
});

// ─── 5) CLICK COUNTER API (optional) ───────────────────────────────────────────
let clickCount = 0;

// Increment
app.post('/api/click', (req, res) => {
  clickCount++;
  console.log(`🔘 Button clicked ${clickCount} time(s)`);
  res.json({ count: clickCount });
});

// Fetch current
app.get('/api/click-count', (req, res) => {
  res.json({ count: clickCount });
});

// ─── 6) SPA FALLBACK ───────────────────────────────────────────────────────────
// For any route not matched above, serve index.html to let your
// client-side router (tabs, blog, etc.) take over.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START THE SERVER ─────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`🚀 Server listening at http://localhost:${PORT}`)
);
