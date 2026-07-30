/* Persistência versionada e defensiva do progresso local. */
const Storage = (() => {
  const KEY = 'spacerun.save.v2';
  const LEGACY_KEY = 'spacerun.save.v1';
  const LEGACY_BACKUP_KEY = 'spacerun.save.v1.backup';
  const RECOVERY_KEY = 'spacerun.save.v2.backup';
  const SCHEMA_VERSION = 2;
  const UPGRADE_MAX = 10;
  const UPGRADE_STEP = 0.02;
  const UPGRADE_BASE_COST = 30;
  const MAX_HISTORY = 50;
  const MAX_LEADERBOARD_PER_CATEGORY = 10;
  // Há oito categorias de modo; cada uma preserva Top 10 local e importado.
  const MAX_LEADERBOARD = 160;
  const MAX_IMPORT_BYTES = 64 * 1024;
  const DAILY_REWARDS = [50, 75, 125, 200, 300, 400, 500];
  const SHIP_IDS = ['scout', 'falcon', 'tank', 'phantom', 'nova', 'vortex', 'quasar', 'pulsar', 'nebula', 'singularity', 'comet', 'aurora', 'raptor', 'helix', 'titan', 'spectre', 'ember', 'zephyr', 'cosmos', 'eclipse'];
  const THEMES = ['neon', 'retro', 'aurora'];
  const MODES = ['classic', 'daily', 'zen', 'sprint', 'hardcore', 'marathon', 'timeattack', 'bossrush'];
  // Desbloqueios são derivados do progresso já persistido, sem criar um
  // segundo inventário de progresso nem exigir migração de schema.
  const MODE_MILESTONES = {
    classic: 0,
    daily: 10000,
    zen: 25000,
    sprint: 50000,
    hardcore: 100000,
    marathon: 250000,
    timeattack: 500000,
    bossrush: 1000000
  };
  const POWERUP_IDS = ['magnet', 'doubleCrystals', 'shield'];
  const COSMETIC_IDS = [
    'trail:ion', 'trail:wave', 'trail:stars', 'trail:flame',
    'explosion:nova', 'explosion:neon', 'explosion:particles', 'explosion:wave',
    'title:cadet', 'title:voyager', 'title:legend'
  ];
  const COSMETIC_DEFAULTS = { trail: 'ion', explosion: 'nova', title: 'cadet' };
  const COSMETIC_COSTS = {
    'trail:wave': 80, 'trail:stars': 160, 'trail:flame': 240,
    'explosion:neon': 90, 'explosion:particles': 180, 'explosion:wave': 260
  };
  const ACHIEVEMENT_IDS = ['first_flight', 'dist_5k', 'dist_10k', 'dist_25k', 'dist_100k', 'crystals_25', 'crystals_100', 'combo_10', 'time_2min', 'time_5min', 'fleet', 'streak_3', 'daily_first', 'dist_50k', 'dist_250k', 'dist_500k', 'crystals_250', 'combo_25', 'combo_50', 'time_10min', 'streak_5', 'streak_10', 'total_1m'];
  let lastError = null;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function now() { return Date.now(); }
  function defaults() {
    const timestamp = now();
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: { createdAt: timestamp, updatedAt: timestamp, migratedFrom: null },
      best: 0, totalMeters: 0, totalRuns: 0, bestTime: 0, crystals: 0,
      selectedShip: 'scout', unlocked: ['scout'], achievements: [], history: [],
      streak: 0, maxStreak: 0, leaderboard: [], playerName: '', friendCode: newFriendCode(), shipSkins: {},
      upgrades: { agility: 0, thrust: 0 },
      cosmetics: { trail: 'ion', explosion: 'nova', title: 'cadet', unlocked: ['trail:ion', 'explosion:nova', 'title:cadet'] },
      retention: { lastClaimDate: '', loginStreak: 0, xp: 0, daily: { date: '', progress: {} }, weekly: { week: '', progress: {} } },
      settings: { sound: true, music: true, particles: true, lang: null,
        reduceMotion: false, highContrast: false, theme: 'neon', performanceMode: false, haptics: false }
    };
  }
  function object(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function int(v, fallback, max) {
    const n = Number(v);
    return Number.isSafeInteger(n) && n >= 0 && (max === undefined || n <= max) ? n : fallback;
  }
  function number(v, fallback, max) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && (max === undefined || n <= max) ? n : fallback;
  }
  function seconds(v, fallback) { return Math.round(number(v, fallback, 1e9) * 10) / 10; }
  function color(v) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null; }
  function name(v) {
    if (typeof v !== 'string') return '';
    return Array.from(v.trim()).slice(0, 16).join('');
  }
  function id(v, allowed, fallback) { return typeof v === 'string' && allowed.includes(v) ? v : fallback; }
  function uniqueIds(v, allowed, fallback, max) {
    if (!Array.isArray(v)) return fallback.slice();
    const out = [];
    v.forEach(x => { if (allowed.includes(x) && !out.includes(x) && out.length < max) out.push(x); });
    return out.length ? out : fallback.slice();
  }
  function loadout(v) {
    v = object(v) ? v : {};
    return { agility: int(v.agility, 0, UPGRADE_MAX), thrust: int(v.thrust, 0, UPGRADE_MAX) };
  }
  function powerups(v) { return uniqueIds(v, POWERUP_IDS, [], POWERUP_IDS.length); }
  function cosmetics(v) {
    v = object(v) ? v : {};
    const baseUnlocked = ['trail:ion', 'explosion:nova', 'title:cadet'];
    const savedUnlocked = uniqueIds(v.unlocked, COSMETIC_IDS, [], COSMETIC_IDS.length);
    const unlocked = baseUnlocked.concat(savedUnlocked.filter(id => !baseUnlocked.includes(id))).slice(0, COSMETIC_IDS.length);
    const selection = {};
    Object.keys(COSMETIC_DEFAULTS).forEach(type => {
      const value = id(v[type], COSMETIC_IDS.filter(x => x.startsWith(type + ':')).map(x => x.slice(type.length + 1)), COSMETIC_DEFAULTS[type]);
      selection[type] = unlocked.includes(type + ':' + value) ? value : COSMETIC_DEFAULTS[type];
    });
    return Object.assign(selection, { unlocked });
  }
  function timestamp(v) { return int(v, now(), 4102444800000); }
  function dateKey(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; }
  function weekKey(v) { return typeof v === 'string' && /^\d{4}-W\d{2}$/.test(v) ? v : ''; }
  function counterMap(v) {
    const out = {}; if (!object(v)) return out;
    Object.keys(v).slice(0, 12).forEach(k => { if (/^[a-z]+$/.test(k)) out[k] = int(v[k], 0, 1000000000); });
    return out;
  }
  function retention(v) {
    v = object(v) ? v : {}; const daily = object(v.daily) ? v.daily : {}; const weekly = object(v.weekly) ? v.weekly : {};
    return { lastClaimDate: dateKey(v.lastClaimDate), loginStreak: int(v.loginStreak, 0, 3650), xp: int(v.xp, 0, Number.MAX_SAFE_INTEGER),
      daily: { date: dateKey(daily.date), progress: counterMap(daily.progress) }, weekly: { week: weekKey(weekly.week), progress: counterMap(weekly.progress) } };
  }
  function randomId(prefix) { return prefix + '-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
  function newFriendCode() {
    const bytes = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes, n => n.toString(36).padStart(2, '0')).join('').slice(0, 16);
  }
  function friendCode(v, fallback) { return typeof v === 'string' && /^[a-z0-9]{8,24}$/.test(v) ? v : fallback; }
  function normalizeRun(v, legacy) {
    v = object(v) ? v : {};
    const mode = id(v.mode, MODES, 'classic');
    return {
      id: typeof v.id === 'string' && v.id.length <= 64 ? v.id : randomId('run'),
      m: int(v.m, 0, Number.MAX_SAFE_INTEGER), t: seconds(v.t, 0), c: int(v.c, 0, Number.MAX_SAFE_INTEGER),
      d: timestamp(v.d), mode, seed: int(v.seed, 0, 0xffffffff),
      rulesetId: typeof v.rulesetId === 'string' && v.rulesetId.length <= 32 ? v.rulesetId : (legacy ? 'legacy-v04' : mode + '-v2'),
      shipId: id(v.shipId, SHIP_IDS, legacy ? 'unknown' : 'scout'), loadout: loadout(v.loadout),
      maxCombo: int(v.maxCombo, 0, 1000000), powerups: powerups(v.powerups)
    };
  }
  function normalizeScore(v, legacy) {
    v = object(v) ? v : {};
    const mode = id(v.mode, MODES, 'classic');
    return {
      id: typeof v.id === 'string' && v.id.length <= 64 ? v.id : randomId('score'), name: name(v.name),
      m: int(v.m, 0, Number.MAX_SAFE_INTEGER), t: seconds(v.t, 0), d: timestamp(v.d), mode,
      seed: int(v.seed, 0, 0xffffffff),
      rulesetId: typeof v.rulesetId === 'string' && v.rulesetId.length <= 32 ? v.rulesetId : (legacy ? 'legacy-v04' : mode + '-v2'),
      shipId: id(v.shipId, SHIP_IDS, legacy ? 'unknown' : 'scout'), loadout: loadout(v.loadout),
      source: v.source === 'imported' ? 'imported' : 'local',
      origin: v.source === 'imported' ? friendCode(v.origin, '') : ''
    };
  }
  function rank(a, b) { return b.m - a.m || a.t - b.t || a.d - b.d; }
  function limitLeaderboard(entries) {
    const groups = new Map();
    entries.slice().sort(rank).forEach(entry => {
      const key = entry.source + '|' + entry.mode + '|' + entry.rulesetId;
      const group = groups.get(key) || [];
      if (group.length < MAX_LEADERBOARD_PER_CATEGORY) group.push(entry);
      groups.set(key, group);
    });
    return Array.from(groups.values()).flat().sort(rank).slice(0, MAX_LEADERBOARD);
  }
  function normalize(v, options) {
    const base = defaults();
    v = object(v) ? v : {};
    const legacy = !!(options && options.legacy);
    const meta = object(v.meta) ? v.meta : {};
    const skins = {};
    if (object(v.shipSkins)) Object.keys(v.shipSkins).forEach(shipId => {
      const skin = v.shipSkins[shipId]; const body = skin && color(skin.color); const accent = skin && color(skin.accent);
      if (SHIP_IDS.includes(shipId) && body && accent) skins[shipId] = { color: body, accent };
    });
    const settings = object(v.settings) ? v.settings : {};
    const history = Array.isArray(v.history) ? v.history.slice(-MAX_HISTORY).map(x => normalizeRun(x, legacy)) : [];
    const leaderboard = limitLeaderboard(Array.isArray(v.leaderboard) ? v.leaderboard.map(x => normalizeScore(x, legacy)) : []);
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: { createdAt: timestamp(meta.createdAt), updatedAt: timestamp(meta.updatedAt), migratedFrom: legacy ? 1 : null },
      best: int(v.best, 0, Number.MAX_SAFE_INTEGER), totalMeters: int(v.totalMeters, 0, Number.MAX_SAFE_INTEGER),
      totalRuns: int(v.totalRuns, 0, Number.MAX_SAFE_INTEGER), bestTime: seconds(v.bestTime, 0), crystals: int(v.crystals, 0, Number.MAX_SAFE_INTEGER),
      selectedShip: id(v.selectedShip, SHIP_IDS, base.selectedShip), unlocked: uniqueIds(v.unlocked, SHIP_IDS, ['scout'], SHIP_IDS.length),
      achievements: uniqueIds(v.achievements, ACHIEVEMENT_IDS, [], 100),
      history, streak: int(v.streak, 0, Number.MAX_SAFE_INTEGER), maxStreak: int(v.maxStreak, 0, Number.MAX_SAFE_INTEGER),
      leaderboard, playerName: name(v.playerName), friendCode: friendCode(v.friendCode, base.friendCode), shipSkins: skins,
      upgrades: loadout(v.upgrades), cosmetics: cosmetics(v.cosmetics), retention: retention(v.retention), settings: {
        sound: typeof settings.sound === 'boolean' ? settings.sound : base.settings.sound,
        music: typeof settings.music === 'boolean' ? settings.music : base.settings.music,
        particles: typeof settings.particles === 'boolean' ? settings.particles : base.settings.particles,
        lang: ['pt', 'en', 'es'].includes(settings.lang) ? settings.lang : null,
        reduceMotion: typeof settings.reduceMotion === 'boolean' ? settings.reduceMotion : base.settings.reduceMotion,
        highContrast: typeof settings.highContrast === 'boolean' ? settings.highContrast : base.settings.highContrast,
        theme: id(settings.theme, THEMES, base.settings.theme),
        performanceMode: typeof settings.performanceMode === 'boolean' ? settings.performanceMode : base.settings.performanceMode,
        haptics: typeof settings.haptics === 'boolean' ? settings.haptics : base.settings.haptics
      }
    };
  }
  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { lastError = 'storage-read'; return null; } }
  function persist(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); data = next; lastError = null; return true; }
    catch (e) { lastError = 'storage-write'; return false; }
  }
  function commit(mutator) {
    const next = clone(data); mutator(next); next.meta.updatedAt = now();
    return persist(normalize(next));
  }
  function migrate(legacyRaw) {
    try { if (localStorage.getItem(LEGACY_BACKUP_KEY) === null) localStorage.setItem(LEGACY_BACKUP_KEY, legacyRaw); } catch (e) { lastError = 'storage-backup'; }
    let legacy; try { legacy = JSON.parse(legacyRaw); } catch (e) { return defaults(); }
    return normalize(legacy, { legacy: true });
  }
  function load() {
    const raw = safeGet(KEY);
    if (raw) { try { const parsed = JSON.parse(raw); if (object(parsed) && parsed.schemaVersion === SCHEMA_VERSION) return normalize(parsed); } catch (e) { lastError = 'storage-parse'; } }
    const recovery = safeGet(RECOVERY_KEY);
    if (recovery) { try { const parsed = JSON.parse(recovery); if (object(parsed) && parsed.schemaVersion === SCHEMA_VERSION) return normalize(parsed); } catch (e) { lastError = 'storage-recovery-parse'; } }
    const legacyRaw = safeGet(LEGACY_KEY);
    const next = legacyRaw ? migrate(legacyRaw) : defaults();
    persist(next); return data || next;
  }
  let data = defaults();
  data = load();

  function runInput(meters, time, crystals, context) {
    const input = object(meters) ? meters : Object.assign({ m: meters, t: time, c: crystals }, context || {});
    return normalizeRun(input, false);
  }
  function scoreInput(meters, time, context) {
    const input = object(meters) ? meters : Object.assign({ m: meters, t: time }, context || {});
    return normalizeScore(input, false);
  }
  function currentLoadout() { return { agility: data.upgrades.agility, thrust: data.upgrades.thrust }; }
  function todayKey(date) {
    const d = date instanceof Date ? date : new Date();
    if (Number.isNaN(d.getTime())) return '';
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  function currentWeek(date) {
    const d = date instanceof Date ? new Date(date) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const first = new Date(d.getFullYear(), 0, 4); const week = 1 + Math.round(((d - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7);
    return d.getFullYear() + '-W' + String(week).padStart(2, '0');
  }
  function progressRun(next, run) {
    const day = todayKey(new Date(run.d)); const week = currentWeek(new Date(run.d));
    if (day && next.retention.daily.date !== day) next.retention.daily = { date: day, progress: {} };
    if (week && next.retention.weekly.week !== week) next.retention.weekly = { week, progress: {} };
    const add = (map, k, n) => { map[k] = Math.min(1000000000, (map[k] || 0) + n); };
    add(next.retention.daily.progress, 'runs', 1); add(next.retention.daily.progress, 'meters', run.m); add(next.retention.daily.progress, 'crystals', run.c); add(next.retention.daily.progress, 'seconds', Math.floor(run.t)); if (run.mode === 'daily') add(next.retention.daily.progress, 'daily', 1);
    add(next.retention.weekly.progress, 'runs', 1); add(next.retention.weekly.progress, 'meters', run.m); add(next.retention.weekly.progress, 'crystals', run.c); if (run.mode === 'daily') add(next.retention.weekly.progress, 'daily', 1); add(next.retention.weekly.progress, 'best', run.m);
    next.retention.xp = Math.min(Number.MAX_SAFE_INTEGER, next.retention.xp + Math.floor(run.m / 100) + run.c);
  }

  return {
    UPGRADE_MAX, UPGRADE_STEP, SCHEMA_VERSION, KEY,
    get: () => clone(data), getSnapshot: () => clone(data), getBest: () => data.best,
    getSettings: () => clone(data.settings), getHistory: () => clone(data.history),
    getLeaderboard: (filter) => clone(filter ? data.leaderboard.filter(filter) : data.leaderboard),
    getFriendCode: () => data.friendCode,
    getModeMilestone: mode => Object.prototype.hasOwnProperty.call(MODE_MILESTONES, mode) ? MODE_MILESTONES[mode] : null,
    isModeUnlocked: mode => Object.prototype.hasOwnProperty.call(MODE_MILESTONES, mode) && data.totalMeters >= MODE_MILESTONES[mode],
    getLastError: () => lastError,
    getRetention: () => clone(data.retention),
    getProfile: () => ({ name: data.playerName, xp: data.retention.xp, level: Math.floor(data.retention.xp / 100) + 1 }),
    claimDailyReward(date) {
      const today = todayKey(date); if (!today || data.retention.lastClaimDate >= today) return null;
      let reward = 0;
      const ok = commit(next => {
        const prior = next.retention.lastClaimDate;
        const yesterday = new Date(date instanceof Date ? date : new Date()); yesterday.setDate(yesterday.getDate() - 1);
        next.retention.loginStreak = prior === todayKey(yesterday) ? Math.min(7, next.retention.loginStreak + 1) : 1;
        reward = DAILY_REWARDS[next.retention.loginStreak - 1]; next.retention.lastClaimDate = today;
        next.crystals = Math.min(Number.MAX_SAFE_INTEGER, next.crystals + reward);
      });
      return ok ? { reward, streak: data.retention.loginStreak } : null;
    },
    setSetting(key, value) {
      if (!Object.prototype.hasOwnProperty.call(data.settings, key)) return false;
      return commit(next => { next.settings[key] = value; });
    },
    setSelectedShip(id) { if (!data.unlocked.includes(id)) return false; return commit(next => { next.selectedShip = id; }); },
    unlock(id) { if (!SHIP_IDS.includes(id) || data.unlocked.includes(id)) return false; return commit(next => { next.unlocked.push(id); }); },
    isUnlocked: id => data.unlocked.includes(id),
    getAchievements: () => data.achievements.slice(), hasAchievement: id => data.achievements.includes(id),
    unlockAchievement(id) { if (data.achievements.includes(id)) return false; return commit(next => { next.achievements.push(id); }); },
    getShipSkin(id) { const skin = data.shipSkins[id]; return skin ? clone(skin) : null; },
    setShipSkin(id, body, accent) { if (!SHIP_IDS.includes(id) || !color(body) || !color(accent)) return false; return commit(next => { next.shipSkins[id] = { color: body, accent }; }); },
    resetShipSkin(id) { if (!SHIP_IDS.includes(id)) return false; return commit(next => { delete next.shipSkins[id]; }); },
    getUpgradeLevel(stat) { return ['agility', 'thrust'].includes(stat) ? data.upgrades[stat] : 0; },
    getUpgradeMult(stat) { return 1 + UPGRADE_STEP * (['agility', 'thrust'].includes(stat) ? data.upgrades[stat] : 0); },
    getUpgradeCost(stat) { const level = this.getUpgradeLevel(stat); return ['agility', 'thrust'].includes(stat) && level < UPGRADE_MAX ? UPGRADE_BASE_COST * (level + 1) : null; },
    buyUpgrade(stat) {
      if (!['agility', 'thrust'].includes(stat)) return false;
      const cost = this.getUpgradeCost(stat); if (cost === null || data.crystals < cost) return false;
      return commit(next => { next.crystals -= cost; next.upgrades[stat] += 1; });
    },
    getCosmetics: () => clone(data.cosmetics),
    getCosmeticCost(type, value) { return COSMETIC_COSTS[type + ':' + value] || null; },
    setCosmetic(type, value) {
      const key = type + ':' + value;
      if (!Object.prototype.hasOwnProperty.call(COSMETIC_DEFAULTS, type) || !COSMETIC_IDS.includes(key) || !data.cosmetics.unlocked.includes(key)) return false;
      return commit(next => { next.cosmetics[type] = value; });
    },
    buyCosmetic(type, value) {
      const key = type + ':' + value;
      const cost = COSMETIC_COSTS[key];
      if (!cost || !COSMETIC_IDS.includes(key) || data.cosmetics.unlocked.includes(key) || data.crystals < cost) return false;
      return commit(next => { next.crystals -= cost; next.cosmetics.unlocked.push(key); next.cosmetics[type] = value; });
    },
    getPlayerName: () => data.playerName, setPlayerName(value) { return commit(next => { next.playerName = name(value); }); },
    recordLeaderboard(meters, time, context) {
      const entry = scoreInput(meters, time, Object.assign({ name: data.playerName, shipId: data.selectedShip, loadout: currentLoadout() }, context || {}));
      let index = -1; const ok = commit(next => { next.leaderboard = limitLeaderboard(next.leaderboard.concat(entry)); index = next.leaderboard.findIndex(x => x.id === entry.id); });
      return ok ? index : -1;
    },
    importLeaderboard(entries, origin) {
      if (!Array.isArray(entries) || entries.length > 10 || !friendCode(origin, '')) return 0;
      const clean = entries.map(entry => scoreInput(entry.m, entry.t, Object.assign({}, entry, { source: 'imported', origin }))).filter(entry => entry.source === 'imported');
      if (!clean.length) return 0;
      let imported = 0;
      const ok = commit(next => {
        clean.forEach(entry => {
          const exists = next.leaderboard.some(item => item.source === 'imported' && item.origin === entry.origin && item.mode === entry.mode && item.rulesetId === entry.rulesetId && item.name === entry.name && item.m === entry.m && item.t === entry.t);
          if (!exists) { next.leaderboard.push(entry); imported++; }
        });
        next.leaderboard = limitLeaderboard(next.leaderboard);
      });
      return ok ? imported : 0;
    },
    recordRun(meters, time, crystals, context) {
      const run = runInput(meters, time, crystals, Object.assign({ shipId: data.selectedShip, loadout: currentLoadout() }, context || {}));
      const res = { isBest: false, newUnlocks: [] };
      const unlocks = typeof Ships !== 'undefined' ? Ships.list : [];
      const ok = commit(next => {
        next.totalRuns += 1; next.totalMeters = Math.min(Number.MAX_SAFE_INTEGER, next.totalMeters + run.m); next.crystals = Math.min(Number.MAX_SAFE_INTEGER, next.crystals + run.c);
        if (run.m > next.best) { next.best = run.m; res.isBest = true; }
        if (run.t > next.bestTime) next.bestTime = run.t;
        next.streak = res.isBest ? next.streak + 1 : 0; next.maxStreak = Math.max(next.maxStreak, next.streak);
        next.history.push(run); if (next.history.length > MAX_HISTORY) next.history.shift();
        progressRun(next, run);
        unlocks.forEach(ship => { if (!next.unlocked.includes(ship.id) && next.totalMeters >= ship.unlockAt) { next.unlocked.push(ship.id); res.newUnlocks.push(ship.id); } });
        [['title:voyager', 10000], ['title:legend', 100000]].forEach(([cosmetic, meters]) => {
          if (next.totalMeters >= meters && !next.cosmetics.unlocked.includes(cosmetic)) next.cosmetics.unlocked.push(cosmetic);
        });
      });
      return ok ? res : { isBest: false, newUnlocks: [] };
    },
    exportSave() { return JSON.stringify(data); },
    importSave(serialized) {
      if (typeof serialized !== 'string' || serialized.length > MAX_IMPORT_BYTES) { lastError = 'import-size'; return false; }
      try { const parsed = JSON.parse(serialized); if (!object(parsed) || parsed.schemaVersion !== SCHEMA_VERSION) { lastError = 'import-version'; return false; }
        try { localStorage.setItem(RECOVERY_KEY, JSON.stringify(data)); } catch (e) { lastError = 'storage-backup'; return false; }
        return persist(normalize(parsed));
      } catch (e) { lastError = 'import-parse'; return false; }
    },
    reset() { const next = defaults(); return persist(next); }
  };
})();
