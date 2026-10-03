const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('scoreValue');
const healthFill = document.getElementById('healthFill');
const restartButton = document.getElementById('restartButton');

const world = {
  width: 2200,
  height: 2200,
};

const keys = {};
const camera = { x: 0, y: 0 };

const state = {
  running: true,
  score: 0,
  lastTime: 0,
  spawnTimer: 0,
  enemies: [],
  bullets: [],
  particles: [],
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  radius: 18,
  speed: 270,
  maxHealth: 100,
  health: 100,
  fireCooldown: 0,
  aimX: 0,
  aimY: 0,
  shotFlash: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function resetGame() {
  state.running = true;
  state.score = 0;
  state.spawnTimer = 0.8;
  state.enemies = [];
  state.bullets = [];
  state.particles = [];

  player.x = world.width / 2;
  player.y = world.height / 2;
  player.health = player.maxHealth;
  player.fireCooldown = 0;
  player.shotFlash = 0;

  updateHUD();
}

function updateHUD() {
  scoreValue.textContent = String(state.score);
  const healthRatio = clamp(player.health / player.maxHealth, 0, 1);
  healthFill.style.width = `${healthRatio * 100}%`;
}

function updateCamera() {
  camera.x = clamp(player.x - canvas.width / 2, 0, world.width - canvas.width);
  camera.y = clamp(player.y - canvas.height / 2, 0, world.height - canvas.height);
}

function shoot() {
  if (!state.running || player.fireCooldown > 0) return;

  const angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
  const bulletSpeed = 660;

  state.bullets.push({
    x: player.x + Math.cos(angle) * 26,
    y: player.y + Math.sin(angle) * 26,
    vx: Math.cos(angle) * bulletSpeed,
    vy: Math.sin(angle) * bulletSpeed,
    radius: 5,
    life: 1.2,
  });

  player.fireCooldown = 0.14;
  player.shotFlash = 0.08;
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (edge === 0) {
    x = randomBetween(0, world.width);
    y = -30;
  } else if (edge === 1) {
    x = world.width + 30;
    y = randomBetween(0, world.height);
  } else if (edge === 2) {
    x = randomBetween(0, world.width);
    y = world.height + 30;
  } else {
    x = -30;
    y = randomBetween(0, world.height);
  }

  state.enemies.push({
    x,
    y,
    radius: randomBetween(14, 22),
    speed: randomBetween(70, 130),
    health: 1,
    hitCooldown: 0,
    flash: 0,
  });
}

function createParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomBetween(50, 220);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomBetween(0.2, 0.6),
      radius: randomBetween(2, 5),
      color,
    });
  }
}

function handleInput(dt) {
  let moveX = 0;
  let moveY = 0;

  if (keys['w'] || keys['arrowup']) moveY -= 1;
  if (keys['s'] || keys['arrowdown']) moveY += 1;
  if (keys['a'] || keys['arrowleft']) moveX -= 1;
  if (keys['d'] || keys['arrowright']) moveX += 1;

  const length = Math.hypot(moveX, moveY) || 1;
  const normalizedX = moveX / length;
  const normalizedY = moveY / length;

  player.x += normalizedX * player.speed * dt;
  player.y += normalizedY * player.speed * dt;

  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);

  if (keys[' '] || keys['space']) {
    shoot();
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = state.bullets[i];
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.life <= 0 ||
      bullet.x < -20 ||
      bullet.x > world.width + 20 ||
      bullet.y < -20 ||
      bullet.y > world.height + 20
    ) {
      state.bullets.splice(i, 1);
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const enemy = state.enemies[j];
      const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
      if (dist < bullet.radius + enemy.radius) {
        enemy.health -= 1;
        enemy.flash = 0.12;
        state.bullets.splice(i, 1);
        createParticles(bullet.x, bullet.y, '#ffd166', 6);

        if (enemy.health <= 0) {
          state.score += 10;
          createParticles(enemy.x, enemy.y, '#ff5d73', 18);
          state.enemies.splice(j, 1);
        }
        break;
      }
    }
  }
}

function updateEnemies(dt) {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const enemy = state.enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;

    enemy.x += (dx / dist) * enemy.speed * dt;
    enemy.y += (dy / dist) * enemy.speed * dt;
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);

    const collisionDist = enemy.radius + player.radius;
    if (dist < collisionDist) {
      if (enemy.hitCooldown <= 0) {
        player.health -= 12;
        updateHUD();
        createParticles(player.x, player.y, '#ff6b6b', 12);
        enemy.hitCooldown = 0.6;
      }
    }

    if (player.health <= 0) {
      player.health = 0;
      state.running = false;
      updateHUD();
      break;
    }
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function updateGame(dt) {
  if (!state.running) return;

  updateCamera();
  handleInput(dt);

  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.shotFlash = Math.max(0, player.shotFlash - dt);

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = Math.max(0.4, 1.2 - state.score / 200);
  }

  updateBullets(dt);
  updateEnemies(dt);
  updateParticles(dt);
  updateHUD();
}

function drawBackground() {
  ctx.fillStyle = '#0b1113';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gridSize = 56;
  ctx.strokeStyle = 'rgba(143, 173, 180, 0.08)';
  ctx.lineWidth = 1;

  for (let x = -camera.x % gridSize; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = -camera.y % gridSize; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  const drawX = player.x - camera.x;
  const drawY = player.y - camera.y;
  const angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);

  ctx.save();
  ctx.translate(drawX, drawY);
  ctx.rotate(angle);
  ctx.fillStyle = '#7ef29a';
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d8ffeb';
  ctx.fillRect(8, -3, 18, 6);

  if (player.shotFlash > 0) {
    ctx.fillStyle = 'rgba(255, 240, 150, 0.9)';
    ctx.fillRect(18, -2, 14, 4);
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  const drawX = enemy.x - camera.x;
  const drawY = enemy.y - camera.y;

  ctx.fillStyle = enemy.flash > 0 ? '#ffd6d8' : '#ff5d73';
  ctx.beginPath();
  ctx.arc(drawX, drawY, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.arc(bullet.x - camera.x, bullet.y - camera.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCrosshair() {
  const crossX = player.aimX - camera.x;
  const crossY = player.aimY - camera.y;

  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(crossX - 8, crossY);
  ctx.lineTo(crossX + 8, crossY);
  ctx.moveTo(crossX, crossY - 8);
  ctx.lineTo(crossX, crossY + 8);
  ctx.stroke();
}

function drawGameOver() {
  if (state.running) return;

  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 52px Arial';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 16);
  ctx.font = '24px Arial';
  ctx.fillStyle = '#d8f9ff';
  ctx.fillText('Press R or click Restart', canvas.width / 2, canvas.height / 2 + 26);
}

function render() {
  drawBackground();

  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }

  drawBullets();
  drawPlayer();
  drawParticles();
  drawCrosshair();
  drawGameOver();
}

function gameLoop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.033);
  state.lastTime = timestamp;

  updateGame(dt);
  render();

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === 'r') {
    resetGame();
  }
});

window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = false;
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;

  player.aimX = camera.x + mouseX;
  player.aimY = camera.y + mouseY;
});

canvas.addEventListener('click', () => {
  if (!state.running) {
    resetGame();
    return;
  }
  shoot();
});

window.addEventListener('mousedown', (event) => {
  if (event.button === 0) {
    if (!state.running) {
      resetGame();
      return;
    }
    shoot();
  }
});

restartButton.addEventListener('click', () => {
  resetGame();
});

resetGame();
requestAnimationFrame(gameLoop);
