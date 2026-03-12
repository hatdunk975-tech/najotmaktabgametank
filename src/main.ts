/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Constants & Types ---

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TANK_SIZE = 36; // Slightly larger for detail
const BULLET_SIZE = 5;
const OBSTACLE_SIZE = 40;
const SPAWN_RATE = 0.005; // Slower spawn for static obstacles

enum WeaponType {
  KNIFE = 'KNIFE',
  GRENADE = 'GRENADE',
  KALASH = 'KALASH',
  SNIPER = 'SNIPER',
}

enum UpgradeType {
  HEALTH = 'HEALTH',
  SHIELD = 'SHIELD',
  SPEED = 'SPEED',
  DAMAGE = 'DAMAGE',
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

interface Upgrade {
  type: UpgradeType;
  name: string;
  price: number;
  icon: string;
  desc: string;
}

const WEAPONS: Record<WeaponType, Weapon> = {
  [WeaponType.KNIFE]: { type: WeaponType.KNIFE, name: 'Pichoq', price: 50, damage: 30, speed: 12, cooldown: 40, icon: '⚔️' },
  [WeaponType.GRENADE]: { type: WeaponType.GRENADE, name: 'Granata', price: 150, damage: 60, speed: 6, cooldown: 80, icon: '💣' },
  [WeaponType.KALASH]: { type: WeaponType.KALASH, name: 'Kalash', price: 300, damage: 15, speed: 15, cooldown: 20, icon: '⚡' },
  [WeaponType.SNIPER]: { type: WeaponType.SNIPER, name: 'Sniper', price: 500, damage: 90, speed: 22, cooldown: 120, icon: '🎯' },
};

const UPGRADES: Record<UpgradeType, Upgrade> = {
  [UpgradeType.HEALTH]: { type: UpgradeType.HEALTH, name: 'To\'liq HP', price: 100, icon: '❤️', desc: 'Jonni to\'ldiradi' },
  [UpgradeType.SHIELD]: { type: UpgradeType.SHIELD, name: 'Qalqon', price: 150, icon: '🛡️', desc: '100% Qalqon beradi' },
  [UpgradeType.SPEED]: { type: UpgradeType.SPEED, name: 'Tezlik+', price: 200, icon: '🏃', desc: 'Tezlikni 10% oshiradi' },
  [UpgradeType.DAMAGE]: { type: UpgradeType.DAMAGE, name: 'Zarar+', price: 300, icon: '🔥', desc: 'Zararni 10% oshiradi' },
};

interface Atmosphere {
  id: string;
  name: string;
  bg: string;
  color: string;
}

const ATMOSPHERES: Atmosphere[] = [
  { id: 'desert', name: 'Sahro', bg: 'https://picsum.photos/seed/desert-battle/800/600', color: '#f59e0b' },
  { id: 'forest', name: 'O\'rmon', bg: 'https://picsum.photos/seed/forest-battle/800/600', color: '#10b981' },
  { id: 'night', name: 'Tun', bg: 'https://picsum.photos/seed/night-battle/800/600', color: '#6366f1' },
  { id: 'urban', name: 'Shahar', bg: 'https://picsum.photos/seed/city-battle/800/600', color: '#94a3b8' },
];

interface TankModel {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  icon: string;
  color: string;
  price: number;
}

const TANK_MODELS: TankModel[] = [
  { id: 'balanced', name: 'Universal', hp: 100, speed: 4, damage: 1, icon: '🛡️', color: '#3b82f6', price: 0 },
  { id: 'heavy', name: 'Og\'ir', hp: 180, speed: 2.5, damage: 1.5, icon: '🐘', color: '#475569', price: 1500 },
  { id: 'light', name: 'Yengil', hp: 70, speed: 6, damage: 0.8, icon: '🐆', color: '#fbbf24', price: 1200 },
  { id: 'sniper', name: 'Sniper', hp: 80, speed: 3.5, damage: 2, icon: '🎯', color: '#ef4444', price: 2000 },
  { id: 'golden', name: 'Oltin Tank', hp: 250, speed: 5, damage: 2.5, icon: '👑', color: '#fbbf24', price: 99999 },
];

// Persistent State
let userTotalMoney = Number(localStorage.getItem('tank_total_money')) || 500;
let ownedTankIds = JSON.parse(localStorage.getItem('tank_owned_ids') || '["balanced"]');
let totalPlayTime = Number(localStorage.getItem('tank_play_time')) || 0; // in seconds
let claimedRewards = JSON.parse(localStorage.getItem('tank_claimed_rewards') || '[]');

const REWARDS = [
  { id: 'reward_15', time: 15 * 60, amount: 500, label: '15 daqiqa' },
  { id: 'reward_30', time: 30 * 60, amount: 1000, label: '30 daqiqa' },
  { id: 'reward_45', time: 45 * 60, amount: 1500, label: '45 daqiqa' },
  { id: 'reward_60', time: 60 * 60, amount: 3000, label: '1 soat' },
];

function saveUserState() {
  localStorage.setItem('tank_total_money', userTotalMoney.toString());
  localStorage.setItem('tank_owned_ids', JSON.stringify(ownedTankIds));
  localStorage.setItem('tank_play_time', totalPlayTime.toString());
  localStorage.setItem('tank_claimed_rewards', JSON.stringify(claimedRewards));
}

interface Tank {
  id: string;
  team: 'red' | 'blue';
  isBot: boolean;
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  shield: number;
  money: number;
  weapon: WeaponType;
  inventory: WeaponType[];
  lastShot: number;
  color: string;
  level: number;
  damageMult: number;
  speed: number;
  model: string;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  ownerTeam: 'red' | 'blue';
  damage: number;
  life: number;
}

interface StaticObstacle {
  id: number;
  x: number;
  y: number;
  type: 'rock' | 'mine' | 'health' | 'shield' | 'gold';
  value: number;
}

type GameMode = '1vs1' | '1vs2' | '1vs3' | '1vs4' | '1vs5' | '2vs2' | '3vs3' | '4vs4' | '5vs5';

// --- Game State ---

let gameState: 'menu' | 'playing' | 'gameOver' = 'menu';
let selectedMode: GameMode = '1vs1';
let selectedAtmosphere = ATMOSPHERES[0];
let selectedTankModel = TANK_MODELS[0];
let isLocalCoop = false;
interface LuckyBox {
  id: number;
  x: number;
  y: number;
  life: number;
}

let tanks: Tank[] = [];
let bullets: Bullet[] = [];
let obstacles: StaticObstacle[] = [];
let luckyBoxes: LuckyBox[] = [];
let scores = { red: 0, blue: 0 };
let playerScore = 0;
let winner: 'red' | 'blue' | null = null;
let currentShopTeam: 'red' | 'blue' | null = null;
let screenShake = 0;
let bgImg = new Image();

const keys: Record<string, boolean> = {};

// --- DOM Elements ---

const menuScreen = document.getElementById('menu-screen')!;
const gameScreen = document.getElementById('game-screen')!;
const modeGrid = document.getElementById('mode-grid')!;
const atmosphereGrid = document.getElementById('atmosphere-grid')!;
const tankTypeGrid = document.getElementById('tank-type-grid')!;
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
    btn.className = `p-4 rounded-2xl border-2 transition-all font-black italic uppercase bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 cursor-pointer`;
    btn.onclick = () => {
      selectedMode = mode;
      updateModeUI();
    };
    modeGrid.appendChild(btn);
  });

  // Setup Atmospheres
  ATMOSPHERES.forEach(atm => {
    const btn = document.createElement('button');
    btn.textContent = atm.name;
    btn.className = `px-4 py-2 rounded-xl border-2 transition-all font-bold uppercase text-xs bg-neutral-900 border-neutral-800 text-neutral-500 cursor-pointer`;
    btn.onclick = () => {
      selectedAtmosphere = atm;
      updateAtmosphereUI();
    };
    atmosphereGrid.appendChild(btn);
  });

  // Setup Tank Models
  TANK_MODELS.forEach(() => {
    const btn = document.createElement('button');
    tankTypeGrid.appendChild(btn);
  });

  updateModeUI();
  updateAtmosphereUI();
  updateTankUI();

  // Event Listeners
  window.addEventListener('keydown', e => keys[e.code] = true);
  window.addEventListener('keyup', e => keys[e.code] = false);

  canvas.onmousemove = (e) => {
    if (gameState !== 'playing') {
      canvas.style.cursor = 'default';
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const isOverBox = luckyBoxes.some(box => Math.hypot(mx - box.x, my - box.y) < 30);
    canvas.style.cursor = isOverBox ? 'pointer' : 'default';
  };

  canvas.onclick = (e) => {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    luckyBoxes = luckyBoxes.filter(box => {
      const dist = Math.hypot(mx - box.x, my - box.y);
      if (dist < 30) {
        // Collect Lucky Box
        const rewards = [
          { name: 'Oltin', val: 500, type: 'money' },
          { name: 'Achko', val: 200, type: 'score' },
          { name: 'Qalqon', val: 100, type: 'shield' }
        ];
        const r = rewards[Math.floor(Math.random() * rewards.length)];
        const player = tanks.find(t => t.id === 'red-0');
        if (player) {
          if (r.type === 'money') player.money += r.val;
          if (r.type === 'score') playerScore += r.val;
          if (r.type === 'shield') player.shield = 100;
          updateHUDs();
          
          // Visual feedback
          const msg = document.createElement('div');
          msg.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-black text-yellow-500 animate-bounce pointer-events-none z-[100]';
          msg.textContent = `+${r.val} ${r.name}!`;
          document.body.appendChild(msg);
          setTimeout(() => msg.remove(), 1000);
        }
        return false;
      }
      return true;
    });
  };

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
      btn.className = `p-4 rounded-2xl border-2 transition-all font-black italic uppercase bg-emerald-500 border-white text-black scale-105 shadow-lg cursor-pointer`;
    } else {
      btn.className = `p-4 rounded-2xl border-2 transition-all font-black italic uppercase bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-600 cursor-pointer`;
    }
  });
}

