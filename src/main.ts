/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Constants & Types ---

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TANK_SIZE = 30;
const BULLET_SIZE = 4;
const FALLING_SPEED = 2;
const SPAWN_RATE = 0.01;

enum WeaponType {
  KNIFE = 'KNIFE',
  GRENADE = 'GRENADE',
  KALASH = 'KALASH',
  SNIPER = 'SNIPER',
}

interface Weapon {
  type: WeaponType;
  name: string;
  price: number;
  damage: number;
  speed: number;
  cooldown: number;
  icon: string;
}

const WEAPONS: Record<WeaponType, Weapon> = {
  [WeaponType.KNIFE]: { type: WeaponType.KNIFE, name: 'Pichoq', price: 50, damage: 30, speed: 8, cooldown: 50, icon: '⚔️' },
  [WeaponType.GRENADE]: { type: WeaponType.GRENADE, name: 'Granata', price: 150, damage: 60, speed: 4, cooldown: 100, icon: '💣' },
  [WeaponType.KALASH]: { type: WeaponType.KALASH, name: 'Kalash', price: 300, damage: 15, speed: 10, cooldown: 30, icon: '⚡' },
  [WeaponType.SNIPER]: { type: WeaponType.SNIPER, name: 'Sniper', price: 500, damage: 90, speed: 15, cooldown: 150, icon: '🎯' },
};

interface Tank {
  id: string;
  team: 'red' | 'blue';
  isBot: boolean;
  x: number;
  y: number;
  angle: number;
  health: number;
  shield: number;
  money: number;
  weapon: WeaponType;
  inventory: WeaponType[];
  lastShot: number;
  color: string;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerTeam: 'red' | 'blue';
  damage: number;
  life: number;
}

interface FallingObject {
  id: number;
  x: number;
  y: number;
  type: 'gift' | 'obstacle' | 'health' | 'shield' | 'weapon';
  value: number;
}

type GameMode = '1vs1' | '1vs2' | '1vs3' | '1vs4' | '1vs5' | '2vs2' | '3vs3' | '4vs4' | '5vs5';

// --- Game State ---

let gameState: 'menu' | 'playing' | 'gameOver' = 'menu';
let selectedMode: GameMode = '1vs1';
let isLocalCoop = false;
let tanks: Tank[] = [];
let bullets: Bullet[] = [];
let fallingObjects: FallingObject[] = [];
let scores = { red: 0, blue: 0 };
let winner: 'red' | 'blue' | null = null;
let currentShopTeam: 'red' | 'blue' | null = null;

const keys: Record<string, boolean> = {};

// --- DOM Elements ---

const menuScreen = document.getElementById('menu-screen')!;
const gameScreen = document.getElementById('game-screen')!;
const modeGrid = document.getElementById('mode-grid')!;
const startBtn = document.getElementById('start-btn')!;
const coopToggle = document.getElementById('coop-toggle')!;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const scoreRedEl = document.getElementById('score-red')!;
const scoreBlueEl = document.getElementById('score-blue')!;
const currentModeEl = document.getElementById('current-mode')!;
const leaveBtn = document.getElementById('leave-btn')!;
const hudRed = document.getElementById('hud-red')!;
const hudBlue = document.getElementById('hud-blue')!;
const shopOverlay = document.getElementById('shop-overlay')!;
const shopItems = document.getElementById('shop-items')!;
const closeShopBtn = document.getElementById('close-shop')!;
const gameOverOverlay = document.getElementById('game-over-overlay')!;
const winnerText = document.getElementById('winner-text')!;
const rematchBtn = document.getElementById('rematch-btn')!;
const menuBtn = document.getElementById('menu-btn')!;
const p2Controls = document.getElementById('p2-controls')!;

// --- Initialization ---

