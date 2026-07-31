/* Eventos sazonais locais e seeds curadas (Fase 10).
   Não há rede, autoridade remota nem estado persistido: o calendário altera
   somente a apresentação e a música procedural da run. */
const Events = (() => {
  const seasons = [
    {
      id: 'starlight', start: [6, 29], end: [7, 4],
      palette: { bgTop: '#06172c', bgMid: '#0b3150', bgBottom: '#020b1a', terrainA: '#102b51', terrainB: '#1f5a7c', terrainC: '#081a36', accent: '#78f6ff', star: '#fff0b5', nearStar: '#d7fbff', asteroid: '#416f9b', asteroidStroke: '#b8f8ff', nebula: ['#176a92', '#0b274a'] },
      music: { seq: [293.66, 369.99, 440, 587.33, 440, 369.99, 523.25, 659.25], wave: 'sine', drone: 146.83, tempo: 0.29 }
    },
    {
      id: 'halloween', start: [9, 24], end: [10, 2],
      palette: { bgTop: '#170713', bgMid: '#3b130e', bgBottom: '#08030b', terrainA: '#34101e', terrainB: '#7a2d1b', terrainC: '#1a0713', accent: '#ff9b38', star: '#ffd18a', nearStar: '#ffb45e', asteroid: '#d35c27', asteroidStroke: '#ffd05e', nebula: ['#7a1f21', '#2d0a21'] },
      music: { seq: [146.83, 174.61, 207.65, 174.61, 233.08, 207.65, 174.61, 138.59], wave: 'triangle', drone: 73.42, tempo: 0.36 }
    },
    {
      id: 'newyear', start: [11, 29], end: [0, 5],
      palette: { bgTop: '#0a1235', bgMid: '#21134b', bgBottom: '#07051d', terrainA: '#1d2762', terrainB: '#653992', terrainC: '#130e3d', accent: '#ffdf6e', star: '#fff6c6', nearStar: '#f5e7ff', asteroid: '#7c5bb2', asteroidStroke: '#ffe476', nebula: ['#613f96', '#1d1749'] },
      music: { seq: [261.63, 329.63, 392, 523.25, 659.25, 523.25, 392, 329.63], wave: 'triangle', drone: 130.81, tempo: 0.25 }
    }
  ];
  const gallery = [
    { id: 'cometRelay', seed: 319240581, event: 'starlight' },
    { id: 'amberDrift', seed: 1204587312, event: 'halloween' },
    { id: 'midnightArc', seed: 3289067510, event: 'newyear' }
  ];

  function clone(value) { return value ? JSON.parse(JSON.stringify(value)) : null; }
  function validDate(value) { return value instanceof Date && Number.isFinite(value.getTime()); }
  function dayIndex(month, day) { return month * 32 + day; }
  function includes(season, date) {
    if (!validDate(date)) return false;
    const point = dayIndex(date.getMonth(), date.getDate());
    const start = dayIndex(season.start[0], season.start[1]);
    const end = dayIndex(season.end[0], season.end[1]);
    return start <= end ? point >= start && point <= end : point >= start || point <= end;
  }
  function current(date) { return clone(seasons.find(season => includes(season, date || new Date())) || null); }
  function get(id) { return clone(seasons.find(season => season.id === id) || null); }
  function listSeeds() { return gallery.map(clone); }
  function getSeed(id) { return clone(gallery.find(seed => seed.id === id) || null); }

  return { current, get, listSeeds, getSeed };
})();