function updateRewardsUI() {
  const rewardsContainer = document.getElementById('rewards-container')!;
  if (!rewardsContainer) return;
  rewardsContainer.innerHTML = '';

  REWARDS.forEach(reward => {
    const isClaimed = claimedRewards.includes(reward.id);
    const canClaim = totalPlayTime >= reward.time && !isClaimed;
    
    const div = document.createElement('div');
    div.className = `flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
      isClaimed ? 'bg-neutral-950 border-neutral-900 opacity-40' : 
      canClaim ? 'bg-emerald-500/20 border-emerald-500 animate-pulse cursor-pointer' : 
      'bg-neutral-900 border-neutral-800 opacity-60'
    }`;

    div.innerHTML = `
      <span class="text-[10px] font-black uppercase mb-1">${reward.label}</span>
      <span class="text-xs font-mono ${canClaim ? 'text-emerald-400' : 'text-neutral-500'}">${isClaimed ? 'OLINDI' : `$${reward.amount}`}</span>
    `;

    if (canClaim) {
      div.onclick = (e) => {
        e.stopPropagation();
        userTotalMoney += reward.amount;
        claimedRewards.push(reward.id);
        
        // Special reward for 1 hour
        if (reward.id === 'reward_60') {
          if (!ownedTankIds.includes('golden')) {
            ownedTankIds.push('golden');
            alert(`TABRIKLAYMIZ! Siz 1 soat o'ynaganingiz uchun MAXSUS OLTIN TANK (👑) sovg'asini oldingiz!`);
          }
        }

        saveUserState();
        updateTankUI();
        if (reward.id !== 'reward_60') {
          alert(`Tabriklaymiz! Siz ${reward.label} o'ynaganingiz uchun $${reward.amount} sovg'a oldingiz!`);
        }
      };
    }
    rewardsContainer.appendChild(div);
  });

  const timeDisplay = document.getElementById('playtime-display')!;
  if (timeDisplay) {
    const hrs = Math.floor(totalPlayTime / 3600);
    const mins = Math.floor((totalPlayTime % 3600) / 60);
    const secs = Math.floor(totalPlayTime % 60);
    timeDisplay.textContent = hrs > 0 ? 
      `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` :
      `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Update live timer if in game
  const liveTimer = document.getElementById('live-timer');
  if (liveTimer && gameState === 'playing') {
    const mins = Math.floor(totalPlayTime / 60);
    const secs = Math.floor(totalPlayTime % 60);
    liveTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Timer to track playtime
setInterval(() => {
  if (gameState === 'playing') {
    totalPlayTime++;
    updateRewardsUI();
    if (totalPlayTime % 10 === 0) saveUserState();
  }
  if (gameState === 'menu') {
    updateRewardsUI();
  }
}, 1000);

function updateAtmosphereUI() {
  const btns = atmosphereGrid.querySelectorAll('button');
  btns.forEach(btn => {
    if (btn.textContent === selectedAtmosphere.name) {
      btn.className = `px-4 py-2 rounded-xl border-2 transition-all font-bold uppercase text-xs bg-white border-white text-black scale-105 cursor-pointer`;
    } else {
      btn.className = `px-4 py-2 rounded-xl border-2 transition-all font-bold uppercase text-xs bg-neutral-900 border-neutral-800 text-neutral-500 cursor-pointer`;
    }
  });
}

function updateTankUI() {
  const btns = tankTypeGrid.querySelectorAll('button');
  const totalMoneyDisplay = document.getElementById('total-money-display')!;
  totalMoneyDisplay.textContent = `$${userTotalMoney}`;

  updateRewardsUI();

  TANK_MODELS.forEach((model, i) => {
    const btn = btns[i] as HTMLButtonElement;
    const isOwned = ownedTankIds.includes(model.id);
    const isSelected = model.id === selectedTankModel.id;

    btn.innerHTML = `
      <div class="flex flex-col items-center gap-1">
        <span class="text-xl ${model.id === 'golden' ? 'animate-bounce' : ''}">${model.icon}</span>
        <span class="text-[8px] font-black uppercase">${model.name}</span>
        ${!isOwned ? `<span class="text-[8px] font-mono text-emerald-400">${model.id === 'golden' ? 'SOVG\'A' : `$${model.price}`}</span>` : ''}
      </div>
    `;

    if (isSelected) {
      btn.className = `p-3 rounded-2xl border-2 transition-all bg-emerald-500 border-white text-black scale-110 shadow-lg cursor-pointer`;
    } else if (isOwned) {
      btn.className = `p-3 rounded-2xl border-2 transition-all bg-neutral-900 border-neutral-800 text-neutral-500 hover:border-neutral-600 cursor-pointer`;
    } else {
      btn.className = `p-3 rounded-2xl border-2 transition-all bg-neutral-900 border-neutral-800 text-neutral-700 opacity-80 cursor-pointer`;
    }

    btn.onclick = () => {
      if (isOwned) {
        selectedTankModel = model;
        updateTankUI();
      } else {
        if (model.id === 'golden') {
          alert("Bu tankni faqat 1 soat o'ynab sovg'a sifatida olish mumkin!");
          return;
        }
        if (userTotalMoney >= model.price) {
          if (confirm(`${model.name} tankini $${model.price} ga sotib olasizmi?`)) {
            userTotalMoney -= model.price;
            ownedTankIds.push(model.id);
            selectedTankModel = model;
            saveUserState();
            updateTankUI();
          }
        } else {
          alert("Mablag' yetarli emas!");
        }
      }
    };
  });
}

function setGameState(state: typeof gameState) {
  gameState = state;
  menuScreen.classList.toggle('hidden', state !== 'menu');
  gameScreen.classList.toggle('hidden', state !== 'playing' && state !== 'gameOver');
  gameOverOverlay.classList.toggle('hidden', state !== 'gameOver');
  
  const liveTimer = document.getElementById('live-timer');
  if (liveTimer) {
    liveTimer.classList.toggle('hidden', state !== 'playing');
  }

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
  obstacles = [];
  luckyBoxes = [];
  winner = null;
  playerScore = 0;

  bgImg.src = selectedAtmosphere.bg;

  // Red Team
  for (let i = 0; i < redCount; i++) {
    const level = i + 1;
    const isPlayer = i === 0;
    const model = isPlayer ? selectedTankModel : TANK_MODELS[Math.floor(Math.random() * TANK_MODELS.length)];
    
    tanks.push({
      id: `red-${i}`, team: 'red', isBot: !isPlayer,
      x: 100, y: (CANVAS_HEIGHT / (redCount + 1)) * (i + 1),
      angle: 0, health: (model.hp + (level * 20)), maxHealth: (model.hp + (level * 20)),
      shield: 0, money: 200, level, damageMult: model.damage + (level * 0.1),
      weapon: WeaponType.KALASH, inventory: [WeaponType.KALASH],
      lastShot: 0, color: isPlayer ? '#ef4444' : '#991b1b',
      speed: model.speed, model: model.id
    });
  }

  // Blue Team
  for (let i = 0; i < blueCount; i++) {
    const level = i + 1;
    const isPlayer = isLocalCoop && i === 0;
    const model = isPlayer ? selectedTankModel : TANK_MODELS[Math.floor(Math.random() * TANK_MODELS.length)];

    tanks.push({
      id: `blue-${i}`, team: 'blue', isBot: !isPlayer,
      x: CANVAS_WIDTH - 100, y: (CANVAS_HEIGHT / (blueCount + 1)) * (i + 1),
      angle: Math.PI, health: (model.hp + (level * 20)), maxHealth: (model.hp + (level * 20)),
      shield: 0, money: 200, level, damageMult: model.damage + (level * 0.1),
      weapon: WeaponType.KALASH, inventory: [WeaponType.KALASH],
      lastShot: 0, color: isPlayer ? '#3b82f6' : '#1e3a8a',
      speed: model.speed, model: model.id
    });
  }

  // Initial Obstacles
  for (let i = 0; i < 8; i++) {
    spawnObstacle();
  }

  currentModeEl.textContent = mode;
  setGameState('playing');
  const liveTimer = document.getElementById('live-timer');
  if (liveTimer) liveTimer.classList.remove('hidden');
  updateHUDs();
}

function spawnObstacle() {
  const types: StaticObstacle['type'][] = ['rock', 'mine', 'health', 'shield', 'gold'];
  const type = types[Math.floor(Math.random() * types.length)];
  obstacles.push({
    id: Date.now() + Math.random(),
    x: Math.random() * (CANVAS_WIDTH - 100) + 50,
    y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
    type,
    value: type === 'mine' ? 40 : (type === 'gold' ? 100 : 50)
  });
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
  if (screenShake > 0) screenShake *= 0.9;
  else screenShake = 0;

  // Lucky Box Spawning
  if (Math.random() < 0.002) {
    luckyBoxes.push({
      id: Date.now(),
      x: Math.random() * (CANVAS_WIDTH - 100) + 50,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
      life: 600
    });
  }
  luckyBoxes = luckyBoxes.filter(box => {
    box.life--;
    return box.life > 0;
  });

  // 1. Move Tanks
  tanks.forEach(tank => {
    if (tank.health <= 0) return;

    if (!tank.isBot) {
      const speed = tank.speed;
      const rotSpeed = 0.07;

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
        tank.angle += Math.sign(angleDiff) * 0.04;
        const dist = Math.hypot(dx, dy);
        if (dist > 180) {
          tank.x += Math.cos(tank.angle) * (tank.speed * 0.5);
          tank.y += Math.sin(tank.angle) * (tank.speed * 0.5);
        }
        if (Math.abs(angleDiff) < 0.3 && Date.now() - tank.lastShot > WEAPONS[tank.weapon].cooldown * 24) {
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

  // 3. Spawning Obstacles
  if (Math.random() < SPAWN_RATE && obstacles.length < 15) {
    spawnObstacle();
  }

  // 4. Collisions
  bullets.forEach((b, bIdx) => {
    // Tank Collisions
    tanks.forEach(tank => {
      if (tank.health <= 0) return;
      if (b.ownerTeam !== tank.team) {
        const dist = Math.hypot(b.x - tank.x, b.y - tank.y);
        if (dist < TANK_SIZE / 2) {
          const damage = b.damage;
          if (tank.shield > 0) {
            const remainingDamage = Math.max(0, damage - tank.shield);
            tank.shield = Math.max(0, tank.shield - damage);
            tank.health -= remainingDamage;
          } else {
            tank.health -= damage;
          }
          
          if (tank.id === 'red-0') screenShake = 10;
          
          // Kill Reward
          if (tank.health <= 0) {
            const killer = tanks.find(t => t.id === b.ownerId);
            if (killer) {
              killer.money += 150; // In-game money
              if (killer.id === 'red-0') playerScore += 100; // Persistent score
              updateHUDs();
            }
          }
          
          bullets.splice(bIdx, 1);
        }
      }
    });

    // Obstacle Collisions with Bullets
    obstacles.forEach((obj, oIdx) => {
      if (obj.type === 'rock') {
        const dist = Math.hypot(b.x - obj.x, b.y - obj.y);
        if (dist < 20) bullets.splice(bIdx, 1);
      }
    });
  });

  // Tank vs Obstacle
  obstacles = obstacles.filter(obj => {
    let collected = false;
    tanks.forEach(tank => {
      if (tank.health <= 0) return;
      const dist = Math.hypot(obj.x - tank.x, obj.y - tank.y);
      if (dist < TANK_SIZE) {
        if (obj.type === 'gold') {
          tank.money += obj.value;
          if (tank.id === 'red-0') {
            playerScore += obj.value / 2;
            updateHUDs();
          }
        }
        else if (obj.type === 'mine') {
          if (tank.shield > 0) tank.shield = Math.max(0, tank.shield - obj.value);
          else tank.health -= obj.value;
        }
        else if (obj.type === 'health') tank.health = Math.min(tank.maxHealth, tank.health + obj.value);
        else if (obj.type === 'shield') tank.shield = Math.min(100, tank.shield + obj.value);
        else if (obj.type === 'rock') {
          // Push back
          const angle = Math.atan2(tank.y - obj.y, tank.x - obj.x);
          tank.x += Math.cos(angle) * 5;
          tank.y += Math.sin(angle) * 5;
          return; // Don't collect rocks
        }
        collected = true;
        updateHUDs();
      }
    });
    return !collected;
  });

  // Win Condition
  const player = tanks.find(t => t.id === 'red-0');
  const playerAlive = player && player.health > 0;
  const redAlive = tanks.some(t => t.team === 'red' && t.health > 0);
  const blueAlive = tanks.some(t => t.team === 'blue' && t.health > 0);

  if (!playerAlive || !blueAlive) {
    winner = blueAlive ? 'blue' : 'red';
    if (winner) scores[winner]++;
    scoreRedEl.textContent = scores.red.toString();
    scoreBlueEl.textContent = scores.blue.toString();
    
    // Reward Calculation
    const reward = (winner === 'red' ? 200 : 50) + (playerScore);
    userTotalMoney += reward;
    saveUserState();

    winnerText.innerHTML = `
      <div class="flex flex-col items-center gap-2">
        <span class="${!playerAlive ? 'text-red-600' : (winner === 'red' ? 'text-emerald-500' : 'text-blue-500')}">
          ${!playerAlive ? 'SIZ MAG\'LUB BO\'LDINGIZ! 💀' : (winner === 'red' ? 'G\'ALABA QOZONDINGIZ! 🏆' : 'KO\'K JAMOA G\'ALABA QOZONDI!')}
        </span>
        <div class="flex flex-col items-center">
          <span class="text-xl text-neutral-400 uppercase font-black">Achko: ${playerScore}</span>
          <span class="text-3xl text-emerald-400 font-mono">+$${reward} Mukofot!</span>
        </div>
      </div>
    `;
    winnerText.className = `text-5xl font-black uppercase italic mb-4 text-center`;
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
    ownerId: tank.id,
    ownerTeam: tank.team,
    damage: weapon.damage * tank.damageMult,
    life: weapon.type === WeaponType.KNIFE ? 10 : 200,
  });
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  if (screenShake > 1) {
    const sx = (Math.random() - 0.5) * screenShake;
    const sy = (Math.random() - 0.5) * screenShake;
    ctx.translate(sx, sy);
  }

  // Background Image
  if (bgImg.complete) {
    ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < CANVAS_WIDTH; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
  for (let i = 0; i < CANVAS_HEIGHT; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

  // Obstacles
  obstacles.forEach(obj => {
    if (obj.type === 'rock') {
      ctx.fillStyle = '#4b5563';
      ctx.beginPath(); ctx.arc(obj.x, obj.y, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#374151';
      ctx.beginPath(); ctx.arc(obj.x - 5, obj.y - 5, 10, 0, Math.PI * 2); ctx.fill();
    } else if (obj.type === 'mine') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(obj.x, obj.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(obj.x, obj.y, 12, 0, Math.PI * 2); ctx.stroke();
    } else if (obj.type === 'health') {
      ctx.fillStyle = '#22c55e'; ctx.fillRect(obj.x - 10, obj.y - 10, 20, 20);
      ctx.fillStyle = '#fff'; ctx.fillRect(obj.x - 2, obj.y - 8, 4, 16); ctx.fillRect(obj.x - 8, obj.y - 2, 16, 4);
    } else if (obj.type === 'shield') {
      ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(obj.x, obj.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(obj.x, obj.y, 15, 0, Math.PI * 2); ctx.stroke();
    } else if (obj.type === 'gold') {
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(obj.x, obj.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d97706'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', obj.x, obj.y + 4);
    }
  });

  // Tanks
  tanks.forEach(tank => {
    if (tank.health <= 0) return;
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);
    
    // Treads
    ctx.fillStyle = '#111';
    ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, 8);
    ctx.fillRect(-TANK_SIZE / 2, TANK_SIZE / 2 - 8, TANK_SIZE, 8);
    
    // Body
    ctx.fillStyle = tank.color;
    ctx.fillRect(-TANK_SIZE / 2 + 4, -TANK_SIZE / 2 + 4, TANK_SIZE - 8, TANK_SIZE - 8);
    
    // Turret
    ctx.fillStyle = '#111';
    ctx.fillRect(0, -4, TANK_SIZE / 2 + 12, 8); // Barrel
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); // Turret base
    ctx.fillStyle = tank.color;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); // Turret top
    
    ctx.restore();

    // Stats
    const barW = 40;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(tank.x - barW / 2, tank.y - 35, barW, 6);
    ctx.fillStyle = tank.team === 'red' ? '#ef4444' : '#3b82f6';
    ctx.fillRect(tank.x - barW / 2, tank.y - 35, (tank.health / tank.maxHealth) * barW, 6);
    if (tank.shield > 0) {
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(tank.x - barW / 2, tank.y - 42, (tank.shield / 100) * barW, 3);
    }
    
    // Level
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Lvl ${tank.level}`, tank.x, tank.y + 35);
  });

  // Bullets
  bullets.forEach(b => {
    ctx.fillStyle = b.ownerTeam === 'red' ? '#f87171' : '#60a5fa';
    ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_SIZE, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  });

  // Lucky Boxes
  luckyBoxes.forEach(box => {
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.rotate(Math.sin(Date.now() / 200) * 0.2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-15, -15, 30, 30);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-15, -15, 30, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('?', 0, 7);
    ctx.restore();
  });

  ctx.restore();
}

