// ———————————— Firebase Setup ————————————
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js';
import { getAnalytics }  from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js';
import {
  getFirestore, collection, addDoc, query, orderBy, getDocs
} from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js';
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.9.1/firebase-storage.js';

// Replace with YOUR config from Firebase console (note .appspot.com bucket)
const firebaseConfig = {
  apiKey: "AIzaSyD1yzE793NmHJubwTAV823bm9-bYGQCrKc",
  authDomain: "gallery-6e158.firebaseapp.com",
  projectId: "gallery-6e158",
  storageBucket: "gallery-6e158.appspot.com",
  messagingSenderId: "942823013242",
  appId: "1:942823013242:web:3e84818d0112765a8ff4c3",
  measurementId: "G-JXE6ZZH3Y6"
};

const app       = initializeApp(firebaseConfig);
getAnalytics(app);
const auth      = getAuth(app);
const db        = getFirestore(app);
const storage   = getStorage(app);
signInAnonymously(auth).catch(console.error);

// ———————————— TAB LOGIC ————————————
const tabs   = {
  home: document.getElementById('home'),
  game: document.getElementById('game'),
  gallery: document.getElementById('gallery')
};
const tabBtns = {
  home: document.getElementById('tab-home'),
  game: document.getElementById('tab-game'),
  gallery: document.getElementById('tab-gallery')
};

function switchTab(tab) {
  Object.keys(tabs).forEach(t => {
    tabs[t].classList.toggle('hidden', t !== tab);
    tabBtns[t].classList.toggle('active', t === tab);
  });
  if (tab === 'game') resetGame();
  if (tab === 'gallery') loadGallery();
}

tabBtns.home.addEventListener('click',  () => switchTab('home'));
tabBtns.game.addEventListener('click',  () => switchTab('game'));
tabBtns.gallery.addEventListener('click', () => switchTab('gallery'));

// ———————————— SNAKE GAME ————————————
const canvas     = document.getElementById('gameCanvas');
const ctx        = canvas.getContext('2d');
const scoreEl    = document.getElementById('score');
const gameOverEl = document.getElementById('gameOver');
const gridSize   = 20;
const tileCount  = canvas.width / gridSize;
let snake, vel, food, score, gameLoop;

function draw() {
  if (vel.x || vel.y) {
    const head = { x: snake[0].x + vel.x, y: snake[0].y + vel.y };
    snake.unshift(head);

    // collisions
    if (
      head.x < 0 || head.x >= tileCount ||
      head.y < 0 || head.y >= tileCount ||
      snake.slice(1).some(s=> s.x===head.x && s.y===head.y)
    ) return endGame();

    // eat
    if (head.x===food.x && head.y===food.y) {
      score++;
      scoreEl.textContent = 'Score: ' + score;
      placeFood();
    } else {
      snake.pop();
    }
  }

  // draw
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = 'lime';
  snake.forEach(seg =>
    ctx.fillRect(seg.x*gridSize, seg.y*gridSize, gridSize-2, gridSize-2)
  );

  ctx.fillStyle = 'red';
  ctx.fillRect(food.x*gridSize, food.y*gridSize, gridSize-2, gridSize-2);
}

function placeFood() {
  food = {
    x: Math.floor(Math.random()*tileCount),
    y: Math.floor(Math.random()*tileCount)
  };
  if (snake.some(s=> s.x===food.x && s.y===food.y)) placeFood();
}

function endGame() {
  clearInterval(gameLoop);
  gameOverEl.classList.remove('hidden');
  vel = { x: 0, y: 0 };
}

window.addEventListener('keydown', e => {
  if (!gameOverEl.classList.contains('hidden')) resetGame();
  switch (e.key) {
    case 'ArrowUp':    if (vel.y!==1) vel = { x:0, y:-1 }; break;
    case 'ArrowDown':  if (vel.y!==-1) vel = { x:0, y:1 }; break;
    case 'ArrowLeft':  if (vel.x!==1) vel = { x:-1,y:0 }; break;
    case 'ArrowRight': if (vel.x!==-1) vel = { x:1, y:0 }; break;
    default: return;
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

// start
resetGame();

// ———————————— PHOTO GALLERY ————————————
const fileInput        = document.getElementById('fileInput');
const uploadBtn        = document.getElementById('uploadBtn');
const galleryContainer = document.getElementById('galleryContainer');

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return alert('Please select an image first.');

  // upload to Storage
  const imgRef = storageRef(storage, `gallery/${Date.now()}_${file.name}`);
  await uploadBytes(imgRef, file);

  // get URL & save to Firestore
  const url = await getDownloadURL(imgRef);
  await addDoc(collection(db, 'photos'), { url, timestamp: Date.now() });

  // refresh gallery
  loadGallery();
});

async function loadGallery() {
  galleryContainer.innerHTML = '';
  const q    = query(collection(db, 'photos'), orderBy('timestamp','desc'));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const img = document.createElement('img');
    img.src   = doc.data().url;
    galleryContainer.appendChild(img);
  });
}
