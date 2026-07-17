
'use strict';

const STORAGE_KEY = 'loadRushUltimateV1';
const LEGACY_KEYS = [
  'loadQuestStateV1',
  'pulseProState',
  'pulseCount'
];

const DEFAULTS = {
  log: [],
  dailyGoal: 150,
  hourlyGoal: 20,
  minutesPerUpdate: 5,
  raceWins: 0,
  completedHours: [],
  selectedRig: 'starter-semi',
  theme: 'light',
  sound: true,
  soundStyle: 'engine',
  particles: true,
  fateEnabled: true,
  fateFrequency: 10,
  lastFateMilestone: 0,
  lastFateMilestoneDate: '',
  discoveredEvents: [],
  reminders: [],
  lastRecapDate: ''
};

const RIGS = [
  { id: 'starter-semi', icon: '🚛', name: 'Starter Semi', type: 'SEMI', rule: 'Unlocked from the start', unlocked: () => true },
  { id: 'red-racer', icon: '🏎️', name: 'Redline Racer', type: 'RACE CAR', rule: 'Reach Level 3', unlocked: () => lifetimeLevel() >= 3 },
  { id: 'box-truck', icon: '🚚', name: 'Box Truck Blitz', type: 'TRUCK', rule: 'Win 5 hourly races', unlocked: () => state.raceWins >= 5 },
  { id: 'yellow-jacket', icon: '🚕', name: 'Yellow Jacket', type: 'STREET', rule: 'Reach Level 6', unlocked: () => lifetimeLevel() >= 6 },
  { id: 'interceptor', icon: '🚓', name: 'Interceptor', type: 'PURSUIT', rule: 'Win 12 hourly races', unlocked: () => state.raceWins >= 12 },
  { id: 'code-red', icon: '🚒', name: 'Code Red', type: 'HEAVY', rule: 'Reach Level 10', unlocked: () => lifetimeLevel() >= 10 },
  { id: 'people-mover', icon: '🚌', name: 'People Mover', type: 'ODDBALL', rule: 'Track 500 lifetime net loads', unlocked: () => lifetimeXP() >= 500 },
  { id: 'formula-freight', icon: '🏁', name: 'Formula Freight', type: 'RACE', rule: 'Win 25 hourly races', unlocked: () => state.raceWins >= 25 },
  { id: 'mud-titan', icon: '🛻', name: 'Mud Titan', type: 'OFF-ROAD', rule: 'Reach Level 15', unlocked: () => lifetimeLevel() >= 15 },
  { id: 'rocket-hauler', icon: '🚀', name: 'Rocket Hauler', type: 'LEGENDARY', rule: 'Track 1,000 lifetime net loads', unlocked: () => lifetimeXP() >= 1000 },
  { id: 'alien-dispatch', icon: '🛸', name: 'Alien Dispatch', type: 'MYTHIC', rule: 'Reach Level 25', unlocked: () => lifetimeLevel() >= 25 },
  { id: 'king-freight', icon: '👑', name: 'King of Freight', type: 'MYTHIC SEMI', rule: 'Win 50 hourly races', unlocked: () => state.raceWins >= 50 }
];

const FATE_EVENTS = [
  {
    id: 'nitro',
    name: 'Nitro Boost',
    icon: '🔥',
    rarity: 'COMMON',
    weight: 24,
    description: 'The rig hits the boost and briefly exits the known universe.',
    sceneClass: 'fate-nitro'
  },
  {
    id: 'rain',
    name: 'Thunder Run',
    icon: '🌧️',
    rarity: 'COMMON',
    weight: 18,
    description: 'A dramatic storm rolls in. Dispatch continues anyway.',
    worldClass: 'fate-rain'
  },
  {
    id: 'cones',
    name: 'Cone Slalom',
    icon: '🚧',
    rarity: 'COMMON',
    weight: 17,
    description: 'Construction cones appear. Your driver becomes weirdly athletic.',
    objects: ['🚧','🚧','🚧','🚧']
  },
  {
    id: 'ducks',
    name: 'Duck Crossing',
    icon: '🦆',
    rarity: 'COMMON',
    weight: 15,
    description: 'A family of ducks claims right of way. The rig respectfully waits.',
    objects: ['🦆','🦆','🦆','🦆','🦆']
  },
  {
    id: 'speedtrap',
    name: 'Speed Trap',
    icon: '🚓',
    rarity: 'RARE',
    weight: 9,
    description: 'The rig gets pulled over, then immediately waved through for excellent paperwork.',
    objects: ['🚓','🚨']
  },
  {
    id: 'ufo',
    name: 'UFO Abduction',
    icon: '🛸',
    rarity: 'RARE',
    weight: 7,
    description: 'Aliens borrow the rig for research and return it with a full tank.',
    sceneClass: 'fate-abduct',
    objects: ['🛸']
  },
  {
    id: 'tornado',
    name: 'Freight Tornado',
    icon: '🌪️',
    rarity: 'RARE',
    weight: 5,
    description: 'The truck spins twice, lands perfectly, and refuses to elaborate.',
    sceneClass: 'fate-spin',
    objects: ['🌪️']
  },
  {
    id: 'dino',
    name: 'Dino Chase',
    icon: '🦖',
    rarity: 'EPIC',
    weight: 2.5,
    description: 'A T-Rex joins the route. The rig finds another gear.',
    sceneClass: 'fate-nitro',
    objects: ['🦖']
  },
  {
    id: 'rainbow',
    name: 'Rainbow Road',
    icon: '🌈',
    rarity: 'EPIC',
    weight: 1.8,
    description: 'The highway enters arcade mode for five glorious seconds.',
    worldClass: 'fate-rainbow',
    objects: ['⭐','🌈','⭐']
  },
  {
    id: 'ceo',
    name: 'CEO Visit',
    icon: '☎️',
    rarity: 'LEGENDARY',
    weight: .7,
    description: 'A mysterious executive calls only to say: “Outstanding work.”',
    objects: ['☎️','👔','✨']
  }
];


const $ = id => document.getElementById(id);