function init() {
  // Setup Modes
  const modes: GameMode[] = ['1vs1', '1vs2', '1vs3', '1vs4', '1vs5', '2vs2', '3vs3', '4vs4', '5vs5'];
  modes.forEach(mode => {
    const btn = document.createElement('button');
    btn.textContent = mode;
    btn.className = `p-4 rounded-2xl border-2 transition-all font-black italic uppercase bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600`;
    btn.onclick = () => {
      selectedMode = mode;
      updateModeUI();
    };
    modeGrid.appendChild(btn);
  });

  updateModeUI();

  // Event Listeners
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);

  startBtn.onclick = () => initGame(selectedMode);
  coopToggle.onclick = () => {
    isLocalCoop = !isLocalCoop;
    coopToggle.className = `flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all font-bold uppercase ${
      isLocalCoop ? 'bg-blue-500 border-white text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
    }`;
    p2Controls.classList.toggle('hidden', !isLocalCoop);
  };

  leaveBtn.onclick = () => setGameState('menu');
  closeShopBtn.onclick = () => shopOverlay.classList.add('hidden');
  rematchBtn.onclick = () => initGame(selectedMode);
  menuBtn.onclick = () => setGameState('menu');

  requestAnimationFrame(gameLoop);
}

function updateModeUI() {
  const btns = modeGrid.querySelectorAll('button');
  btns.forEach(btn => {
    if (btn.textContent === selectedMode) {
      btn.className = `p-4 rounded-2xl border-2 transition-all font-black italic uppercase bg-emerald-500 border-white text-black scale-105`;
    } else {
      btn.className = `p-4 rounded-2xl border-2 transition-all font-black italic uppercase bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600`;
    }
  });
}

function setGameState(state: typeof gameState) {
  gameState = state;
  menuScreen.classList.toggle('hidden', state !== 'menu');
  gameScreen.classList.toggle('hidden', state !== 'playing' && state !== 'gameOver');
  gameOverOverlay.classList.toggle('hidden', state !== 'gameOver');
  
  if (state === 'menu') {
    shopOverlay.classList.add('hidden');
  }
}

function initGame(mode: GameMode) {
  const counts = mode.split('vs').map(Number);
  const redCount = counts[0];
  const blueCount = counts[1];

  tanks = [];
  bullets = [];
  fallingObjects = [];
  winner = null;

  // Red Team
  for (let i = 0; i < redCount; i++) {
    tanks.push({
      id: `red-${i}`, team: 'red', isBot: i > 0,
      x: 100, y: (CANVAS_HEIGHT / (redCount + 1)) * (i + 1),
      angle: 0, health: 100, shield: 0, money: 200,
      weapon: WeaponType.KALASH, inventory: [WeaponType.KALASH],
      lastShot: 0, color: '#ef4444'
    });
  }

  // Blue Team
  for (let i = 0; i < blueCount; i++) {
    tanks.push({
      id: `blue-${i}`, team: 'blue', isBot: !(isLocalCoop && i === 0),
      x: CANVAS_WIDTH - 100, y: (CANVAS_HEIGHT / (blueCount + 1)) * (i + 1),
      angle: Math.PI, health: 100, shield: 0, money: 200,
      weapon: WeaponType.KALASH, inventory: [WeaponType.KALASH],
      lastShot: 0, color: '#3b82f6'
    });
  }

  currentModeEl.textContent = mode;
  setGameState('playing');
  updateHUDs();
}

// --- Game Logic ---

function gameLoop() {
  if (gameState === 'playing') {
    update();
    draw();
  }
  requestAnimationFrame(gameLoop);
}

