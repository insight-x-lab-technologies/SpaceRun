/* Conquistas (Fase 3) — definições + checagem, persistidas em Storage */
const Achievements = (() => {
  /*
    Cada conquista: { id, nameKey, descKey, chk(ctx) }
    ctx (construído pelo Game):
      { meters, time, runCrystals, maxCombo, runs, unlockedCount, daily }
  */
  const defs = [
    { id: 'first_flight',  nameKey: 'ach.first_flight.name',  descKey: 'ach.first_flight.desc',
      chk: c => c.runs >= 1 },
    { id: 'dist_5k',       nameKey: 'ach.dist_5k.name',       descKey: 'ach.dist_5k.desc',
      chk: c => c.meters >= 5000 },
    { id: 'dist_10k',      nameKey: 'ach.dist_10k.name',      descKey: 'ach.dist_10k.desc',
      chk: c => c.meters >= 10000 },
    { id: 'dist_25k',      nameKey: 'ach.dist_25k.name',      descKey: 'ach.dist_25k.desc',
      chk: c => c.meters >= 25000 },
    { id: 'dist_100k',     nameKey: 'ach.dist_100k.name',     descKey: 'ach.dist_100k.desc',
      chk: c => c.meters >= 100000 },
    { id: 'crystals_25',   nameKey: 'ach.crystals_25.name',   descKey: 'ach.crystals_25.desc',
      chk: c => c.runCrystals >= 25 },
    { id: 'crystals_100',  nameKey: 'ach.crystals_100.name',  descKey: 'ach.crystals_100.desc',
      chk: c => c.runCrystals >= 100 },
    { id: 'combo_10',      nameKey: 'ach.combo_10.name',      descKey: 'ach.combo_10.desc',
      chk: c => c.maxCombo >= 10 },
    { id: 'time_2min',     nameKey: 'ach.time_2min.name',     descKey: 'ach.time_2min.desc',
      chk: c => c.time >= 120 },
    { id: 'time_5min',     nameKey: 'ach.time_5min.name',     descKey: 'ach.time_5min.desc',
      chk: c => c.time >= 300 },
    { id: 'fleet',         nameKey: 'ach.fleet.name',         descKey: 'ach.fleet.desc',
      chk: c => c.unlockedCount >= Ships.list.length },
    { id: 'streak_3',      nameKey: 'ach.streak_3.name',      descKey: 'ach.streak_3.desc',
      chk: c => c.maxStreak >= 3 },
    { id: 'daily_first',   nameKey: 'ach.daily_first.name',   descKey: 'ach.daily_first.desc',
      chk: c => c.daily === true }
  ];

  const byId = {};
  defs.forEach(d => byId[d.id] = d);

  /* Checa o contexto; desbloqueia novas e retorna os ids recém-desbloqueados */
  function check(ctx) {
    const newly = [];
    for (const d of defs) {
      if (Storage.hasAchievement(d.id)) continue;
      try { if (d.chk(ctx)) { Storage.unlockAchievement(d.id); newly.push(d.id); } }
      catch (e) {}
    }
    return newly;
  }

  function isUnlocked(id) { return Storage.hasAchievement(id); }
  function getName(id) { return I18n.t(byId[id] ? byId[id].nameKey : id); }
  function getDesc(id) { return I18n.t(byId[id] ? byId[id].descKey : id); }
  function all() { return defs.slice(); }

  return { defs, all, check, isUnlocked, getName, getDesc };
})();