function readStoredState() {
  const direct = localStorage.getItem(STORAGE_KEY);
  if (direct) {
    try {
      return JSON.parse(direct);
    } catch (error) {
      console.warn('Could not read current state:', error);
    }
  }

  for (const key of LEGACY_KEYS) {
    const legacy = localStorage.getItem(key);
    if (!legacy) continue;

    try {
      if (key === 'pulseCount') {
        const count = Number(legacy) || 0;
        return {
          ...DEFAULTS,
          log: count > 0
            ? Array.from({ length: count }, (_, index) => ({
                delta: 1,
                time: Date.now() - index * 1000
              }))
            : []
        };
      }

      const parsed = JSON.parse(legacy);
      return migrateLegacyState(parsed);
    } catch (error) {
      console.warn(`Could not migrate ${key}:`, error);
    }
  }

  return { ...DEFAULTS };
}

function migrateLegacyState(legacy) {
  const log = Array.isArray(legacy.log)
    ? legacy.log
        .filter(entry => entry && Number.isFinite(Number(entry.delta)) && Number.isFinite(Number(entry.time)))
        .map(entry => ({
          delta: Number(entry.delta),
          time: Number(entry.time)
        }))
    : [];

  return {
    ...DEFAULTS,
    ...legacy,
    log,
    selectedRig:
      legacy.selectedRig ||
      legacy.selectedVehicle ||
      legacy.selectedHorse ||
      DEFAULTS.selectedRig,
    dailyGoal: Number(legacy.dailyGoal) || DEFAULTS.dailyGoal,
    hourlyGoal: Number(legacy.hourlyGoal) || DEFAULTS.hourlyGoal,
    minutesPerUpdate: Number(legacy.minutesPerUpdate) || DEFAULTS.minutesPerUpdate,
    raceWins: Number(legacy.raceWins) || 0,
    completedHours: Array.isArray(legacy.completedHours)
      ? legacy.completedHours
      : Array.isArray(legacy.completedRaceHours)
        ? legacy.completedRaceHours
        : []
  };
}

const state = {
  ...DEFAULTS,
  ...readStoredState()
};

let audioContext = null;
let previousHourKey = currentHourKey();
let previousDayKey = todayKey();
let toastTimer = null;
let activeChartPeriod = 'daily';
let currentSummaryDate = todayKey();
let pendingFateMilestone = null;
let activeFateTimeout = null;
let activeReminderId = null;
let alarmAudioContext = null;
let alarmOscillators = [];
let alarmPulseTimer = null;

function saveState() {
  const clean = {
    ...state,
    log: state.log.slice(0, 3000),
    completedHours: state.completedHours.slice(-500)
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
}

function todayKey(date = new Date()) {
  return date.toDateString();
}

function currentHourKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
}

function todaysEntries() {
  const key = todayKey();
  return state.log.filter(entry => todayKey(new Date(entry.time)) === key);
}

function netTotal(entries) {
  return entries.reduce((sum, entry) => sum + entry.delta, 0);
}

function todayNetLoads() {
  return Math.max(0, netTotal(todaysEntries()));
}

function hourNetLoads(date = new Date()) {
  const key = currentHourKey(date);
  const entries = state.log.filter(entry => currentHourKey(new Date(entry.time)) === key);
  return Math.max(0, netTotal(entries));
}

function lifetimeXP() {
  return Math.max(0, netTotal(state.log));
}

function lifetimeLevel() {
  return Math.floor(lifetimeXP() / 100) + 1;
}

function currentLevelProgress() {
  return lifetimeXP() % 100;
}

function hourlyTotalsToday() {
  const totals = {};

  for (const entry of todaysEntries()) {
    const key = currentHourKey(new Date(entry.time));
    totals[key] = (totals[key] || 0) + entry.delta;
  }

  return totals;
}

function bestHour() {
  const values = Object.values(hourlyTotalsToday()).map(value => Math.max(0, value));
  return Math.max(0, ...values);
}

function hourlyStreak() {
  let streak = 0;
  const now = new Date();

  for (let index = 0; index < 24; index += 1) {
    const date = new Date(now);
    date.setHours(now.getHours() - index, 0, 0, 0);

    const count = hourNetLoads(date);

    if (count >= state.hourlyGoal) {
      streak += 1;
    } else if (index === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

function selectedRig() {
  const candidate = RIGS.find(rig => rig.id === state.selectedRig);

  if (candidate && candidate.unlocked()) {
    return candidate;
  }

  state.selectedRig = DEFAULTS.selectedRig;
  return RIGS[0];
}

function secondsUntilNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return Math.max(0, Math.floor((next - now) / 1000));
}

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(timestamp));
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return hours > 0
    ? `${hours}h ${remainder}m`
    : `${remainder} min`;
}

function renderAll() {
  if (state.lastFateMilestoneDate && state.lastFateMilestoneDate !== todayKey()) {
    state.lastFateMilestone = 0;
    state.lastFateMilestoneDate = todayKey();
    saveState();
  }
  const today = todayNetLoads();
  const hour = hourNetLoads();
  const lifetime = lifetimeXP();
  const level = lifetimeLevel();
  const levelProgress = currentLevelProgress();
  const hourlyProgress = Math.min(100, (hour / Math.max(1, state.hourlyGoal)) * 100);
  const dailyProgress = Math.min(100, Math.round((today / Math.max(1, state.dailyGoal)) * 100));
  const rig = selectedRig();

  $('mainCount').textContent = today;
  $('workMetric').textContent = formatDuration(today * state.minutesPerUpdate);
  $('bestHourMetric').textContent = `${bestHour()} loads`;
  $('streakMetric').textContent = hourlyStreak();

  $('hourlyGoalLabel').textContent = state.hourlyGoal;
  $('raceProgressText').textContent = `${Math.min(state.hourlyGoal, hour)} / ${state.hourlyGoal}`;
  $('raceFill').style.width = `${hourlyProgress}%`;
  $('vehicle').style.right = `${hourlyProgress}%`;
  $('vehicle').textContent = rig.icon;
  $('vehicle').classList.toggle('finished', hour >= state.hourlyGoal);

  if (hour >= state.hourlyGoal) {
    $('raceMessage').textContent = 'Checkered flag claimed. Hourly quest complete.';
  } else if (hour >= Math.ceil(state.hourlyGoal * .75)) {
    $('raceMessage').textContent = `${state.hourlyGoal - hour} loads left — final lap.`;
  } else if (hour >= Math.ceil(state.hourlyGoal * .4)) {
    $('raceMessage').textContent = `${state.hourlyGoal - hour} loads left — gaining fast.`;
  } else if (hour > 0) {
    $('raceMessage').textContent = `${state.hourlyGoal - hour} loads left — engines are warming up.`;
  } else {
    $('raceMessage').textContent = 'Green flag. Let it rip.';
  }

  $('xpValue').textContent = lifetime;
  $('xpBar').style.width = `${levelProgress}%`;
  $('levelLabel').textContent = `Level ${level} · ${levelProgress} / 100 XP`;

  $('goalRing').style.setProperty('--goal-pct', dailyProgress);
  $('goalPercent').textContent = `${dailyProgress}%`;
  $('goalText').textContent = `${today} / ${state.dailyGoal}`;

  $('raceWinsValue').textContent = state.raceWins;
  $('activeRigLabel').textContent = `Driving: ${rig.name}`;

  $('dailyGoalInput').value = state.dailyGoal;
  $('hourlyGoalInput').value = state.hourlyGoal;
  $('minutesInput').value = state.minutesPerUpdate;
  $('soundStyleSelect').value = state.soundStyle || 'engine';
  $('fateFrequencySelect').value = String(state.fateFrequency || 10);

  applyTheme();
  renderLog();
  renderGarage();
}