// --- UI Updates ---

function updateHUDs() {
  hudRed.innerHTML = '';
  hudBlue.innerHTML = '';

  const playerScoreDisplay = document.getElementById('player-score-display')!;
  playerScoreDisplay.textContent = playerScore.toString();

  tanks.filter(t => !t.isBot).forEach(tank => {
    const hud = tank.team === 'red' ? hudRed : hudBlue;
    const container = document.createElement('div');
    container.className = `bg-black/60 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl ${tank.team === 'blue' ? 'text-right' : ''}`;
    
    const info = document.createElement('div');
    info.className = `flex items-center gap-3 mb-3 ${tank.team === 'blue' ? 'justify-end' : ''}`;
    info.innerHTML = tank.team === 'red' ? 
      `<div class="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-xl">👤</div>
       <div class="flex flex-col">
         <span class="text-[10px] uppercase text-neutral-500 font-black">Pul</span>
         <span class="font-mono font-black text-yellow-500 text-xl leading-none">$${tank.money}</span>
       </div>` : 
      `<div class="flex flex-col">
         <span class="text-[10px] uppercase text-neutral-500 font-black">Pul</span>
         <span class="font-mono font-black text-yellow-500 text-xl leading-none">$${tank.money}</span>
       </div>
       <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl">👤</div>`;
    
    const weapons = document.createElement('div');
    weapons.className = `flex gap-2 ${tank.team === 'blue' ? 'justify-end' : ''}`;
    
    const shopBtn = document.createElement('button');
    shopBtn.innerHTML = '<span class="text-xs">🛒 DO\'KON</span>';
    shopBtn.className = `px-4 h-10 flex items-center justify-center gap-2 ${tank.team === 'red' ? 'bg-emerald-500 text-black' : 'bg-emerald-500 text-black'} rounded-xl hover:scale-110 transition-transform font-black shadow-lg cursor-pointer`;
    shopBtn.onclick = () => openShop(tank.team);
    
    if (tank.team === 'red') weapons.appendChild(shopBtn);
    
    tank.inventory.forEach(wType => {
      const btn = document.createElement('button');
      btn.textContent = WEAPONS[wType].icon;
      btn.className = `w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${tank.weapon === wType ? 'bg-white text-black scale-110 shadow-lg' : 'bg-neutral-800 text-white hover:bg-neutral-700'}`;
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
  
  const tank = tanks.find(t => t.team === team && !t.isBot);
  if (!tank) return;

  const sections = [
    { title: 'Qurollar', items: Object.values(WEAPONS), type: 'weapon' },
    { title: 'Yaxshilanishlar', items: Object.values(UPGRADES), type: 'upgrade' }
  ];

  sections.forEach(section => {
    const title = document.createElement('h3');
    title.className = 'text-[10px] font-black uppercase text-neutral-500 mt-4 mb-2 tracking-widest';
    title.textContent = section.title;
    shopItems.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-2';
    
    section.items.forEach((item: any) => {
      const btn = document.createElement('button');
      const canAfford = tank.money >= item.price;
      const isOwnedWeapon = section.type === 'weapon' && tank.inventory.includes(item.type);

      btn.className = `flex flex-col p-3 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${
        canAfford ? 'bg-neutral-800 border-neutral-700 hover:border-emerald-500 hover:scale-[1.02] cursor-pointer' : 'bg-neutral-900 border-neutral-800 opacity-50 cursor-not-allowed'
      }`;
      
      btn.innerHTML = `
        <div class="flex items-center gap-3 mb-1">
          <span class="text-xl group-hover:scale-125 transition-transform">${item.icon}</span>
          <div>
            <p class="font-black uppercase italic text-[10px] leading-tight">${item.name}</p>
            <p class="text-[8px] text-neutral-500">${section.type === 'weapon' ? `Zarar: ${item.damage}` : item.desc}</p>
          </div>
        </div>
        <div class="flex justify-between items-center mt-auto">
          <span class="font-mono font-black text-emerald-400 text-xs">$${item.price}</span>
          ${isOwnedWeapon ? '<span class="text-[8px] font-black text-neutral-500 uppercase">Bor</span>' : ''}
        </div>
      `;

      btn.onclick = () => {
        if (tank.money >= item.price) {
          tank.money -= item.price;
          if (section.type === 'weapon') {
            tank.weapon = item.type;
            if (!tank.inventory.includes(item.type)) tank.inventory.push(item.type);
          } else {
            // Handle Upgrades
            if (item.type === UpgradeType.HEALTH) tank.health = tank.maxHealth;
            if (item.type === UpgradeType.SHIELD) tank.shield = 100;
            if (item.type === UpgradeType.SPEED) tank.speed *= 1.1;
            if (item.type === UpgradeType.DAMAGE) tank.damageMult *= 1.1;
          }
          updateHUDs();
          openShop(team); // Refresh shop to update affordance
        }
      };
      grid.appendChild(btn);
    });
    shopItems.appendChild(grid);
  });

  shopOverlay.classList.remove('hidden');
}

// --- Start ---
init();
