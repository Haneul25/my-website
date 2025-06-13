const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('gameOver');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x:10, y:10 }];
let vel = { x:0, y:0 };
let food = { x:5, y:5 };
let score = 0;
let gameLoop;

// Main drawing & update
function draw() {
  // Move snake head
  const head = { x: snake[0].x + vel.x, y: snake[0].y + vel.y };
  snake.unshift(head);

  // Collision with walls/self?
  if (
    head.x < 0 || head.x >= tileCount ||
    head.y < 0 || head.y >= tileCount ||
    snake.slice(1).some(seg => seg.x===head.x && seg.y===head.y)
  ) return endGame();

  // Eating food?
  if (head.x===food.x && head.y===food.y) {
    score++;
    scoreEl.textContent = 'Score: ' + score;
    placeFood();
  } else {
    snake.pop();
  }

  // Clear & redraw
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = 'lime';
  snake.forEach(seg =>
    ctx.fillRect(seg.x*gridSize, seg.y*gridSize, gridSize-2, gridSize-2)
  );

  ctx.fillStyle = 'red';
  ctx.fillRect(food.x*gridSize, food.y*gridSize, gridSize-2, gridSize-2);
}

// Randomly reposition food off of the snake
function placeFood() {
  food.x = Math.floor(Math.random()*tileCount);
  food.y = Math.floor(Math.random()*tileCount);
  if (snake.some(seg => seg.x===food.x && seg.y===food.y)) {
    placeFood();
  }
}

// Stop loop & show game over
function endGame() {
  clearInterval(gameLoop);
  gameOverEl.classList.remove('hidden');
}

// Listen for arrow presses
window.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp':    if (vel.y!==1) vel={x:0,y:-1}; break;
    case 'ArrowDown':  if (vel.y!==-1) vel={x:0,y:1}; break;
    case 'ArrowLeft':  if (vel.x!==1) vel={x:-1,y:0}; break;
    case 'ArrowRight': if (vel.x!==-1) vel={x:1,y:0}; break;
    default: return;
  }
  // If game over, restart on next key
  if (!gameOverEl.classList.contains('hidden')) resetGame();
});

// Reset to initial state
function resetGame() {
  snake = [{ x:10,y:10 }];
  vel = { x:0,y:0 };
  score = 0;
  scoreEl.textContent = 'Score: 0';
  gameOverEl.classList.add('hidden');
  placeFood();
  gameLoop = setInterval(draw, 100);
}

// Start playing!
resetGame();