function update() {
  // 1. Move Tanks
  tanks.forEach(tank => {
    if (tank.health <= 0) return;

    if (!tank.isBot) {
      const speed = 3;
      const rotSpeed = 0.05;

      if (tank.id === 'red-0') {
        if (keys['KeyA']) tank.angle -= rotSpeed;
        if (keys['KeyD']) tank.angle += rotSpeed;
        if (keys['KeyW']) { tank.x += Math.cos(tank.angle) * speed; tank.y += Math.sin(tank.angle) * speed; }
        if (keys['KeyS']) { tank.x -= Math.cos(tank.angle) * speed; tank.y -= Math.sin(tank.angle) * speed; }
        if (keys['Space'] && Date.now() - tank.lastShot > WEAPONS[tank.weapon].cooldown * 16) {
          fireBullet(tank);
          tank.lastShot = Date.now();
        }
      } else if (tank.id === 'blue-0') {
        if (keys['ArrowLeft']) tank.angle -= rotSpeed;
        if (keys['ArrowRight']) tank.angle += rotSpeed;
        if (keys['ArrowUp']) { tank.x += Math.cos(tank.angle) * speed; tank.y += Math.sin(tank.angle) * speed; }
        if (keys['ArrowDown']) { tank.x -= Math.cos(tank.angle) * speed; tank.y -= Math.sin(tank.angle) * speed; }
        if (keys['Enter'] && Date.now() - tank.lastShot > WEAPONS[tank.weapon].cooldown * 16) {
          fireBullet(tank);
          tank.lastShot = Date.now();
        }
      }
    } else {
      // Bot AI
      const target = tanks.find(t => t.team !== tank.team && t.health > 0);
      if (target) {
        const dx = target.x - tank.x;
        const dy = target.y - tank.y;
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - tank.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        tank.angle += Math.sign(angleDiff) * 0.03;
        const dist = Math.hypot(dx, dy);
        if (dist > 150) {
          tank.x += Math.cos(tank.angle) * 1.5;
          tank.y += Math.sin(tank.angle) * 1.5;
        }
        if (Math.abs(angleDiff) < 0.2 && Date.now() - tank.lastShot > WEAPONS[tank.weapon].cooldown * 32) {
          fireBullet(tank);
          tank.lastShot = Date.now();
        }
      }
    }

    tank.x = Math.max(TANK_SIZE / 2, Math.min(CANVAS_WIDTH - TANK_SIZE / 2, tank.x));
    tank.y = Math.max(TANK_SIZE / 2, Math.min(CANVAS_HEIGHT - TANK_SIZE / 2, tank.y));
  });

  // 2. Update Bullets
  bullets = bullets.map(b => ({ ...b, x: b.x + b.vx, y: b.y + b.vy, life: b.life - 1 }))
    .filter(b => b.life > 0 && b.x > 0 && b.x < CANVAS_WIDTH && b.y > 0 && b.y < CANVAS_HEIGHT);

  // 3. Update Falling Objects
  fallingObjects = fallingObjects.map(obj => ({ ...obj, y: obj.y + FALLING_SPEED })).filter(obj => obj.y < CANVAS_HEIGHT);
  if (Math.random() < SPAWN_RATE) {
    const rand = Math.random();
    let type: FallingObject['type'] = 'gift';
    let value = 50;
    if (rand < 0.3) { type = 'gift'; value = 50; }
    else if (rand < 0.5) { type = 'obstacle'; value = 20; }
    else if (rand < 0.7) { type = 'health'; value = 30; }
    else if (rand < 0.9) { type = 'shield'; value = 50; }
    else { type = 'weapon'; value = 0; }
    fallingObjects.push({ id: Date.now(), x: Math.random() * (CANVAS_WIDTH - 40) + 20, y: -40, type, value });
  }

  // 4. Collisions
  bullets.forEach((b, bIdx) => {
    tanks.forEach(tank => {
      if (tank.health <= 0) return;
      if (b.ownerTeam !== tank.team) {
        const dist = Math.hypot(b.x - tank.x, b.y - tank.y);
        if (dist < TANK_SIZE / 2) {
          if (tank.shield > 0) {
            const remainingDamage = Math.max(0, b.damage - tank.shield);
            tank.shield = Math.max(0, tank.shield - b.damage);
            tank.health -= remainingDamage;
          } else {
            tank.health -= b.damage;
          }
          bullets.splice(bIdx, 1);
        }
      }
    });
  });

  fallingObjects = fallingObjects.filter(obj => {
    let collected = false;
    tanks.forEach(tank => {
      if (tank.health <= 0) return;
      const dist = Math.hypot(obj.x - tank.x, obj.y - tank.y);
      if (dist < TANK_SIZE) {
        if (obj.type === 'gift') tank.money += obj.value;
        else if (obj.type === 'obstacle') {
          if (tank.shield > 0) tank.shield = Math.max(0, tank.shield - obj.value);
          else tank.health -= obj.value;
        }
        else if (obj.type === 'health') tank.health = Math.min(100, tank.health + obj.value);
        else if (obj.type === 'shield') tank.shield = Math.min(100, tank.shield + obj.value);
        else if (obj.type === 'weapon') {
          const weaponTypes = Object.keys(WEAPONS) as WeaponType[];
          const randomWeapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
          if (!tank.inventory.includes(randomWeapon)) tank.inventory.push(randomWeapon);
        }
        collected = true;
        updateHUDs();
      }
    });
    return !collected;
  });

  // Win Condition
  const redAlive = tanks.some(t => t.team === 'red' && t.health > 0);
  const blueAlive = tanks.some(t => t.team === 'blue' && t.health > 0);
  if (!redAlive || !blueAlive) {
    winner = redAlive ? 'red' : 'blue';
    scores[winner]++;
    scoreRedEl.textContent = scores.red.toString();
    scoreBlueEl.textContent = scores.blue.toString();
    winnerText.textContent = `${winner === 'red' ? 'Red' : 'Blue'} Victory!`;
    winnerText.className = `text-7xl font-black uppercase italic mb-4 ${winner === 'red' ? 'text-red-500' : 'text-blue-500'}`;
    setGameState('gameOver');
  }
}

