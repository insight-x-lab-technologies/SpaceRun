/* Persistência local (progresso do jogador) */
const Storage = (() => {
  const KEY = 'spacerun.save.v1';

  const defaults = {
    best: 0,             // melhor distância (m)
    totalMeters: 0,      // metros acumulados (para desbloqueios)
    totalRuns: 0,        // quantas partidas foram jogadas
    bestTime: 0,         // tempo (s) da partida de melhor distância
    crystals: 0,         // cristais acumulados (moeda virtual, só progressão)
    selectedShip: 'scout',
    unlocked: ['scout'],
    achievements: [],    // ids de conquistas desbloqueadas
    history: [],         // últimas partidas: {m, t, c, d} (timestamp)
    streak: 0,           // sequência atual de recordes
    maxStreak: 0,        // maior sequência de recordes
    leaderboard: [],     // Top 10: {name, m, t, d}
    playerName: '',      // nome opcional para o ranking
    shipSkins: {},       // id -> {color, accent} (customização procedural)
    upgrades: { agility: 0, thrust: 0 }, // níveis de upgrade (0..MAX)
    settings: { sound: true, music: true, particles: true, lang: null,
                reduceMotion: false, highContrast: false, theme: 'neon' }
  };

  const UPGRADE_MAX = 10;
  const UPGRADE_STEP = 0.02;      // +2% por nível
  const UPGRADE_BASE_COST = 30;   // cristais do nível 1

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaults);
      const parsed = JSON.parse(raw);
      return Object.assign(structuredClone(defaults), parsed, {
        settings: Object.assign({}, defaults.settings, parsed.settings || {}),
        unlocked: Array.isArray(parsed.unlocked) && parsed.unlocked.length
          ? parsed.unlocked : ['scout'],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        history: Array.isArray(parsed.history) ? parsed.history : [],
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
        shipSkins: (parsed.shipSkins && typeof parsed.shipSkins === 'object') ? parsed.shipSkins : {},
        upgrades: Object.assign({}, defaults.upgrades, parsed.upgrades || {})
      });
    } catch (e) {
      return structuredClone(defaults);
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  return {
    get: () => data,
    getBest: () => data.best,
    getSettings: () => data.settings,

    setSetting(key, value) { data.settings[key] = value; save(); },

    setSelectedShip(id) { data.selectedShip = id; save(); },

    unlock(id) {
      if (!data.unlocked.includes(id)) { data.unlocked.push(id); save(); return true; }
      return false;
    },
    isUnlocked(id) { return data.unlocked.includes(id); },

    /* ---------- Conquistas ---------- */
    getAchievements: () => data.achievements.slice(),
    hasAchievement: (id) => data.achievements.includes(id),
    unlockAchievement(id) {
      if (!data.achievements.includes(id)) { data.achievements.push(id); save(); return true; }
      return false;
    },

    /* ---------- Skins (customização procedural) ---------- */
    getShipSkin(id) {
      const s = data.shipSkins[id];
      return (s && s.color && s.accent) ? { color: s.color, accent: s.accent } : null;
    },
    setShipSkin(id, color, accent) {
      data.shipSkins[id] = { color, accent }; save();
    },
    resetShipSkin(id) {
      delete data.shipSkins[id]; save();
    },

    /* ---------- Upgrades com cristais ---------- */
    UPGRADE_MAX,
    UPGRADE_STEP,
    getUpgradeLevel(stat) { return data.upgrades[stat] || 0; },
    getUpgradeMult(stat) { return 1 + UPGRADE_STEP * (data.upgrades[stat] || 0); },
    getUpgradeCost(stat) {
      const lvl = data.upgrades[stat] || 0;
      if (lvl >= UPGRADE_MAX) return null;
      return UPGRADE_BASE_COST * (lvl + 1);
    },
    buyUpgrade(stat) {
      const lvl = data.upgrades[stat] || 0;
      if (lvl >= UPGRADE_MAX) return false;
      const cost = UPGRADE_BASE_COST * (lvl + 1);
      if (data.crystals < cost) return false;
      data.crystals -= cost;
      data.upgrades[stat] = lvl + 1;
      save();
      return true;
    },

    /* ---------- Leaderboard local ---------- */
    getLeaderboard: () => data.leaderboard.slice(),
    getPlayerName: () => data.playerName,
    setPlayerName(name) {
      data.playerName = (name || '').toString().slice(0, 16).trim();
      save();
    },
    recordLeaderboard(meters, time) {
      const entry = {
        name: data.playerName || '',
        m: Math.floor(meters),
        t: Math.round((time || 0) * 10) / 10,
        d: Date.now()
      };
      data.leaderboard.push(entry);
      data.leaderboard.sort((a, b) => b.m - a.m);
      if (data.leaderboard.length > 10) data.leaderboard.length = 10;
      save();
      return data.leaderboard.indexOf(entry);
    },

    /* Registra uma partida. Retorna {isBest, newUnlocks:[shipId...]} */
    recordRun(meters, time, crystals) {
      const res = { isBest: false, newUnlocks: [] };
      data.totalRuns += 1;
      data.totalMeters += meters;
      if (typeof crystals === 'number' && isFinite(crystals)) data.crystals += crystals;
      if (meters > data.best) {
        data.best = meters; res.isBest = true;
      }
      // Best Time = maior tempo de voo já sobrevivido (independente da distância)
      if (typeof time === 'number' && isFinite(time) && time > data.bestTime) {
        data.bestTime = time;
      }

      // Sequência de recordes (streak)
      if (res.isBest) data.streak += 1; else data.streak = 0;
      if (data.streak > data.maxStreak) data.maxStreak = data.streak;

      // Histórico (mantém as últimas 50)
      data.history.push({ m: Math.floor(meters), t: Math.round(time * 10) / 10,
        c: Math.floor(crystals || 0), d: Date.now() });
      if (data.history.length > 50) data.history.shift();

      Ships.list.forEach(s => {
        if (!data.unlocked.includes(s.id) && data.totalMeters >= s.unlockAt) {
          if (Storage.unlock(s.id)) res.newUnlocks.push(s.id);
        }
      });
      save();
      return res;
    },

    reset() {
      data = structuredClone(defaults);
      save();
    }
  };
})();
