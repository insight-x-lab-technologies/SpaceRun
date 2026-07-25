/* Power-ups durante a run: definições declarativas, sem DOM ou persistência. */
const PowerUps = (() => {
  const list = Object.freeze([
    Object.freeze({ id: 'magnet', duration: 5, color: '#7cf5ff', symbol: '✦' }),
    Object.freeze({ id: 'doubleCrystals', duration: 8, color: '#ffd84a', symbol: '2×' }),
    Object.freeze({ id: 'shield', duration: 0, color: '#86c8ff', symbol: '◉' })
  ]);
  const byId = Object.fromEntries(list.map(def => [def.id, def]));

  function get(id) { return byId[id] || null; }
  function pick(random) {
    const index = Math.min(list.length - 1, Math.floor(random() * list.length));
    return list[index];
  }

  return { list, get, pick, isKnown: id => !!get(id) };
})();
