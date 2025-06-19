const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const cors    = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Serve uploads folder and frontend static
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Multer: store files in ./uploads with unique names
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

// JSON file helpers
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file)); }
  catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Gallery API ---
const PHOTOS = path.join(__dirname, 'data', 'photos.json');

app.get('/api/photos', (req, res) => {
  res.json(readJSON(PHOTOS));
});

app.post('/api/photos', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const photos = readJSON(PHOTOS);
  const record = {
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    uploadedAt: Date.now()
  };
  photos.unshift(record);
  writeJSON(PHOTOS, photos);
  res.json(record);
});

// --- Blog & Comments API ---
const POSTS    = path.join(__dirname, 'data', 'posts.json');
const COMMENTS = path.join(__dirname, 'data', 'comments.json');

// Posts CRUD
app.get('/api/posts', (req, res) => res.json(readJSON(POSTS)));
app.post('/api/posts', (req, res) => {
  const { title, body } = req.body;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const posts = readJSON(POSTS);
  const newPost = { id: Date.now(), slug, title, body, createdAt: Date.now() };
  posts.unshift(newPost);
  writeJSON(POSTS, posts);
  res.json(newPost);
});
app.get('/api/posts/:slug', (req, res) => {
  const post = readJSON(POSTS).find(p => p.slug === req.params.slug);
  if (!post) return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

// Comments CRUD
app.get('/api/posts/:slug/comments', (req, res) => {
  const comments = readJSON(COMMENTS).filter(c => c.postId === req.params.slug);
  res.json(comments);
});
app.post('/api/posts/:slug/comments', (req, res) => {
  const { author, text } = req.body;
  const comments = readJSON(COMMENTS);
  const newC = { id: Date.now(), postId: req.params.slug, author, text, createdAt: Date.now() };
  comments.push(newC);
  writeJSON(COMMENTS, comments);
  res.json(newC);
});

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server listening at http://localhost:${PORT}`));