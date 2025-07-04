const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT||4000;

// ensure directories
const DATA_DIR    = path.join(__dirname,'data');
const UPLOADS_DIR = path.join(__dirname,'uploads');
if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// init JSON files
;['posts.json','comments.json','photos.json','daily.json'].forEach(fn=>{
  const p = path.join(DATA_DIR,fn);
  if (!fs.existsSync(p)) fs.writeFileSync(p,'[]');
});

// middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname,'public')));

// multer setup
const storage = multer.diskStorage({
  destination:(req,file,cb)=>cb(null,UPLOADS_DIR),
  filename:   (req,file,cb)=>cb(null,Date.now()+'_'+file.originalname)
});
const upload = multer({storage});

// helpers
function readJSON(fn){ return JSON.parse(
  fs.readFileSync(path.join(DATA_DIR,fn))
);}
function writeJSON(fn,data){
  fs.writeFileSync(
    path.join(DATA_DIR,fn),
    JSON.stringify(data,null,2)
  );
}

// — Gallery API —
app.get  ('/api/photos',(req,res)=>res.json(readJSON('photos.json')));
app.post ('/api/photos',upload.single('file'),(req,res)=>{
  if(!req.file) return res.status(400).json({error:'No file.'});
  const a = readJSON('photos.json');
  const record = {
    url:`/uploads/${req.file.filename}`,
    filename:req.file.filename,
    originalName:req.file.originalname,
    uploadedAt:Date.now()
  };
  a.unshift(record);
  writeJSON('photos.json',a);
  res.json(record);
});

// — Blog API —
app.get ('/api/posts',(req,res)=>res.json(readJSON('posts.json')));
app.post('/api/posts',(req,res)=>{
  const {title,body}=req.body;
  if(!title||!body) return res.status(400).json({error:'Missing.'});
  const slug=title.toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
  const a=readJSON('posts.json');
  const newPost={id:Date.now(),slug,title,body,createdAt:Date.now()};
  a.unshift(newPost);
  writeJSON('posts.json',a);
  res.json(newPost);
});
app.get('/api/posts/:slug',(req,res)=>{
  const p=readJSON('posts.json')
    .find(x=>x.slug===req.params.slug);
  if(!p) return res.status(404).json({error:'Not found'});
  res.json(p);
});

// — Comments API —
app.get('/api/posts/:slug/comments',(req,res)=>{
  const all=readJSON('comments.json');
  res.json(all.filter(c=>c.postId===req.params.slug));
});
app.post('/api/posts/:slug/comments',(req,res)=>{
  const {author,text}=req.body;
  if(!author||!text) return res.status(400).json({error:'Missing.'});
  const all=readJSON('comments.json');
  const newC={id:Date.now(),postId:req.params.slug,author,text,createdAt:Date.now()};
  all.push(newC);
  writeJSON('comments.json',all);
  res.json(newC);
});

// — Daily Progress & Tasks API —
app.get('/api/daily',(req,res)=>{
  const all = readJSON('daily.json');
  // return array of task-strings
  res.json(all.map(d=>d.task));
});
app.post('/api/daily',(req,res)=>{
  const {entry}=req.body;
  if(!entry) return res.status(400).json({error:'Missing entry.'});
  const all=readJSON('daily.json');
  const task=`Continue progress: ${entry.slice(0,30)}...`;
  all.unshift({entry,task,createdAt:Date.now()});
  writeJSON('daily.json',all);
  res.json({task});
});

// SPA fallback
app.use((_,res)=>res.sendFile(
  path.join(__dirname,'public','index.html')
));

app.listen(PORT,()=>console.log(`🚀 Listening at http://localhost:${PORT}`));
