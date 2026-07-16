const LEVEL_COST_GROWTH = 1.1;
const BASE_CLICK_POWER = 1;
const TICK_MS = 1000;

let gold = 0;
let dragons = [];
let owned = {};
let passiveIntervals = {};

async function init() {
    const res = await fetch('data/dragons.json');
    const data = await res.json();
    dragons = data.dragons;

    document.getElementById('clickBtn').addEventListener('click', onClick);

    renderDragonList();
    updateStatsDisplay();
}

function startPassiveTimer(dragon) {
    if (passiveIntervals[dragon.id]) return;

    const randomOffset = Math.floor(Math.random() * TICK_MS);

    const timeoutHandle = setTimeout(() => {
        tickDragon(dragon.id);
        passiveIntervals[dragon.id] = setInterval(() => tickDragon(dragon.id), TICK_MS);
    }, randomOffset);

    passiveIntervals[dragon.id] = timeoutHandle;
}

function tickDragon(dragonId) {
    const dragon = dragons.find(d => d.id === dragonId);
    if (!dragon) return;
    const level = getDragonLevel(dragonId);
    gold += level * dragon.passivePowerPerLevel;
    updateStatsDisplay();
}

// ---------- CORE CALCULATIONS ----------
function getDragonLevel(id) {
    return owned[id] || 0;
}

function getNextLevelCost(dragon) {
    const currentLevel = getDragonLevel(dragon.id);
    // level 0 -> 1 costs baseCost. Level n -> n+1 costs baseCost * growth^n
    return Math.floor(dragon.baseCost * Math.pow(LEVEL_COST_GROWTH, currentLevel));
}

function getTotalClickPower() {
    let total = BASE_CLICK_POWER;
    for (const dragon of dragons) {
        const level = getDragonLevel(dragon.id);
        total += level * dragon.clickPowerPerLevel;
    }
    return total;
}

function getTotalPassivePower() {
    let total = 0;
    for (const dragon of dragons) {
        const level = getDragonLevel(dragon.id);
        total += level * dragon.passivePowerPerLevel;
    }
    return total;
}

// ---------- ACTIONS ----------
function onClick() {
    gold += getTotalClickPower();
    updateStatsDisplay();
}

function buyOrLevelDragon(dragonId) {
    const dragon = dragons.find(d => d.id === dragonId);
    const cost = getNextLevelCost(dragon);

    if (gold < cost) return;

    gold -= cost;
    owned[dragonId] = getDragonLevel(dragonId) + 1;

    if (getDragonLevel(dragonId) === 1) {
        startPassiveTimer(dragon);
    }

    updateStatsDisplay();
    renderDragonList();
}

// ---------- RENDERING (bare minimum, no styling attempt) ----------
function updateStatsDisplay() {
    document.getElementById('gold').textContent = Math.floor(gold).toLocaleString();
    document.getElementById('perClick').textContent = getTotalClickPower().toLocaleString();
    document.getElementById('perSec').textContent = getTotalPassivePower().toLocaleString();
}

function renderDragonList() {
    const container = document.getElementById('dragonList');
    container.innerHTML = '';

    for (const dragon of dragons) {
        const level = getDragonLevel(dragon.id);
        const cost = getNextLevelCost(dragon);
        const canAfford = gold >= cost;

        const row = document.createElement('div');
        row.className = 'dragon-row';
        row.innerHTML = `
      <strong>${dragon.name}</strong>
      [${dragon.rarity}]
      — Level: ${level}
      — Click/lvl: ${dragon.clickPowerPerLevel}
      — Passive/lvl: ${dragon.passivePowerPerLevel}
      — Next cost: ${cost.toLocaleString()}
      <button data-id="${dragon.id}" ${canAfford ? '' : 'disabled'}>
        ${level === 0 ? 'Buy' : 'Level Up'}
      </button>
    `;
        container.appendChild(row);

        row.querySelector('button').addEventListener('click', () => buyOrLevelDragon(dragon.id));
    }
}

// ---------- INDIVIDUAL UPDATES ----------
const originalUpdateStats = updateStatsDisplay;
updateStatsDisplay = function () {
    originalUpdateStats();
    refreshButtonStates();
};

function refreshButtonStates() {
    const container = document.getElementById('dragonList');
    if (!container) return;
    const buttons = container.querySelectorAll('button[data-id]');
    buttons.forEach(btn => {
        const dragon = dragons.find(d => d.id === btn.dataset.id);
        const cost = getNextLevelCost(dragon);
        btn.disabled = gold < cost;
    });
}

init();