function renderLog() {
  const list = $('logList');

  if (state.log.length === 0) {
    list.innerHTML = '<div class="empty-state">No load updates yet. The road is open.</div>';
    return;
  }

  let running = 0;
  const chronological = [...state.log].reverse();
  const runningByTime = new Map();

  for (const entry of chronological) {
    running = Math.max(0, running + entry.delta);
    runningByTime.set(entry.time, running);
  }

  list.innerHTML = state.log
    .slice(0, 120)
    .map(entry => {
      const value = runningByTime.get(entry.time) ?? 0;
      const positive = entry.delta > 0;

      return `
        <div class="log-entry">
          <div class="delta ${positive ? 'plus' : 'minus'}">${positive ? '+1' : '−1'}</div>
          <div>Net board: ${value}</div>
          <time class="log-time">${formatTime(entry.time)}</time>
        </div>
      `;
    })
    .join('');
}

function renderGarage() {
  const unlocked = RIGS.filter(rig => rig.unlocked());
  const active = selectedRig();

  $('garageLevel').textContent = lifetimeLevel();
  $('garageXp').textContent = lifetimeXP();
  $('garageUnlocked').textContent = `${unlocked.length} / ${RIGS.length}`;

  $('garageGrid').innerHTML = RIGS.map(rig => {
    const isUnlocked = rig.unlocked();
    const isSelected = active.id === rig.id;

    return `
      <button
        class="rig-card ${isUnlocked ? 'unlocked' : ''} ${isSelected ? 'selected' : ''}"
        type="button"
        data-rig-id="${rig.id}"
        ${isUnlocked ? '' : 'disabled'}
      >
        <span class="rig-icon">${rig.icon}</span>
        <span class="rig-name">${rig.name}</span>
        <span class="rig-type">${rig.type}</span>
        <span class="rig-rule">${rig.rule}</span>
      </button>
    `;
  }).join('');


  const discovered = new Set(state.discoveredEvents || []);
  $('eventCollectionCount').textContent = `${discovered.size} / ${FATE_EVENTS.length}`;

  $('eventCollectionGrid').innerHTML = FATE_EVENTS.map(event => {
    const found = discovered.has(event.id);

    return `
      <div class="event-card ${found ? 'discovered' : ''}">
        <div class="event-icon">${found ? event.icon : '❔'}</div>
        <div>
          <strong>${found ? event.name : 'Undiscovered'}</strong>
          <span>${found ? event.rarity : 'Keep rolling Freight Fate'}</span>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-rig-id]').forEach(button => {
    button.addEventListener('click', () => {
      const rig = RIGS.find(item => item.id === button.dataset.rigId);

      if (!rig || !rig.unlocked()) {
        return;
      }

      state.selectedRig = rig.id;
      saveState();
      renderAll();
      showToast(`${rig.name} selected`);
    });
  });
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;

  document.querySelector('meta[name="theme-color"]').setAttribute(
    'content',
    state.theme === 'dark' ? '#111326' : '#efe9ff'
  );

  $('themeBtn').textContent = state.theme === 'dark' ? '☀' : '☾';

  updateSwitch('soundToggle', state.sound);
  updateSwitch('particlesToggle', state.particles);
  updateSwitch('fateToggle', state.fateEnabled);
}

function updateSwitch(id, enabled) {
  const element = $(id);
  element.classList.toggle('on', enabled);
  element.setAttribute('aria-checked', String(enabled));
}

function animateCount(delta) {
  const count = $('mainCount');

  count.classList.remove('bump', 'drop');
  void count.offsetWidth;
  count.classList.add(delta > 0 ? 'bump' : 'drop');

  if (delta > 0) {
    const plus = $('plusBtn');
    plus.classList.remove('flash');
    void plus.offsetWidth;
    plus.classList.add('flash');
  }
}

function createOscillator(frequency, type, start, duration, volume = .06) {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);

  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + .02);

  return oscillator;
}

function playTone(kind = 'plus', special = false, forcePreview = false) {
  if (!state.sound && !forcePreview) {
    return;
  }

  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  const style = state.soundStyle || 'engine';

  if (special) {
    [0, .07, .15].forEach((offset, index) => {
      createOscillator(660 + index * 150, 'sine', now + offset, .17, .085);
    });
    return;
  }

  if (style === 'engine') {
    const oscillator = createOscillator(kind === 'plus' ? 135 : 105, 'sawtooth', now, .18, .045);
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === 'plus' ? 280 : 72,
      now + .16
    );
    return;
  }

  if (style === 'arcade') {
    const first = kind === 'plus' ? 520 : 260;
    const second = kind === 'plus' ? 780 : 180;
    createOscillator(first, 'square', now, .08, .04);
    createOscillator(second, 'square', now + .07, .09, .035);
    return;
  }

  if (style === 'chime') {
    const base = kind === 'plus' ? 640 : 360;
    createOscillator(base, 'sine', now, .20, .06);
    createOscillator(base * 1.5, 'sine', now + .035, .22, .035);
    return;
  }

  createOscillator(kind === 'plus' ? 720 : 330, 'triangle', now, .07, .05);
}

function particleBurst(source, amount = 14, scale = 1) {
  if (!state.particles) {
    return;
  }

  const rect = source.getBoundingClientRect();

  for (let index = 0; index < amount; index += 1) {
    const particle = document.createElement('i');

    particle.className = 'particle';
    particle.style.left = `${rect.left + rect.width / 2}px`;
    particle.style.top = `${rect.top + rect.height / 2}px`;
    particle.style.width = `${(5 + Math.random() * 6) * scale}px`;
    particle.style.height = `${(6 + Math.random() * 10) * scale}px`;
    particle.style.setProperty('--x', `${(Math.random() - .5) * 230 * scale}px`);
    particle.style.setProperty('--y', `${(-35 - Math.random() * 160) * scale}px`);
    particle.style.setProperty('--r', `${Math.random() * 900 - 450}deg`);

    if (index % 3 === 1) {
      particle.style.background = 'var(--accent-2)';
    }

    if (index % 3 === 2) {
      particle.style.background = '#ffc450';
    }

    $('fxLayer').appendChild(particle);
    setTimeout(() => particle.remove(), 1350);
  }
}

function flashMegaMessage(text) {
  const message = $('megaMessage');

  message.textContent = text;
  message.classList.remove('show');
  void message.offsetWidth;
  message.classList.add('show');
}

function celebrateRace() {
  const trophy = $('trophy');

  trophy.classList.remove('show');
  void trophy.offsetWidth;
  trophy.classList.add('show');

  flashMegaMessage('CHECKERED FLAG!');
  particleBurst($('vehicle'), 110, 2.6);

  [0, 90, 180, 280].forEach(delay => {
    setTimeout(() => playTone('plus', true), delay);
  });
}

function maybeAwardRace() {
  const hourKey = currentHourKey();
  const hour = hourNetLoads();

  if (hour < state.hourlyGoal || state.completedHours.includes(hourKey)) {
    return;
  }

  state.completedHours.push(hourKey);
  state.raceWins += 1;
  saveState();

  celebrateRace();
  showToast(`Hourly race won · ${state.raceWins} total`);
}



function defaultReminderDate() {
  return todayKey();
}

function defaultReminderTime() {
  const date = new Date(Date.now() + 5 * 60 * 1000);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function reminderTimestamp(reminder) {
  return new Date(`${reminder.date}T${reminder.time}:00`).getTime();
}

function reminderDateLabel(reminder) {
  const date = new Date(`${reminder.date}T${reminder.time}:00`);
  const today = todayKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  let prefix = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric'
  });

  if (reminder.date === today) prefix = 'Today';
  if (reminder.date === tomorrowKey) prefix = 'Tomorrow';

  return `${prefix} at ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  })}`;
}

function pendingReminders() {
  return (state.reminders || [])
    .filter(reminder => !reminder.dismissed)
    .sort((a, b) => reminderTimestamp(a) - reminderTimestamp(b));
}


function showReminderTab(tabName) {
  const showingList = tabName === 'list';

  $('reminderListPanel').hidden = !showingList;
  $('reminderFormPanel').hidden = showingList;

  $('viewRemindersTab').classList.toggle('active', showingList);
  $('newReminderTab').classList.toggle('active', !showingList);

  $('viewRemindersTab').setAttribute('aria-selected', String(showingList));
  $('newReminderTab').setAttribute('aria-selected', String(!showingList));

  if (!showingList) {
    setTimeout(() => $('reminderTextInput').focus(), 80);
  }
}

function renderReminders() {
  const reminders = pendingReminders();
  const now = Date.now();

  $('reminderCountLabel').textContent = `${reminders.length} reminder${reminders.length === 1 ? '' : 's'}`;
  $('reminderBadge').textContent = String(reminders.length);
  $('reminderBadge').hidden = reminders.length === 0;

  if (!reminders.length) {
    $('reminderList').innerHTML = `
      <div class="reminder-empty">
        Nothing scheduled. Add something before your brain decides it was never important.
      </div>
    `;
    return;
  }

  $('reminderList').innerHTML = reminders.map(reminder => {
    const overdue = reminderTimestamp(reminder) <= now;

    return `
      <div class="reminder-item ${overdue ? 'overdue' : ''}">
        <div class="reminder-clock">${overdue ? '🚨' : '⏰'}</div>
        <div class="reminder-item-copy">
          <strong>${escapeHtml(reminder.text)}</strong>
          <span>${reminderDateLabel(reminder)}${overdue ? ' · DUE NOW' : ''}</span>
        </div>
        <button class="reminder-delete-button" data-reminder-delete="${reminder.id}" type="button">Delete</button>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-reminder-delete]').forEach(button => {
    button.addEventListener('click', () => {
      state.reminders = state.reminders.filter(reminder => reminder.id !== button.dataset.reminderDelete);
      saveState();
      renderReminders();
      showToast('Reminder deleted');
    });
  });
}

