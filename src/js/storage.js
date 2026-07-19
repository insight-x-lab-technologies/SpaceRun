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
    settings: { sound: true, music: false, particles: true, lang: null,
                reduceMotion: false, highContrast: false }
  };

  let data = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(defaults);
      const parsed = JSON.parse(raw);
      return Object.assign(structuredClone(defaults), parsed, {
        settings: Object.assign({}, defaults.settings, parsed.settings || {}),
        unlocked: Array.isArray(parsed.unlocked) && parsed.unlocked.length
          ? parsed.unlocked : ['scout']
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
