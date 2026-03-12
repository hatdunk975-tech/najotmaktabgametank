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
  ARMOR = 'ARMOR',
  FIRE_RATE = 'FIRE_RATE',
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
  [WeaponType.KNIFE]: { type: WeaponType.KNIFE, name: 'Pichoq', price: 50, damage: 40, speed: 12, cooldown: 40, icon: '⚔️' },
  [WeaponType.GRENADE]: { type: WeaponType.GRENADE, name: 'Bomba', price: 150, damage: 70, speed: 6, cooldown: 80, icon: '💣' },
  [WeaponType.KALASH]: { type: WeaponType.KALASH, name: 'AK-47', price: 300, damage: 15, speed: 15, cooldown: 20, icon: '⚡' },
  [WeaponType.SNIPER]: { type: WeaponType.SNIPER, name: 'Sniper', price: 500, damage: 100, speed: 22, cooldown: 120, icon: '🎯' },
};

const UPGRADES: Record<UpgradeType, Upgrade> = {
  [UpgradeType.HEALTH]: { type: UpgradeType.HEALTH, name: 'To\'liq HP', price: 100, icon: '❤️', desc: 'Jonni to\'ldiradi' },
  [UpgradeType.SHIELD]: { type: UpgradeType.SHIELD, name: 'Qalqon', price: 150, icon: '🛡️', desc: '100% Qalqon beradi' },
  [UpgradeType.SPEED]: { type: UpgradeType.SPEED, name: 'Tezlik+', price: 200, icon: '🏃', desc: 'Tezlikni 10% oshiradi' },
  [UpgradeType.DAMAGE]: { type: UpgradeType.DAMAGE, name: 'Zarar+', price: 300, icon: '🔥', desc: 'Zararni 10% oshiradi' },
  [UpgradeType.ARMOR]: { type: UpgradeType.ARMOR, name: 'Bronya+', price: 400, icon: '🛡️✨', desc: 'Max HP ni 20 ga oshiradi' },
  [UpgradeType.FIRE_RATE]: { type: UpgradeType.FIRE_RATE, name: 'Tezkorlik+', price: 350, icon: '🔫', desc: 'O\'t ochish tezligini 15% oshiradi' },
};

interface Atmosphere {
  id: string;
  name: string;
  bg: string;
  color: string;
}

const ATMOSPHERES: Atmosphere[] = [
  { id: 'neon_grid', name: 'Neon Grid', bg: 'https://picsum.photos/seed/neon-grid/800/600', color: '#06b6d4' },
  { id: 'cyber_city', name: 'Cyber City', bg: 'https://picsum.photos/seed/cyber-city/800/600', color: '#a855f7' },
  { id: 'plasma_storm', name: 'Plasma Storm', bg: 'https://picsum.photos/seed/plasma/800/600', color: '#ec4899' },
  { id: 'dark_sector', name: 'Dark Sector', bg: 'https://picsum.photos/seed/dark/800/600', color: '#10b981' },
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
  { id: 'balanced', name: 'Striker', hp: 100, speed: 3.5, damage: 1, icon: '🛡️', color: '#06b6d4', price: 0 },
  { id: 'heavy', name: 'Titan', hp: 180, speed: 2.2, damage: 1.5, icon: '🐘', color: '#a855f7', price: 1500 },
  { id: 'light', name: 'Ghost', hp: 70, speed: 5, damage: 0.8, icon: '🐆', color: '#10b981', price: 1200 },
  { id: 'sniper', name: 'Sniper', hp: 80, speed: 3, damage: 2, icon: '🎯', color: '#ef4444', price: 2000 },
  { id: 'golden', name: 'Neon King', hp: 250, speed: 4.5, damage: 2.5, icon: '👑', color: '#fbbf24', price: 99999 },
];

