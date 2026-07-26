/* Retenção F4B: missões locais, determinísticas por calendário e sem bloquear a run. */
const Missions = (() => {
  const DAILY = [
    { id: 'runs', target: 2, reward: 30 }, { id: 'meters', target: 1500, reward: 45 },
    { id: 'crystals', target: 12, reward: 35 }, { id: 'seconds', target: 45, reward: 40 }
  ];
  const WEEKLY = [
    { id: 'runs', target: 10, reward: 150 }, { id: 'meters', target: 20000, reward: 250 },
    { id: 'crystals', target: 120, reward: 180 }, { id: 'daily', target: 2, reward: 100 }, { id: 'best', target: 3000, reward: 160 }
  ];
  function hash(s) { let n = 2166136261; for (let i = 0; i < s.length; i++) n = Math.imul(n ^ s.charCodeAt(i), 16777619); return n >>> 0; }
  function daily(date) {
    const key = date || Storage.getRetention().daily.date || '1970-01-01'; const start = hash(key) % DAILY.length;
    return [0, 1, 2].map(i => DAILY[(start + i) % DAILY.length]);
  }
  function weekly() { return WEEKLY.slice(); }
  function status(def, progress) { const value = Math.min(def.target, (progress && progress[def.id]) || 0); return Object.assign({}, def, { value, complete: value >= def.target }); }
  function snapshot() { const r = Storage.getRetention(); return { daily: daily(r.daily.date).map(d => status(d, r.daily.progress)), weekly: weekly().map(d => status(d, r.weekly.progress)), profile: Storage.getProfile(), loginStreak: r.loginStreak }; }
  return { snapshot, daily, weekly };
})();
