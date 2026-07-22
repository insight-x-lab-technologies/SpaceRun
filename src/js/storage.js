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
  const MAX_LEADERBOARD = 10;
  const MAX_IMPORT_BYTES = 64 * 1024;
  const SHIP_IDS = ['scout', 'falcon', 'tank', 'phantom', 'nova', 'vortex', 'quasar', 'pulsar', 'nebula', 'singularity', 'comet', 'aurora', 'raptor', 'helix', 'titan', 'spectre', 'ember', 'zephyr', 'cosmos', 'eclipse'];
  const THEMES = ['neon', 'retro', 'aurora'];
  const MODES = ['classic', 'daily'];
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
      streak: 0, maxStreak: 0, leaderboard: [], playerName: '', shipSkins: {},
      upgrades: { agility: 0, thrust: 0 },
      settings: { sound: true, music: true, particles: true, lang: null,
        reduceMotion: false, highContrast: false, theme: 'neon', performanceMode: false }
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
  function timestamp(v) { return int(v, now(), 4102444800000); }
  function randomId(prefix) { return prefix + '-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
  function normalizeRun(v, legacy) {
    v = object(v) ? v : {};
    const mode = id(v.mode, MODES, 'classic');
    return {
      id: typeof v.id === 'string' && v.id.length <= 64 ? v.id : randomId('run'),
      m: int(v.m, 0, Number.MAX_SAFE_INTEGER), t: seconds(v.t, 0), c: int(v.c, 0, Number.MAX_SAFE_INTEGER),
      d: timestamp(v.d), mode, seed: int(v.seed, 0, 0xffffffff),
      rulesetId: typeof v.rulesetId === 'string' && v.rulesetId.length <= 32 ? v.rulesetId : (legacy ? 'legacy-v04' : mode + '-v1'),
      shipId: id(v.shipId, SHIP_IDS, legacy ? 'unknown' : 'scout'), loadout: loadout(v.loadout),
      maxCombo: int(v.maxCombo, 0, 1000000)
    };
  }
  function normalizeScore(v, legacy) {
    v = object(v) ? v : {};
    const mode = id(v.mode, MODES, 'classic');
    return {
      id: typeof v.id === 'string' && v.id.length <= 64 ? v.id : randomId('score'), name: name(v.name),
      m: int(v.m, 0, Number.MAX_SAFE_INTEGER), t: seconds(v.t, 0), d: timestamp(v.d), mode,
      seed: int(v.seed, 0, 0xffffffff),
      rulesetId: typeof v.rulesetId === 'string' && v.rulesetId.length <= 32 ? v.rulesetId : (legacy ? 'legacy-v04' : mode + '-v1'),
      shipId: id(v.shipId, SHIP_IDS, legacy ? 'unknown' : 'scout'), loadout: loadout(v.loadout),
      source: v.source === 'imported' ? 'imported' : 'local'
    };
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
    const leaderboard = Array.isArray(v.leaderboard) ? v.leaderboard.map(x => normalizeScore(x, legacy)) : [];
    leaderboard.sort((a, b) => b.m - a.m || a.t - b.t || a.d - b.d);
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: { createdAt: timestamp(meta.createdAt), updatedAt: timestamp(meta.updatedAt), migratedFrom: legacy ? 1 : null },
      best: int(v.best, 0, Number.MAX_SAFE_INTEGER), totalMeters: int(v.totalMeters, 0, Number.MAX_SAFE_INTEGER),
      totalRuns: int(v.totalRuns, 0, Number.MAX_SAFE_INTEGER), bestTime: seconds(v.bestTime, 0), crystals: int(v.crystals, 0, Number.MAX_SAFE_INTEGER),
      selectedShip: id(v.selectedShip, SHIP_IDS, base.selectedShip), unlocked: uniqueIds(v.unlocked, SHIP_IDS, ['scout'], SHIP_IDS.length),
      achievements: uniqueIds(v.achievements, ACHIEVEMENT_IDS, [], 100),
      history, streak: int(v.streak, 0, Number.MAX_SAFE_INTEGER), maxStreak: int(v.maxStreak, 0, Number.MAX_SAFE_INTEGER),
      leaderboard: leaderboard.slice(0, MAX_LEADERBOARD), playerName: name(v.playerName), shipSkins: skins,
      upgrades: loadout(v.upgrades), settings: {
        sound: typeof settings.sound === 'boolean' ? settings.sound : base.settings.sound,
        music: typeof settings.music === 'boolean' ? settings.music : base.settings.music,
        particles: typeof settings.particles === 'boolean' ? settings.particles : base.settings.particles,
        lang: ['pt', 'en', 'es'].includes(settings.lang) ? settings.lang : null,
        reduceMotion: typeof settings.reduceMotion === 'boolean' ? settings.reduceMotion : base.settings.reduceMotion,
        highContrast: typeof settings.highContrast === 'boolean' ? settings.highContrast : base.settings.highContrast,
        theme: id(settings.theme, THEMES, base.settings.theme),
        performanceMode: typeof settings.performanceMode === 'boolean' ? settings.performanceMode : base.settings.performanceMode
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

  return {
    UPGRADE_MAX, UPGRADE_STEP, SCHEMA_VERSION, KEY,
    get: () => clone(data), getSnapshot: () => clone(data), getBest: () => data.best,
    getSettings: () => clone(data.settings), getHistory: () => clone(data.history),
    getLeaderboard: (filter) => clone(filter ? data.leaderboard.filter(filter) : data.leaderboard),
    getLastError: () => lastError,
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
    getPlayerName: () => data.playerName, setPlayerName(value) { return commit(next => { next.playerName = name(value); }); },
    recordLeaderboard(meters, time, context) {
      const entry = scoreInput(meters, time, Object.assign({ name: data.playerName, shipId: data.selectedShip, loadout: currentLoadout() }, context || {}));
      let index = -1; const ok = commit(next => { next.leaderboard.push(entry); next.leaderboard.sort((a, b) => b.m - a.m || a.t - b.t || a.d - b.d); next.leaderboard.length = Math.min(next.leaderboard.length, MAX_LEADERBOARD); index = next.leaderboard.findIndex(x => x.id === entry.id); });
      return ok ? index : -1;
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
        unlocks.forEach(ship => { if (!next.unlocked.includes(ship.id) && next.totalMeters >= ship.unlockAt) { next.unlocked.push(ship.id); res.newUnlocks.push(ship.id); } });
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