function fireBullet(tank: Tank) {
  const weapon = WEAPONS[tank.weapon];
  bullets.push({
    x: tank.x + Math.cos(tank.angle) * (TANK_SIZE / 2 + 5),
    y: tank.y + Math.sin(tank.angle) * (TANK_SIZE / 2 + 5),
    vx: Math.cos(tank.angle) * weapon.speed,
    vy: Math.sin(tank.angle) * weapon.speed,
    ownerTeam: tank.team,
    damage: weapon.damage,
    life: weapon.type === WeaponType.KNIFE ? 10 : 200,
  });
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grid
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  for (let i = 0; i < CANVAS_WIDTH; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
  for (let i = 0; i < CANVAS_HEIGHT; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

  // Tanks
  tanks.forEach(tank => {
    if (tank.health <= 0) return;
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);
    ctx.fillStyle = tank.color;
    ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, TANK_SIZE);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, -3, TANK_SIZE / 2 + 8, 6);
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Health
    ctx.fillStyle = '#333';
    ctx.fillRect(tank.x - 15, tank.y - 25, 30, 4);
    ctx.fillStyle = tank.health > 30 ? (tank.team === 'red' ? '#ef4444' : '#3b82f6') : '#fff';
    ctx.fillRect(tank.x - 15, tank.y - 25, (tank.health / 100) * 30, 4);
    if (tank.shield > 0) {
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(tank.x - 15, tank.y - 30, (tank.shield / 100) * 30, 2);
    }
  });

  // Bullets
  bullets.forEach(b => {
    ctx.fillStyle = b.ownerTeam === 'red' ? '#f87171' : '#60a5fa';
    ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_SIZE / 2, 0, Math.PI * 2); ctx.fill();
  });

  // Falling
  fallingObjects.forEach(obj => {
    if (obj.type === 'gift') { ctx.fillStyle = '#fbbf24'; ctx.fillRect(obj.x - 8, obj.y - 8, 16, 16); }
    else if (obj.type === 'obstacle') { ctx.fillStyle = '#444'; ctx.beginPath(); ctx.moveTo(obj.x, obj.y - 10); ctx.lineTo(obj.x + 10, obj.y + 10); ctx.lineTo(obj.x - 10, obj.y + 10); ctx.closePath(); ctx.fill(); }
    else if (obj.type === 'health') { ctx.fillStyle = '#22c55e'; ctx.fillRect(obj.x - 8, obj.y - 8, 16, 16); ctx.fillStyle = '#fff'; ctx.fillRect(obj.x - 2, obj.y - 6, 4, 12); ctx.fillRect(obj.x - 6, obj.y - 2, 12, 4); }
    else if (obj.type === 'shield') { ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(obj.x, obj.y, 8, 0, Math.PI * 2); ctx.fill(); }
    else if (obj.type === 'weapon') { ctx.fillStyle = '#a855f7'; ctx.fillRect(obj.x - 8, obj.y - 8, 16, 16); ctx.strokeStyle = '#fff'; ctx.strokeRect(obj.x - 8, obj.y - 8, 16, 16); }
  });
}

