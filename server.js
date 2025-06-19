// server.js
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app       = express();
const PORT      = process.env.PORT || 4000;
let clickCount  = 0;             // in-memory counter

// Enable CORS so your frontend JS can call these APIs
app.use(cors());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve your static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Multer: save incoming files to ./uploads with a timestamped name
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// Helpers for data/photos.json
const META = path.join(__dirname, 'data', 'photos.json');
function readPhotos() {
  try {
    return JSON.parse(fs.readFileSync(META));
  } catch {
    return [];
  }
}
function writePhotos(arr) {
  fs.writeFileSync(META, JSON.stringify(arr, null, 2));
}

// —————————— Gallery API ——————————

// GET all photos metadata
app.get('/api/photos', (req, res) => {
  res.json(readPhotos());
});

// POST a new photo under form-field “file”
app.post('/api/photos', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
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

// —————————— Click API ——————————

// Increment click count
app.post('/api/click', (req, res) => {
  clickCount++;
  console.log(`🔘 Button clicked ${clickCount} time(s)`);
  res.json({ count: clickCount });
});

// Get current click count
app.get('/api/click-count', (req, res) => {
  res.json({ count: clickCount });
});

// Serve index.html for any path that doesn't match /api or /uploads or static files
app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