// Persistent State
let userTotalMoney = Number(localStorage.getItem('tank_total_money')) || 500;
let ownedTankIds = JSON.parse(localStorage.getItem('tank_owned_ids') || '["balanced"]');
let totalPlayTime = Number(localStorage.getItem('tank_play_time')) || 0; // in seconds
let sessionTime = 0;
let claimedRewards = JSON.parse(localStorage.getItem('tank_claimed_rewards') || '[]');
let lastMoneyTime = Date.now();

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
  fireRateMult: number;
  speed: number;
  model: string;
  treadOffset: number;
  tripleShotTimer: number;
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
const mobileKeys: Record<string, boolean> = {
  up: false, down: false, left: false, right: false, fire: false
};

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

  // Mobile Controls
  const setupMobileBtn = (id: string, key: string) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); mobileKeys[key] = true; });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); mobileKeys[key] = false; });
      btn.addEventListener('mousedown', () => mobileKeys[key] = true);
      btn.addEventListener('mouseup', () => mobileKeys[key] = false);
      btn.addEventListener('mouseleave', () => mobileKeys[key] = false);
    }
  };

  setupMobileBtn('btn-up', 'up');
  setupMobileBtn('btn-down', 'down');
  setupMobileBtn('btn-left', 'left');
  setupMobileBtn('btn-right', 'right');
  setupMobileBtn('btn-fire', 'fire');

  // Resize handler
  const resizeCanvas = () => {
    const container = canvas.parentElement;
    if (!container) return;
    
    const maxWidth = window.innerWidth - 32;
    const maxHeight = window.innerHeight - 250; // Leave space for controls/UI
    
    const ratio = CANVAS_WIDTH / CANVAS_HEIGHT;
    let newWidth = maxWidth;
    let newHeight = newWidth / ratio;
    
    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * ratio;
    }
    
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  canvas.onmousemove = (e) => {
    if (gameState !== 'playing') {
      canvas.style.cursor = 'default';
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const isOverBox = luckyBoxes.some(box => Math.hypot(mx - box.x, my - box.y) < 45);
    canvas.style.cursor = isOverBox ? 'pointer' : 'default';
  };

  canvas.onclick = (e) => {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    luckyBoxes = luckyBoxes.filter(box => {
      const dist = Math.hypot(mx - box.x, my - box.y);
      if (dist < 45) {
        // Collect Lucky Box
        const rewards = [
          { name: 'Oltin', val: 500, type: 'money' },
          { name: 'Achko', val: 200, type: 'score' },
          { name: 'Qalqon', val: 100, type: 'shield' },
          { name: 'Triple Shot', val: 600, type: 'triple' }
        ];
        const r = rewards[Math.floor(Math.random() * rewards.length)];
        const player = tanks.find(t => t.id === 'red-0');
        if (player) {
          if (r.type === 'money') player.money += r.val;
          if (r.type === 'score') playerScore += r.val;
          if (r.type === 'shield') player.shield = 100;
          if (r.type === 'triple') player.tripleShotTimer = r.val;
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
    coopToggle.className = `flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border transition-all font-bold uppercase ${
      isLocalCoop ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]' : 'bg-cyan-500/5 border-cyan-500/30 text-cyan-400'
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
      btn.className = `p-6 rounded-3xl border-2 transition-all font-black italic uppercase bg-cyan-500 border-cyan-400 text-black scale-105 shadow-[0_0_30px_rgba(6,182,212,0.5)] cursor-pointer`;
    } else {
      btn.className = `p-6 rounded-3xl border border-cyan-500/20 transition-all font-black italic uppercase bg-black/40 text-cyan-500/50 hover:border-cyan-500/50 cursor-pointer`;
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
    div.className = `flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${
      isClaimed ? 'bg-black/40 border-cyan-500/10 opacity-30' : 
      canClaim ? 'bg-cyan-500/20 border-cyan-500 animate-pulse cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 
      'bg-black/20 border-cyan-500/5 opacity-60'
    }`;

    div.innerHTML = `
      <span class="text-[8px] font-black uppercase mb-1 text-cyan-500/70">${reward.label}</span>
      <span class="text-xs font-mono font-black ${canClaim ? 'text-cyan-400' : 'text-neutral-600'}">${isClaimed ? 'OLINDI' : `$${reward.amount}`}</span>
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
    const mins = Math.floor(sessionTime / 60);
    const secs = Math.floor(sessionTime % 60);
    liveTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Timer to track playtime
setInterval(() => {
  if (gameState === 'playing') {
    totalPlayTime++;
    sessionTime++;
    userTotalMoney++; // Give $1 every second
    updateRewardsUI();
    const totalMoneyDisplay = document.getElementById('total-money-display');
    if (totalMoneyDisplay) totalMoneyDisplay.textContent = `$${userTotalMoney}`;
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
      btn.className = `px-4 py-3 rounded-xl border-2 transition-all font-black uppercase text-[10px] bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-105 cursor-pointer`;
    } else {
      btn.className = `px-4 py-3 rounded-xl border border-cyan-500/20 transition-all font-bold uppercase text-[10px] bg-black/40 text-cyan-500/50 hover:border-cyan-500/50 cursor-pointer`;
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
        ${!isOwned ? `<span class="text-[8px] font-mono text-purple-400">${model.id === 'golden' ? 'SOVG\'A' : `$${model.price}`}</span>` : ''}
      </div>
    `;

    if (isSelected) {
      btn.className = `p-3 rounded-2xl border-2 transition-all bg-purple-500 border-purple-400 text-black scale-110 shadow-[0_0_20px_rgba(168,85,247,0.5)] cursor-pointer`;
    } else if (isOwned) {
      btn.className = `p-3 rounded-2xl border border-purple-500/30 transition-all bg-black/40 text-purple-500/50 hover:border-purple-500/60 cursor-pointer`;
    } else {
      btn.className = `p-3 rounded-2xl border border-purple-500/10 transition-all bg-black/40 text-purple-500/20 opacity-60 cursor-pointer grayscale`;
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
  sessionTime = 0;

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
      fireRateMult: 1,
      weapon: WeaponType.KALASH, inventory: [WeaponType.KALASH],
      lastShot: 0, color: isPlayer ? '#ef4444' : '#991b1b',
      speed: model.speed, model: model.id,
      treadOffset: 0, tripleShotTimer: 0
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
      fireRateMult: 1,
      weapon: WeaponType.KALASH, inventory: [WeaponType.KALASH],
      lastShot: 0, color: isPlayer ? '#3b82f6' : '#1e3a8a',
      speed: model.speed, model: model.id,
      treadOffset: 0, tripleShotTimer: 0
    });
  }

  // Initial Obstacles: 3 on left, 3 on right, 1 on top
  // Large rocks for hiding
  for (let i = 0; i < 3; i++) {
    // Left side
    obstacles.push({ id: Date.now() + i, x: 180, y: (CANVAS_HEIGHT / 4) * (i + 1), type: 'rock', value: 50 });
    // Right side
    obstacles.push({ id: Date.now() + i + 10, x: CANVAS_WIDTH - 180, y: (CANVAS_HEIGHT / 4) * (i + 1), type: 'rock', value: 50 });
  }
  // Top center
  obstacles.push({ id: Date.now() + 20, x: CANVAS_WIDTH / 2, y: 80, type: 'rock', value: 50 });

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

  // Money generation: $1 per second
  if (Date.now() - lastMoneyTime > 1000) {
    userTotalMoney += 1;
    lastMoneyTime = Date.now();
    saveUserState();
    updateHUDs();
  }

  tanks.forEach(tank => {
    if (tank.health <= 0) return;
    if (tank.tripleShotTimer > 0) tank.tripleShotTimer--;
  });

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
        let moving = false;
        if (keys['KeyA'] || mobileKeys['left']) { tank.angle -= rotSpeed; moving = true; }
        if (keys['KeyD'] || mobileKeys['right']) { tank.angle += rotSpeed; moving = true; }
        if (keys['KeyW'] || mobileKeys['up']) { 
          tank.x += Math.cos(tank.angle) * speed; 
          tank.y += Math.sin(tank.angle) * speed; 
          moving = true; 
        }
        if (keys['KeyS'] || mobileKeys['down']) { 
          tank.x -= Math.cos(tank.angle) * speed; 
          tank.y -= Math.sin(tank.angle) * speed; 
          moving = true; 
        }
        if (moving) tank.treadOffset = (tank.treadOffset + 2) % 10;

        if ((keys['Space'] || mobileKeys['fire']) && Date.now() - tank.lastShot > (WEAPONS[tank.weapon].cooldown * 16) / tank.fireRateMult) {
          fireBullet(tank);
          tank.lastShot = Date.now();
        }
      } else if (tank.id === 'blue-0') {
        let moving = false;
        if (keys['ArrowLeft']) { tank.angle -= rotSpeed; moving = true; }
        if (keys['ArrowRight']) { tank.angle += rotSpeed; moving = true; }
        if (keys['ArrowUp']) { 
          tank.x += Math.cos(tank.angle) * speed; 
          tank.y += Math.sin(tank.angle) * speed; 
          moving = true; 
        }
        if (keys['ArrowDown']) { 
          tank.x -= Math.cos(tank.angle) * speed; 
          tank.y -= Math.sin(tank.angle) * speed; 
          moving = true; 
        }
        if (moving) tank.treadOffset = (tank.treadOffset + 2) % 10;

        if (keys['Enter'] && Date.now() - tank.lastShot > (WEAPONS[tank.weapon].cooldown * 16) / tank.fireRateMult) {
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
          tank.treadOffset = (tank.treadOffset + 1) % 10;
        }
        if (Math.abs(angleDiff) < 0.3 && Date.now() - tank.lastShot > (WEAPONS[tank.weapon].cooldown * 24) / tank.fireRateMult) {
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
  const angles = tank.tripleShotTimer > 0 ? [-0.2, 0, 0.2] : [0];
  
  angles.forEach(offset => {
    bullets.push({
      x: tank.x + Math.cos(tank.angle + offset) * (TANK_SIZE / 2 + 15),
      y: tank.y + Math.sin(tank.angle + offset) * (TANK_SIZE / 2 + 15),
      vx: Math.cos(tank.angle + offset) * weapon.speed,
      vy: Math.sin(tank.angle + offset) * weapon.speed,
      ownerId: tank.id,
      ownerTeam: tank.team,
      damage: weapon.damage * tank.damageMult,
      life: weapon.type === WeaponType.KNIFE ? 10 : 200,
    });
  });
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw Background with Neon Grid
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
  }

  ctx.save();
  if (screenShake > 1) {
    const sx = (Math.random() - 0.5) * screenShake;
    const sy = (Math.random() - 0.5) * screenShake;
    ctx.translate(sx, sy);
  }

  // Apply global glow
  ctx.shadowBlur = 10;
  
  // Obstacles
  obstacles.forEach(obj => {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    if (obj.type === 'rock') {
      const size = 60; // Even larger rocks for hiding
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.beginPath(); ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2); ctx.fill(); 
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (obj.type === 'mine') {
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.beginPath(); ctx.arc(obj.x, obj.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (obj.type === 'health') {
      ctx.shadowColor = '#22c55e';
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.fillRect(obj.x - 12, obj.y - 12, 24, 24);
      ctx.strokeStyle = '#22c55e';
      ctx.strokeRect(obj.x - 12, obj.y - 12, 24, 24);
      ctx.fillStyle = '#fff'; ctx.fillRect(obj.x - 2, obj.y - 8, 4, 16); ctx.fillRect(obj.x - 8, obj.y - 2, 16, 4);
    } else if (obj.type === 'shield') {
      ctx.shadowColor = '#06b6d4';
      ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.beginPath(); ctx.arc(obj.x, obj.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.stroke();
    } else if (obj.type === 'gold') {
      ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.beginPath(); ctx.arc(obj.x, obj.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('$', obj.x, obj.y + 5);
    }
  });

  // Tanks
  tanks.forEach(tank => {
    if (tank.health <= 0) return;
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);
    
    ctx.shadowColor = tank.color;
    ctx.shadowBlur = 15;
    
    // Treads (Neon)
    ctx.strokeStyle = tank.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-TANK_SIZE / 2, -TANK_SIZE / 2, TANK_SIZE, 8);
    ctx.strokeRect(-TANK_SIZE / 2, TANK_SIZE / 2 - 8, TANK_SIZE, 8);
    
    // Body (Neon)
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-TANK_SIZE / 2 + 4, -TANK_SIZE / 2 + 4, TANK_SIZE - 8, TANK_SIZE - 8);
    ctx.strokeStyle = tank.color;
    ctx.strokeRect(-TANK_SIZE / 2 + 4, -TANK_SIZE / 2 + 4, TANK_SIZE - 8, TANK_SIZE - 8);
    
    // Turret (Neon)
    ctx.strokeStyle = tank.color;
    ctx.strokeRect(0, -3, TANK_SIZE / 2 + 12, 6); // Barrel
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fill(); ctx.stroke();
    
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
    ctx.shadowBlur = 15;
    ctx.shadowColor = b.ownerTeam === 'red' ? '#ff0000' : '#00f2ff';
    ctx.fillStyle = b.ownerTeam === 'red' ? '#ff0000' : '#00f2ff';
    ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_SIZE + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, BULLET_SIZE, 0, Math.PI * 2); ctx.fill();
    
    // Trail effect
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 2, b.y - b.vy * 2);
    ctx.lineWidth = BULLET_SIZE * 2;
    ctx.strokeStyle = b.ownerTeam === 'red' ? '#ff0000' : '#00f2ff';
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  });

  // Lucky Boxes
  luckyBoxes.forEach(box => {
    ctx.save();
    ctx.translate(box.x, box.y);
    ctx.rotate(Math.sin(Date.now() / 200) * 0.2);
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f59e0b';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(-15, -15, 30, 30);
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
    container.className = `bg-black/80 backdrop-blur-xl p-4 rounded-[2rem] border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)] ${tank.team === 'blue' ? 'text-right' : ''}`;
    
    const info = document.createElement('div');
    info.className = `flex items-center gap-3 mb-4 ${tank.team === 'blue' ? 'justify-end' : ''}`;
    info.innerHTML = tank.team === 'red' ? 
      `<div class="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(239,68,68,0.5)]">👤</div>
       <div class="flex flex-col">
         <span class="text-[10px] uppercase text-red-500/70 font-black">Kiber Balans</span>
         <span class="font-mono font-black text-white text-2xl leading-none">$${tank.money}</span>
       </div>` : 
      `<div class="flex flex-col">
         <span class="text-[10px] uppercase text-blue-500/70 font-black">Kiber Balans</span>
         <span class="font-mono font-black text-white text-2xl leading-none">$${tank.money}</span>
       </div>
       <div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(59,130,246,0.5)]">👤</div>`;
    
    const weapons = document.createElement('div');
    weapons.className = `flex gap-2 ${tank.team === 'blue' ? 'justify-end' : ''}`;
    
    const shopBtn = document.createElement('button');
    shopBtn.innerHTML = '<span class="text-xs">🛒 DO\'KON</span>';
    shopBtn.className = `px-6 h-12 flex items-center justify-center gap-2 bg-cyan-500 text-black rounded-2xl hover:scale-110 transition-transform font-black shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer`;
    shopBtn.onclick = () => openShop(tank.team);
    
    if (tank.team === 'red') weapons.appendChild(shopBtn);
    
    tank.inventory.forEach(wType => {
      const btn = document.createElement('button');
      btn.textContent = WEAPONS[wType].icon;
      btn.className = `w-12 h-12 flex items-center justify-center rounded-2xl transition-all cursor-pointer ${tank.weapon === wType ? 'bg-white text-black scale-110 shadow-xl' : 'bg-black/40 border border-white/10 text-white hover:bg-white/10'}`;
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
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-2';
    
    section.items.forEach((item: any) => {
      const btn = document.createElement('button');
      const canAfford = tank.money >= item.price;
      const isOwnedWeapon = section.type === 'weapon' && tank.inventory.includes(item.type);

      btn.className = `flex flex-col p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${
        canAfford ? 'bg-black border-cyan-500/20 hover:border-cyan-500 hover:scale-[1.02] cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-black/40 border-cyan-500/5 opacity-50 cursor-not-allowed'
      }`;
      
      btn.innerHTML = `
        <div class="flex items-center gap-3 mb-2">
          <span class="text-2xl group-hover:scale-125 transition-transform drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">${item.icon}</span>
          <div>
            <p class="font-black uppercase italic text-[10px] leading-tight text-white">${item.name}</p>
            <p class="text-[8px] text-cyan-500/50">${section.type === 'weapon' ? `Zarar: ${item.damage}` : item.desc}</p>
          </div>
        </div>
        <div class="flex justify-between items-center mt-auto">
          <span class="font-mono font-black text-cyan-400 text-xs">$${item.price}</span>
          ${isOwnedWeapon ? '<span class="text-[8px] font-black text-cyan-500/50 uppercase tracking-widest">BOR</span>' : ''}
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
            if (item.type === UpgradeType.ARMOR) {
              tank.maxHealth += 20;
              tank.health += 20;
            }
            if (item.type === UpgradeType.FIRE_RATE) tank.fireRateMult *= 1.15;
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