// --- UI Updates ---

function updateHUDs() {
  hudRed.innerHTML = '';
  hudBlue.innerHTML = '';

  tanks.filter(t => !t.isBot).forEach(tank => {
    const hud = tank.team === 'red' ? hudRed : hudBlue;
    const container = document.createElement('div');
    container.className = `bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 ${tank.team === 'blue' ? 'text-right' : ''}`;
    
    const info = document.createElement('div');
    info.className = `flex items-center gap-3 mb-2 ${tank.team === 'blue' ? 'justify-end' : ''}`;
    info.innerHTML = tank.team === 'red' ? `<span>👤</span><span class="font-mono font-bold text-yellow-500">$${tank.money}</span>` : `<span class="font-mono font-bold text-yellow-500">$${tank.money}</span><span>👤</span>`;
    
    const weapons = document.createElement('div');
    weapons.className = `flex gap-1 ${tank.team === 'blue' ? 'justify-end' : ''}`;
    
    const shopBtn = document.createElement('button');
    shopBtn.innerHTML = '🛒';
    shopBtn.className = `p-2 ${tank.team === 'red' ? 'bg-red-500' : 'bg-blue-500'} rounded-lg`;
    shopBtn.onclick = () => openShop(tank.team);
    
    if (tank.team === 'red') weapons.appendChild(shopBtn);
    
    tank.inventory.forEach(wType => {
      const btn = document.createElement('button');
      btn.textContent = WEAPONS[wType].icon;
      btn.className = `p-2 rounded-lg ${tank.weapon === wType ? 'bg-white text-black' : 'bg-neutral-800'}`;
      btn.onclick = () => { tank.weapon = wType; updateHUDs(); };
      weapons.appendChild(btn);
    });

    if (tank.team === 'blue') weapons.appendChild(shopBtn);

    container.appendChild(info);
    container.appendChild(weapons);
    hud.appendChild(container);
  });
}

function openShop(team: 'red' | 'blue') {
  currentShopTeam = team;
  shopItems.innerHTML = '';
  (Object.keys(WEAPONS) as WeaponType[]).map(wType => {
    const w = WEAPONS[wType];
    const btn = document.createElement('button');
    btn.className = 'flex items-center justify-between p-4 bg-neutral-800 rounded-2xl hover:bg-neutral-700 transition-colors';
    btn.innerHTML = `
      <div class="flex items-center gap-3">
        <span>${w.icon}</span>
        <span class="font-bold">${w.name}</span>
      </div>
      <span class="font-mono text-emerald-400">$${w.price}</span>
    `;
    btn.onclick = () => {
      const tank = tanks.find(t => t.team === team && !t.isBot);
      if (tank && tank.money >= w.price) {
        tank.money -= w.price;
        tank.weapon = wType;
        if (!tank.inventory.includes(wType)) tank.inventory.push(wType);
        updateHUDs();
        shopOverlay.classList.add('hidden');
      }
    };
    shopItems.appendChild(btn);
  });
  shopOverlay.classList.remove('hidden');
}

// --- Start ---
init();
