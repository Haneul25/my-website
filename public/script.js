// — TAB NAVIGATION & CLIENT-SIDE ROUTER —
const tabs    = ['home','game','gallery','blog'];
const tabBtns = {
  home:    document.getElementById('tab-home'),
  game:    document.getElementById('tab-game'),
  gallery: document.getElementById('tab-gallery'),
  blog:    document.getElementById('tab-blog'),
};
const panes   = {
  home:    document.getElementById('home'),
  game:    document.getElementById('game'),
  gallery: document.getElementById('gallery'),
  blog:    document.getElementById('blog'),
};

function switchTab(tab, push=true) {
  if (!tabs.includes(tab)) tab = 'home';
  // 1) activate button + pane
  tabs.forEach(t => {
    tabBtns[t].classList.toggle('active', t === tab);
    panes[t].classList.toggle('hidden', t !== tab);
  });
  // 2) push URL (unless coming from popstate)
  if (push) {
    const url = tab === 'home' ? '/' : `/${tab}`;
    history.pushState(null, '', url);
  }
  // 3) init dynamic content
  if (tab === 'game')    resetGame();
  if (tab === 'gallery') loadGallery();
  if (tab === 'blog')    loadPostList();
}

// wire up clicks
tabs.forEach(t => {
  tabBtns[t].addEventListener('click', () => switchTab(t));
});

// handle back/forward buttons
window.addEventListener('popstate', () => {
  const path = window.location.pathname.replace(/^\/+/, '') || 'home';
  switchTab(path, false);
});

// on first load, pick the right tab
window.addEventListener('DOMContentLoaded', () => {
  const initial = window.location.pathname.replace(/^\/+/, '') || 'home';
  switchTab(initial, false);
});


// — SNAKE GAME (unchanged) —
const canvas     = document.getElementById('gameCanvas');
const ctx        = canvas.getContext('2d');
const scoreEl    = document.getElementById('score');
const gameOverEl = document.getElementById('gameOver');
const gridSize   = 20;
const tileCount  = canvas.width / gridSize;
let snake, vel, food, score, gameLoop;

window.addEventListener('keydown', e => {
  if (!gameOverEl.classList.contains('hidden')) resetGame();
  switch (e.key) {
    case 'ArrowUp':    if (vel.y !== 1) vel = { x:0, y:-1 }; break;
    case 'ArrowDown':  if (vel.y !== -1) vel = { x:0, y:1 }; break;
    case 'ArrowLeft':  if (vel.x !== 1) vel = { x:-1, y:0 }; break;
    case 'ArrowRight': if (vel.x !== -1) vel = { x:1,  y:0 }; break;
  }
});

function resetGame() {
  snake = [{ x:10, y:10 }];
  vel   = { x:0,  y:0  };
  score = 0;
  scoreEl.textContent = 'Score: 0';
  gameOverEl.classList.add('hidden');
  placeFood();
  clearInterval(gameLoop);
  gameLoop = setInterval(draw, 100);
}

function draw() {
  if (vel.x || vel.y) {
    const head = { x: snake[0].x + vel.x, y: snake[0].y + vel.y };
    snake.unshift(head);
    if (
      head.x < 0 || head.x >= tileCount ||
      head.y < 0 || head.y >= tileCount ||
      snake.slice(1).some(s => s.x === head.x && s.y === head.y)
    ) return endGame();

    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = 'Score: ' + score;
      placeFood();
    } else snake.pop();
  }
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = 'lime';
  snake.forEach(s => ctx.fillRect(s.x*gridSize, s.y*gridSize, gridSize-2, gridSize-2));
  ctx.fillStyle = 'red';
  ctx.fillRect(food.x*gridSize, food.y*gridSize, gridSize-2, gridSize-2);
}

function placeFood() {
  food = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount)
  };
  if (snake.some(s => s.x === food.x && s.y === food.y)) placeFood();
}

function endGame() {
  clearInterval(gameLoop);
  gameOverEl.classList.remove('hidden');
  vel = { x:0, y:0 };
}

resetGame();


// — PHOTO GALLERY (unchanged) —
const fileInput        = document.getElementById('fileInput');
const uploadBtn        = document.getElementById('uploadBtn');
const galleryContainer = document.getElementById('galleryContainer');

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return alert('Select an image!');
  const form = new FormData(); form.append('file', file);
  const res  = await fetch('/api/photos', { method:'POST', body:form });
  if (!res.ok) return alert('Upload failed');
  loadGallery();
});

async function loadGallery() {
  galleryContainer.innerHTML = '';
  const res    = await fetch('/api/photos');
  const photos = await res.json();
  photos.forEach(p => {
    const img = document.createElement('img');
    img.src = p.url;
    galleryContainer.appendChild(img);
  });
}


// — BLOG & COMMENTS (unchanged) —
const newPostForm  = document.getElementById('newPostForm');
const postListEl   = document.getElementById('postList');
const postDetailEl = document.getElementById('postDetail');
const backBtn      = document.getElementById('backToList');
const titleEl      = document.getElementById('postTitle');
const bodyEl       = document.getElementById('postBody');
const commentsEl   = document.getElementById('comments');
const commentForm  = document.getElementById('commentForm');

backBtn.addEventListener('click', () => {
  postDetailEl.classList.add('hidden');
  postListEl.classList.remove('hidden');
});

newPostForm.addEventListener('submit', async e => {
  e.preventDefault();
  const title = newPostForm.title.value;
  const body  = newPostForm.body.value;
  const res   = await fetch('/api/posts', {
    method: 'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ title, body })
  });
  if (!res.ok) return alert('Failed to create post');
  newPostForm.reset();
  loadPostList();
});

async function loadPostList() {
  postDetailEl.classList.add('hidden');
  postListEl.classList.remove('hidden');
  postListEl.innerHTML = '';
  const res   = await fetch('/api/posts');
  const posts = await res.json();
  posts.forEach(p => {
    const btn = document.createElement('button');
    btn.textContent = p.title;
    btn.onclick = () => loadPost(p.slug);
    postListEl.appendChild(btn);
  });
}

async function loadPost(slug) {
  const [pr, cr] = await Promise.all([
    fetch(`/api/posts/${slug}`),
    fetch(`/api/posts/${slug}/comments`)
  ]);
  const post = await pr.json(), comm = await cr.json();

  titleEl.textContent  = post.title;
  bodyEl.innerHTML     = post.body;
  commentsEl.innerHTML = comm.map(c =>
    `<p><strong>${c.author}</strong>: ${c.text}</p>`
  ).join('');

  commentForm.onsubmit = async ev => {
    ev.preventDefault();
    const author = commentForm.author.value;
    const text   = commentForm.text.value;
    const resp   = await fetch(`/api/posts/${slug}/comments`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ author, text })
    });
    const newC = await resp.json();
    commentsEl.innerHTML += `<p><strong>${newC.author}</strong>: ${newC.text}</p>`;
    commentForm.reset();
  };

  postListEl.classList.add('hidden');
  postDetailEl.classList.remove('hidden');
}
