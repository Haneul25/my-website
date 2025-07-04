require('dotenv').config();

const express    = require('express');
const multer     = require('multer');
const cors       = require('cors');
const fs         = require('fs');
const path       = require('path');
const { Configuration, OpenAIApi } = require('openai');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── OpenAI setup ─────────────────────────────────────────────────
if (!process.env.OPENAI_API_KEY) {
  console.error('🚨 Missing OPENAI_API_KEY');
  process.exit(1);
}
const openai = new OpenAIApi(
  new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

// ─── Ensure data & uploads dirs ────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// initialize JSON stores if missing
;['posts.json','comments.json','photos.json','daily.json'].forEach(fn => {
  const file = path.join(DATA_DIR, fn);
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
});

// ─── Middlewares ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Multer for photo uploads ──────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) =>
    cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// ─── JSON file helpers ────────────────────────────────────────────
function readJSON(fn) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fn), 'utf8'));
}
function writeJSON(fn, data) {
  fs.writeFileSync(
    path.join(DATA_DIR, fn),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

// ─── Gallery API ─────────────────────────────────────────────────
app.get('/api/photos', (req, res) => {
  res.json(readJSON('photos.json'));
});
app.post('/api/photos', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file.' });
  const arr = readJSON('photos.json');
  const rec = {
    url:          `/uploads/${req.file.filename}`,
    filename:     req.file.filename,
    originalName: req.file.originalname,
    uploadedAt:   Date.now()
  };
  arr.unshift(rec);
  writeJSON('photos.json', arr);
  res.json(rec);
});

// ─── Blog API ────────────────────────────────────────────────────
app.get('/api/posts', (req, res) => {
  res.json(readJSON('posts.json'));
});
app.post('/api/posts', (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Missing.' });
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const arr = readJSON('posts.json');
  const np  = { id: Date.now(), slug, title, body, createdAt: Date.now() };
  arr.unshift(np);
  writeJSON('posts.json', arr);
  res.json(np);
});
app.get('/api/posts/:slug', (req, res) => {
  const p = readJSON('posts.json').find(x => x.slug === req.params.slug);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// ─── Comments API ─────────────────────────────────────────────────
app.get('/api/posts/:slug/comments', (req, res) => {
  const all = readJSON('comments.json');
  res.json(all.filter(c => c.postId === req.params.slug));
});
app.post('/api/posts/:slug/comments', (req, res) => {
  const { author, text } = req.body;
  if (!author || !text) return res.status(400).json({ error: 'Missing.' });
  const all = readJSON('comments.json');
  const nc  = {
    id:        Date.now(),
    postId:    req.params.slug,
    author,
    text,
    createdAt: Date.now()
  };
  all.push(nc);
  writeJSON('comments.json', all);
  res.json(nc);
});

// ─── Daily Progress & LLM Tasks API ──────────────────────────────

// GET → return only the latest three tasks
app.get('/api/daily', (req, res) => {
  const daily = readJSON('daily.json');
  if (!daily.length) return res.json([]);
  res.json(daily[0].tasks);
});

// POST → call OpenAI, save three tasks, return them
app.post('/api/daily', async (req, res) => {
  const { entry } = req.body;
  if (!entry) return res.status(400).json({ error: 'Missing entry.' });

  try {
    const messages = [
      {
        role:    'system',
        content:
          'You are an assistant that suggests three concise, actionable next steps given a brief daily progress entry.'
      },
      {
        role:    'user',
        content:
          `I wrote: "${entry}".\nPlease suggest three specific tasks I can do tomorrow to build on this.`
      }
    ];

    const completion = await openai.createChatCompletion({
      model:       'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens:  150
    });

    const reply = completion.data.choices[0].message.content.trim();
    const tasks = reply
      .split(/\r?\n/)
      .map(l => l.replace(/^\s*[\d\-\.\)]*\s*/, ''))
      .filter(l => l);

    // persist
    const daily = readJSON('daily.json');
    daily.unshift({ entry, tasks, createdAt: Date.now() });
    writeJSON('daily.json', daily);

    res.json({ tasks });
  } catch (err) {
    console.error('❌ OpenAI error:', err);
    res.status(500).json({ error: 'LLM generation failed.' });
  }
});

// ─── SPA fallback ─────────────────────────────────────────────────
app.use((_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start server ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Listening at http://localhost:${PORT}`);
});