function addReminder() {
  const button = $('addReminderBtn');

  if (button.disabled) {
    return;
  }

  const text = $('reminderTextInput').value.trim();
  const date = $('reminderDateInput').value;
  const time = $('reminderTimeInput').value;

  if (!text) {
    showToast('Enter what you need to remember');
    $('reminderTextInput').focus();
    return;
  }

  if (!date || !time) {
    showToast('Choose a date and time');
    return;
  }

  const timestamp = new Date(`${date}T${time}:00`).getTime();

  if (!Number.isFinite(timestamp)) {
    showToast('That date or time is invalid');
    return;
  }

  button.disabled = true;
  button.textContent = 'Adding...';

  try {
    if (!Array.isArray(state.reminders)) {
      state.reminders = [];
    }

    const id = (
      globalThis.crypto &&
      typeof globalThis.crypto.randomUUID === 'function'
    )
      ? globalThis.crypto.randomUUID()
      : `reminder-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    state.reminders.push({
      id,
      text,
      date,
      time,
      createdAt: new Date().toISOString(),
      fired: false,
      dismissed: false
    });

    saveState();
    renderReminders();
    showReminderTab('list');

    // Reset for the next reminder while keeping the form ready.
    $('reminderTextInput').value = '';
    $('reminderDateInput').value = defaultReminderDate();
    $('reminderTimeInput').value = defaultReminderTime();
    $('reminderTextInput').focus();

    showToast('Reminder armed');
  } catch (error) {
    console.error('Could not add reminder:', error);
    showToast('Could not save that reminder');
  } finally {
    button.disabled = false;
    button.textContent = 'Add reminder';
  }
}

async function requestReminderNotifications() {
  if ('Notification' in window && Notification.permission === 'granted') {
    showToast('System notifications are already enabled');
    return;
  }

  if (!('Notification' in window)) {
    showToast('This browser does not support system notifications');
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      showToast('System notifications enabled');
      $('enableNotificationsBtn').textContent = 'Notifications enabled';
      $('enableNotificationsBtn').disabled = false;
    } else {
      showToast('Notifications were not enabled');
    }
  } catch {
    showToast('Could not enable notifications');
  }
}

function sendSystemReminder(reminder) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const notification = new Notification('🚨 LOAD RUSH REMINDER', {
      body: reminder.text,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: `load-rush-reminder-${reminder.id}`,
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // The in-app alarm still runs even if the browser blocks this.
  }
}

function startReminderSiren() {
  stopReminderSiren();

  try {
    alarmAudioContext = new (window.AudioContext || window.webkitAudioContext)();

    const gain = alarmAudioContext.createGain();
    gain.gain.value = .16;
    gain.connect(alarmAudioContext.destination);

    const createTone = (frequency, type) => {
      const oscillator = alarmAudioContext.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start();
      alarmOscillators.push(oscillator);
    };

    createTone(720, 'square');
    createTone(960, 'sawtooth');

    let high = false;
    alarmPulseTimer = setInterval(() => {
      if (!alarmAudioContext) return;

      high = !high;
      const time = alarmAudioContext.currentTime;
      alarmOscillators[0]?.frequency.setValueAtTime(high ? 880 : 620, time);
      alarmOscillators[1]?.frequency.setValueAtTime(high ? 1180 : 810, time);
    }, 360);
  } catch {
    // Visual alarm and vibration remain available.
  }
}

function stopReminderSiren() {
  clearInterval(alarmPulseTimer);
  alarmPulseTimer = null;

  alarmOscillators.forEach(oscillator => {
    try { oscillator.stop(); } catch {}
  });

  alarmOscillators = [];

  if (alarmAudioContext) {
    try { alarmAudioContext.close(); } catch {}
    alarmAudioContext = null;
  }
}

function triggerReminderAlarm(reminder) {
  if (activeReminderId) {
    return;
  }

  activeReminderId = reminder.id;
  reminder.fired = true;
  reminder.dismissed = false;
  saveState();
  renderReminders();

  $('alarmReminderText').textContent = reminder.text;
  $('alarmReminderTime').textContent = new Date(`${reminder.date}T${reminder.time}:00`)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  $('reminderAlarm').hidden = false;
  document.body.classList.add('alarm-active');

  startReminderSiren();
  sendSystemReminder(reminder);

  if ('vibrate' in navigator) {
    navigator.vibrate([500, 180, 500, 180, 900, 250, 900]);
  }

  document.title = `🚨 ${reminder.text}`;

  try {
    window.focus();
  } catch {}
}

function dismissReminderAlarm() {
  const reminder = state.reminders.find(item => item.id === activeReminderId);

  if (reminder) {
    reminder.dismissed = true;
  }

  saveState();
  activeReminderId = null;
  $('reminderAlarm').hidden = true;
  document.body.classList.remove('alarm-active');
  document.title = 'Let it Rip';
  stopReminderSiren();

  if ('vibrate' in navigator) {
    navigator.vibrate(0);
  }

  renderReminders();
  showToast('Reminder dismissed');
}

function checkReminders() {
  if (activeReminderId) {
    return;
  }

  const now = Date.now();
  const due = pendingReminders().find(reminder => {
    const timestamp = reminderTimestamp(reminder);

    // Re-fire an overdue reminder after a reload if it was never dismissed.
    return timestamp <= now && (!reminder.fired || !reminder.dismissed);
  });

  if (due) {
    triggerReminderAlarm(due);
  }
}

function weightedFateRoll() {
  const total = FATE_EVENTS.reduce((sum, event) => sum + event.weight, 0);
  let roll = Math.random() * total;

  for (const event of FATE_EVENTS) {
    roll -= event.weight;
    if (roll <= 0) {
      return event;
    }
  }

  return FATE_EVENTS[0];
}

function shouldPromptFate() {
  if (!state.fateEnabled) {
    return false;
  }

  const today = todayKey();
  const frequency = Math.max(1, Number(state.fateFrequency) || 10);
  const loads = todayNetLoads();

  // Reset the remembered milestone when a new day begins.
  if (state.lastFateMilestoneDate !== today) {
    state.lastFateMilestoneDate = today;
    state.lastFateMilestone = 0;
    saveState();
  }

  if (loads <= 0 || loads % frequency !== 0) {
    return false;
  }

  return loads > Number(state.lastFateMilestone || 0);
}

function promptFreightFate() {
  const loads = todayNetLoads();

  pendingFateMilestone = loads;
  state.lastFateMilestone = loads;
  state.lastFateMilestoneDate = todayKey();
  saveState();

  $('fatePromptTitle').textContent = `${loads} loads tracked!`;
  openDialog($('fatePromptDialog'));
  particleBurst($('mainCount'), 38, 1.3);
  flashMegaMessage(`${loads} LOADS!`);
}

function clearFateScene() {
  clearTimeout(activeFateTimeout);
  activeFateTimeout = null;

  const world = document.querySelector('.road-world');
  const vehicle = $('vehicle');

  world.classList.remove('fate-rain', 'fate-rainbow');
  vehicle.classList.remove('fate-nitro', 'fate-spin', 'fate-abduct', 'fate-bounce');
  $('fateScene').replaceChildren();
}

function placeFateObjects(event) {
  const layer = $('fateScene');

  if (!event.objects?.length) {
    return;
  }

  event.objects.forEach((object, index) => {
    const element = document.createElement('span');
    element.className = 'fate-object';
    element.textContent = object;
    element.style.left = `${14 + (index * 68 / Math.max(1, event.objects.length - 1))}%`;
    element.style.top = `${20 + (index % 2) * 45}%`;
    layer.appendChild(element);
  });
}

function runFateScene(event) {
  clearFateScene();

  const world = document.querySelector('.road-world');
  const vehicle = $('vehicle');
  const layer = $('fateScene');

  if (event.worldClass) {
    world.classList.add(event.worldClass);
  }

  if (event.sceneClass) {
    vehicle.classList.add(event.sceneClass);
  }

  placeFateObjects(event);

  const banner = document.createElement('div');
  banner.className = 'fate-banner';
  banner.textContent = `${event.icon} ${event.name}`;
  layer.appendChild(banner);

  if (event.id === 'ducks' || event.id === 'cones' || event.id === 'speedtrap') {
    vehicle.classList.add('fate-bounce');
  }

  if (event.rarity === 'EPIC' || event.rarity === 'LEGENDARY') {
    particleBurst($('vehicle'), event.rarity === 'LEGENDARY' ? 100 : 65, 2);
  }

  activeFateTimeout = setTimeout(clearFateScene, 5000);
}

function rollFreightFate() {
  closeDialog($('fatePromptDialog'));
  openDialog($('fateResultDialog'));

  const dice = $('rollingDice');
  dice.classList.add('rolling');
  $('fateRarity').textContent = 'ROLLING';
  $('fateEventName').textContent = 'Freight Fate is deciding...';
  $('fateEventDescription').textContent = 'No amount of dispatch training can prepare you for this.';
  $('closeFateResultBtn').disabled = true;

  let faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
  let faceIndex = 0;
  const diceInterval = setInterval(() => {
    dice.textContent = faces[faceIndex % faces.length];
    faceIndex += 1;
  }, 110);

  setTimeout(() => {
    clearInterval(diceInterval);
    const event = weightedFateRoll();

    dice.classList.remove('rolling');
    dice.textContent = event.icon;
    $('fateRarity').textContent = event.rarity;
    $('fateEventName').textContent = event.name;
    $('fateEventDescription').textContent = event.description;
    $('closeFateResultBtn').disabled = false;

    if (!state.discoveredEvents.includes(event.id)) {
      state.discoveredEvents.push(event.id);
      saveState();
      showToast(`New Fate event discovered: ${event.name}`);
    }

    runFateScene(event);
    playTone('plus', event.rarity === 'EPIC' || event.rarity === 'LEGENDARY');
  }, 1500);
}

function skipFreightFate() {
  closeDialog($('fatePromptDialog'));
  pendingFateMilestone = null;
  showToast('Freight Fate skipped');
}

function addLoad(delta) {
  state.log.unshift({
    delta,
    time: Date.now()
  });

  const plusMessages = [
    'Load secured.',
    'Driver updated.',
    'Another one on the board.',
    'Dispatch magic.',
    'Momentum acquired.'
  ];

  const minusMessages = [
    'Load removed from every score.',
    'All metrics corrected.',
    'Board, XP, race, and time corrected.'
  ];

  const choices = delta > 0 ? plusMessages : minusMessages;
  $('statusLine').textContent = choices[Math.floor(Math.random() * choices.length)];

  saveState();
  renderAll();
  animateCount(delta);
  playTone(delta > 0 ? 'plus' : 'minus');

  if (delta > 0) {
    particleBurst($('plusBtn'));
    maybeAwardRace();

    if (todayNetLoads() === state.dailyGoal) {
      flashMegaMessage('SHIFT GOAL CRUSHED!');
      particleBurst($('mainCount'), 100, 2.4);
      showToast('Daily load goal complete');
    }

    if (shouldPromptFate()) {
      setTimeout(promptFreightFate, 350);
    }
  } else {
    showToast('Subtracted from every live metric');
  }
}

function undoLast() {
  if (state.log.length === 0) {
    showToast('Nothing to undo');
    return;
  }

  state.log.shift();
  saveState();
  renderAll();
  showToast('Last update removed');
}

function exportBackup() {
  const blob = new Blob(
    [JSON.stringify(state, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `load-rush-backup-${new Date().toISOString().slice(0,10)}.json`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
  showToast('Backup exported');
}

function showToast(text) {
  const toast = $('toast');

  toast.textContent = text;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 1800);
}

function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

function closeDialog(dialog) {
  if (typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

function tickClock() {
  const key = currentHourKey();
  const day = todayKey();

  if (day !== previousDayKey) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    previousDayKey = day;
    state.lastRecapDate = day;
    saveState();
    renderAll();
    showDaySummary(yesterday);
  }

  if (key !== previousHourKey) {
    previousHourKey = key;
    renderAll();
    showToast('New hour. Back to the starting line.');
  }

  $('countdown').textContent = formatCountdown(secondsUntilNextHour());
}


function dateAtStart(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function netForDate(date) {
  const key = todayKey(date);
  return Math.max(0, netTotal(state.log.filter(entry => todayKey(new Date(entry.time)) === key)));
}

function netForRange(start, end) {
  return Math.max(0, netTotal(state.log.filter(entry => {
    const time = new Date(entry.time);
    return time >= start && time < end;
  })));
}

function buildChartData(period) {
  const now = new Date();
  const rows = [];

  if (period === 'daily') {
    for (let index = 13; index >= 0; index -= 1) {
      const date = dateAtStart(now);
      date.setDate(date.getDate() - index);
      rows.push({
        label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date),
        value: netForDate(date)
      });
    }
  } else if (period === 'weekly') {
    for (let index = 7; index >= 0; index -= 1) {
      const end = dateAtStart(now);
      end.setDate(end.getDate() - index * 7 + 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      rows.push({
        label: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(start),
        value: netForRange(start, end)
      });
    }
  } else {
    for (let index = 11; index >= 0; index -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - index + 1, 1);
      rows.push({
        label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(start),
        value: netForRange(start, end)
      });
    }
  }

  return rows;
}

function renderInsights(period = activeChartPeriod) {
  activeChartPeriod = period;

  document.querySelectorAll('.period-tab').forEach(button => {
    button.classList.toggle('active', button.dataset.period === period);
  });

  const rows = buildChartData(period);
  const values = rows.map(row => row.value);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = rows.length ? Math.round(total / rows.length) : 0;
  const best = Math.max(0, ...values);

  $('chartTotal').textContent = total;
  $('chartAverage').textContent = average;
  $('chartBest').textContent = best;

  const svg = $('insightsChart');
  const width = 760;
  const height = 300;
  const left = 48;
  const right = 18;
  const top = 20;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(5, best);
  const pointGap = rows.length > 1 ? plotWidth / (rows.length - 1) : plotWidth;

  const points = rows.map((row, index) => {
    const x = left + index * pointGap;
    const y = top + plotHeight - (row.value / maxValue) * plotHeight;
    return { ...row, x, y };
  });

  let markup = '';

  for (let step = 0; step <= 4; step += 1) {
    const y = top + (plotHeight / 4) * step;
    const value = Math.round(maxValue - (maxValue / 4) * step);
    markup += `<line class="chart-grid-line" x1="${left}" y1="${y}" x2="${width-right}" y2="${y}"></line>`;
    markup += `<text class="chart-axis-label" x="${left-10}" y="${y+4}" text-anchor="end">${value}</text>`;
  }

  const linePoints = points.map(point => `${point.x},${point.y}`).join(' ');
  const areaPoints = `${left},${top+plotHeight} ${linePoints} ${width-right},${top+plotHeight}`;

  markup += `<polygon class="chart-area" points="${areaPoints}"></polygon>`;
  markup += `<polyline class="chart-line" points="${linePoints}"></polyline>`;

  points.forEach((point, index) => {
    markup += `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="5"></circle>`;

    const showLabel = rows.length <= 8 || index % 2 === 0 || index === rows.length - 1;
    if (showLabel) {
      markup += `<text class="chart-axis-label" x="${point.x}" y="${height-18}" text-anchor="middle">${point.label}</text>`;
    }
  });

  svg.innerHTML = markup;

  const periodName = period === 'daily'
    ? 'the last 14 days'
    : period === 'weekly'
      ? 'the last 8 weeks'
      : 'the last 12 months';

  $('chartCaption').textContent = `${total} net loads across ${periodName}.`;
}

function hourlyTotalsForDate(date) {
  const key = todayKey(date);
  const totals = Array.from({ length: 24 }, () => 0);

  state.log.forEach(entry => {
    const entryDate = new Date(entry.time);
    if (todayKey(entryDate) !== key) return;
    totals[entryDate.getHours()] += entry.delta;
  });

  return totals.map(value => Math.max(0, value));
}

function showDaySummary(date = new Date()) {
  const selected = dateAtStart(date);
  currentSummaryDate = todayKey(selected);
  const loads = netForDate(selected);
  const hours = hourlyTotalsForDate(selected);
  const best = Math.max(0, ...hours);
  const goalPercent = Math.min(100, Math.round((loads / Math.max(1, state.dailyGoal)) * 100));

  $('summaryDate').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(selected);

  $('summaryLoads').textContent = loads;
  $('summaryWork').textContent = formatDuration(loads * state.minutesPerUpdate);
  $('summaryBestHour').textContent = `${best} loads`;
  $('summaryGoal').textContent = `${goalPercent}%`;
  $('summaryXp').textContent = `${loads} XP`;

  if (loads >= state.dailyGoal) {
    $('summaryVerdict').textContent = 'Day won. Goal crushed. The board never stood a chance.';
  } else if (goalPercent >= 75) {
    $('summaryVerdict').textContent = 'Strong shift. You kept the freight moving.';
  } else if (loads > 0) {
    $('summaryVerdict').textContent = 'Progress banked. Tomorrow gets another lap.';
  } else {
    $('summaryVerdict').textContent = 'No tracked loads for this day.';
  }

  const maxHour = Math.max(1, best);
  $('summaryHourlyBars').innerHTML = hours.map((value, hour) => {
    const height = Math.max(3, Math.round((value / maxHour) * 90));
    return `<div class="recap-hour-bar" style="height:${height}px" title="${hour}:00 — ${value} loads"></div>`;
  }).join('');

  openDialog($('summaryDialog'));
}

function maybeShowAutomaticRecap() {
  const today = todayKey();

  if (state.lastRecapDate === today) {
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (netForDate(yesterday) > 0) {
    state.lastRecapDate = today;
    saveState();
    showDaySummary(yesterday);
  }
}

function copySummary() {
  const date = $('summaryDate').textContent;
  const text = [
    `Win the Day Recap — ${date}`,
    `${$('summaryLoads').textContent} net loads tracked`,
    `Estimated work: ${$('summaryWork').textContent}`,
    `Best hour: ${$('summaryBestHour').textContent}`,
    `Goal: ${$('summaryGoal').textContent}`,
    `XP earned: ${$('summaryXp').textContent}`
  ].join('\n');

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Recap copied'))
      .catch(() => showToast('Could not copy recap'));
  } else {
    showToast('Copy unavailable in this browser');
  }
}


function bindReminderEventsSafely() {
  if (document.documentElement.dataset.reminderEventsBound === 'true') {
    return;
  }

  document.documentElement.dataset.reminderEventsBound = 'true';

  document.addEventListener('click', event => {
    const remindersButton = event.target.closest('#remindersBtn');
    if (remindersButton) {
      event.preventDefault();
      event.stopPropagation();

      const addButton = $('addReminderBtn');
      if (addButton) {
        addButton.disabled = false;
        addButton.textContent = 'Add reminder';
      }

      renderReminders();
      showReminderTab('list');
      openDialog($('remindersDialog'));
      return;
    }

    if (event.target.closest('#viewRemindersTab')) {
      showReminderTab('list');
      return;
    }

    if (event.target.closest('#newReminderTab')) {
      showReminderTab('form');
      return;
    }

    if (event.target.closest('#closeRemindersBtn') || event.target.closest('#closeRemindersX')) {
      closeDialog($('remindersDialog'));
      return;
    }

    if (event.target.closest('#addReminderBtn')) {
      addReminder();
      return;
    }

    if (event.target.closest('#enableNotificationsBtn')) {
      requestReminderNotifications();
      return;
    }

    if (event.target.closest('#dismissAlarmBtn')) {
      dismissReminderAlarm();
      return;
    }
  });

  const textInput = $('reminderTextInput');
  if (textInput && !textInput.dataset.bound) {
    textInput.dataset.bound = 'true';
    textInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        addReminder();
      }
    });
  }
}

function bindEvents() {
  $('plusBtn').addEventListener('click', () => addLoad(1));
  $('minusBtn').addEventListener('click', () => addLoad(-1));
  $('undoBtn').addEventListener('click', undoLast);
  $('exportBtn').addEventListener('click', exportBackup);

  $('insightsBtn').addEventListener('click', () => {
    renderInsights(activeChartPeriod);
    openDialog($('insightsDialog'));
  });

  $('summaryBtn').addEventListener('click', () => showDaySummary(new Date()));

  $('closeInsightsBtn').addEventListener('click', () => closeDialog($('insightsDialog')));
  $('closeInsightsX').addEventListener('click', () => closeDialog($('insightsDialog')));

  document.querySelectorAll('.period-tab').forEach(button => {
    button.addEventListener('click', () => renderInsights(button.dataset.period));
  });

  $('closeSummaryBtn').addEventListener('click', () => closeDialog($('summaryDialog')));
  $('closeSummaryX').addEventListener('click', () => closeDialog($('summaryDialog')));
  $('shareSummaryBtn').addEventListener('click', copySummary);

  $('themeBtn').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
    renderAll();
  });

  $('garageBtn').addEventListener('click', () => {
    renderGarage();
    openDialog($('garageDialog'));
  });

  $('rollFateBtn').addEventListener('click', rollFreightFate);
  $('skipFateBtn').addEventListener('click', skipFreightFate);
  $('closeFateResultBtn').addEventListener('click', () => {
    closeDialog($('fateResultDialog'));
    pendingFateMilestone = null;
  });

  $('closeGarageBtn').addEventListener('click', () => closeDialog($('garageDialog')));
  $('closeGarageX').addEventListener('click', () => closeDialog($('garageDialog')));

  $('settingsBtn').addEventListener('click', () => openDialog($('settingsDialog')));
  $('closeSettingsX').addEventListener('click', () => closeDialog($('settingsDialog')));

  $('saveSettingsBtn').addEventListener('click', () => {
    state.dailyGoal = Math.max(1, Number($('dailyGoalInput').value) || DEFAULTS.dailyGoal);
    state.hourlyGoal = Math.max(1, Number($('hourlyGoalInput').value) || DEFAULTS.hourlyGoal);
    state.minutesPerUpdate = Math.max(1, Number($('minutesInput').value) || DEFAULTS.minutesPerUpdate);
    state.soundStyle = $('soundStyleSelect').value || 'engine';
    state.fateFrequency = Math.max(1, Number($('fateFrequencySelect').value) || 10);

    saveState();
    renderAll();
    closeDialog($('settingsDialog'));
    showToast('Settings saved');
  });

  $('soundToggle').addEventListener('click', () => {
    state.sound = !state.sound;
    saveState();
    applyTheme();
  });

  $('soundStyleSelect').addEventListener('change', () => {
    state.soundStyle = $('soundStyleSelect').value;
    saveState();
  });

  $('previewSoundBtn').addEventListener('click', () => {
    state.soundStyle = $('soundStyleSelect').value;
    playTone('plus', false, true);
  });

  $('particlesToggle').addEventListener('click', () => {
    state.particles = !state.particles;
    saveState();
    applyTheme();
  });

  $('fateToggle').addEventListener('click', () => {
    state.fateEnabled = !state.fateEnabled;
    saveState();
    applyTheme();
  });

  $('fateFrequencySelect').addEventListener('change', () => {
    state.fateFrequency = Math.max(1, Number($('fateFrequencySelect').value) || 10);
    saveState();
  });

  $('importBtn').addEventListener('click', () => $('importInput').click());

  $('importInput').addEventListener('change', async event => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const imported = JSON.parse(await file.text());
      const migrated = migrateLegacyState(imported);

      Object.assign(state, DEFAULTS, migrated);
      saveState();
      renderAll();
      closeDialog($('settingsDialog'));
      showToast('Backup imported');
    } catch (error) {
      console.error(error);
      alert('That backup file could not be read.');
    }

    event.target.value = '';
  });

  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Reset all Load Rush data? This cannot be undone.')) {
      return;
    }

    Object.assign(state, {
      ...DEFAULTS,
      log: [],
      completedHours: []
    });

    saveState();
    renderAll();
    closeDialog($('settingsDialog'));
    showToast('Load Rush reset');
  });

  document.addEventListener('keydown', event => {
    if (event.key === '+' || event.key === '=' || event.key === 'ArrowUp') {
      addLoad(1);
    }

    if (event.key === '-' || event.key === '_' || event.key === 'ArrowDown') {
      addLoad(-1);
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undoLast();
    }

    if (event.key === 'Escape') {
      if ($('garageDialog').open) {
        closeDialog($('garageDialog'));
      }

      if ($('settingsDialog').open) {
        closeDialog($('settingsDialog'));
      }

      if ($('insightsDialog').open) {
        closeDialog($('insightsDialog'));
      }

      if ($('summaryDialog').open) {
        closeDialog($('summaryDialog'));
      }

      if ($('fatePromptDialog').open) {
        skipFreightFate();
      }

      if ($('fateResultDialog').open) {
        closeDialog($('fateResultDialog'));
      }

      if ($('remindersDialog').open) {
        closeDialog($('remindersDialog'));
      }
    }
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('./sw.js?v=reminder-button-v4', {
      updateViaCache: 'none'
    });

    await registration.update();

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;

      if (!worker) {
        return;
      }

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    let reloading = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) {
        return;
      }

      reloading = true;
      location.reload();
    });
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
}

function initialize() {
  state.reminders = Array.isArray(state.reminders) ? state.reminders : [];
  bindEvents();
  bindReminderEventsSafely();

  const remindersButton = $('remindersBtn');
  if (remindersButton) {
    remindersButton.onclick = event => {
      event.preventDefault();
      event.stopPropagation();

      const addButton = $('addReminderBtn');
      if (addButton) {
        addButton.disabled = false;
        addButton.textContent = 'Add reminder';
      }

      renderReminders();
      showReminderTab('list');
      openDialog($('remindersDialog'));
    };
  }

  $('reminderDateInput').value = defaultReminderDate();
  $('reminderTimeInput').value = defaultReminderTime();

  if ('Notification' in window && Notification.permission === 'granted') {
    $('enableNotificationsBtn').textContent = 'Notifications enabled';
    $('enableNotificationsBtn').disabled = true;
  }

  renderAll();
  renderReminders();
  tickClock();
  checkReminders();
  setInterval(tickClock, 1000);
  setInterval(checkReminders, 1000);
  setTimeout(maybeShowAutomaticRecap, 600);
  registerServiceWorker();
}

initialize();
