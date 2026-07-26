/* Motor do jogo: canvas, parallax 3 planos, física, terreno e obstáculos */
const Game = (() => {
  let canvas, ctx, W = 0, H = 0, dpr = 1;
  let resizeFrame = null, resizeTimer = null, resizeObserver = null;
  let raf = null, lastT = 0, acc = 0;
  const FIXED_DT = 1 / 60;   // passo de simulação fixo (determinismo p/ Daily Run)
  let state = 'idle';        // idle | ready | playing | paused | over
  let onOverCb = null;
  let onStateCb = null;

  let world = { scroll: 0, speed: 60, meters: 0, difficulty: 0 };
  let ship = null;
  let stars = [], nearStars = [], nebulae = [];
  let obstacles = [], particles = [], pickups = [], boss = null;
  let crashAnim = 0;
  let recordSpawns = false;   // seam de teste: registra a assinatura de spawn (Daily Run)

  let shake = 0;          // magnitude do screen shake (decai)
  let freeze = 0;         // hitstop (congelamento micro no impacto)
  let runTime = 0;        // tempo de voo da partida atual (s)
  let wasThrusting = false;

  let nextMilestone = 1000, milestoneIdx = 0;
  let starColor = '#cfe8ff';
  let accentColor = '#4af0ff';
  let biomeIdx = -1;
  const MILESTONES = [1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];
  const BIOMES = [
    { star: '#cfe8ff', accent: '#4af0ff', nebula: ['#3a1d6e', '#0a0430'] },
    { star: '#bff7ff', accent: '#4af0ff', nebula: ['#0b3a4a', '#04101f'] },
    { star: '#ffe6b0', accent: '#ffb24a', nebula: ['#4a2e10', '#1a0a02'] },
    { star: '#ffd0f0', accent: '#ff4ad8', nebula: ['#4a1450', '#0a0320'] },
    { star: '#c8ffd8', accent: '#5effa0', nebula: ['#144a2e', '#021a0a'] }
  ];

  // Power-ups alteram o universo lógico; resultados v1 permanecem históricos.
  const RULESET = { classic: 'classic-v2', daily: 'daily-v2', zen: 'zen-v1', sprint: 'sprint-v1', hardcore: 'hardcore-v1', marathon: 'marathon-v1', timeattack: 'timeattack-v1', bossrush: 'bossrush-v1' };
  const MODE = {
    classic: { id: 'classic', rulesetId: RULESET.classic },
    daily: { id: 'daily', rulesetId: RULESET.daily, daily: true },
    zen: { id: 'zen', rulesetId: RULESET.zen, noCollision: true, wideTerrain: true, calmMusic: true },
    sprint: { id: 'sprint', rulesetId: RULESET.sprint, duration: 60 },
    hardcore: { id: 'hardcore', rulesetId: RULESET.hardcore, noPowerups: true, narrowTerrain: true, oneLife: true },
    marathon: { id: 'marathon', rulesetId: RULESET.marathon, targetMeters: 10000 },
    timeattack: { id: 'timeattack', rulesetId: RULESET.timeattack, targetMeters: 3000, duration: 90 },
    bossrush: { id: 'bossrush', rulesetId: RULESET.bossrush, bossRush: true }
  };
  let settings = { particles: true, performanceMode: false, haptics: false, reduceMotion: false };
  let cosmetics = { trail: 'ion', explosion: 'nova', title: 'cadet' };

  function resize() {
    // No Safari/iOS, `orientationchange` pode ocorrer antes de o layout final
    // estar disponível. Ler o retângulo renderizado (em vez dos atributos do
    // canvas) impede que um buffer de portrait seja esticado em landscape.
    const rect = canvas.getBoundingClientRect();
    const nextW = Math.round(rect.width || canvas.clientWidth || window.innerWidth || 0);
    const nextH = Math.round(rect.height || canvas.clientHeight || window.innerHeight || 0);
    if (nextW <= 0 || nextH <= 0) return;
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
    const backingW = Math.floor(nextW * nextDpr);
    const backingH = Math.floor(nextH * nextDpr);
    const changed = W !== nextW || H !== nextH || dpr !== nextDpr;
    W = nextW;
    H = nextH;
    dpr = nextDpr;
    if (!changed) return;
    canvas.width = backingW;
    canvas.height = backingH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStarfield();
    layoutShip();   // mantém a nave proporcional/posicionada após rotação/resize
  }

  // Releitura imediata + duas frames + pequeno atraso cobre a janela em que o
  // Safari atualiza a viewport depois de emitir `orientationchange`.
  function scheduleResize() {
    resize();
    if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        resize();
      });
    });
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      resize();
    }, 250);
  }

  function buildStarfield() {
    stars = [];
    nearStars = [];
    nebulae = [];
    const perf = Storage.getSettings().performanceMode;
    const starCount = Math.floor((W * H) / (perf ? 10000 : 6000));
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        f: 0.12 + Math.random() * 0.18,
        tw: Math.random() * Math.PI * 2
      });
    }
    const nearCount = Math.floor((W * H) / (perf ? 52000 : 26000));
    for (let i = 0; i < nearCount; i++) {
      nearStars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 2.2 + 1.2,
        f: 0.45 + Math.random() * 0.3,
        tw: Math.random() * Math.PI * 2
      });
    }
    const nebCount = perf ? 0 : 5;
    const palette = [['#3a1d6e', '#0a0430'], ['#08304a', '#04101f'], ['#4a1450', '#0a0320']];
    for (let i = 0; i < nebCount; i++) {
      nebulae.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.max(W, H) * (0.25 + Math.random() * 0.25),
        f: 0.3 + Math.random() * 0.12,
        c: palette[i % palette.length]
      });
    }
  }

  function init(canvasEl, onOver, onState) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    onOverCb = onOver;
    onStateCb = onState;
    Input.init();
    // primeiro input (espaço/toque) inicia o jogo a partir do estado "ready"
    Input.on('start', () => { if (state === 'ready') setState('playing'); });
    // tecla Shift (desktop) ou botão dedicado (toque) dispara a habilidade (Fase 2)
    Input.on('ability', tryAbility);
    resize();
    window.addEventListener('resize', scheduleResize);
    window.addEventListener('orientationchange', scheduleResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleResize);
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleResize);
      resizeObserver.observe(canvas);
    }
    lastT = performance.now();
    loop(lastT);
  }

  function setState(s) {
    if (state === s) return;
    state = s;
    if (onStateCb) onStateCb(s);
  }

  /* RNG determinístico (para Daily Run / Seed reproduzível) */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function dailySeed() {
    const d = new Date();
    return (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) >>> 0;
  }
  function rnd() { return world.rng ? world.rng() : Math.random(); }

  function applyBiome(idx) {
    const b = BIOMES[((idx % BIOMES.length) + BIOMES.length) % BIOMES.length];
    biomeIdx = idx;
    starColor = b.star;
    accentColor = b.accent;
    for (const n of nebulae) n.c = b.nebula;
  }

  function buildWorld(seed, mode) {
    const modeDef = MODE[mode] || MODE.classic;
    const s = Ships.get(Storage.get().selectedShip);
    world = {
      scroll: 0, speed: 220, meters: 0, difficulty: 0,
      crystals: 0, combo: 0, comboTimer: 0, maxCombo: 0,
      slowmoTimer: 0, magnetTimer: 0, doubleCrystalsTimer: 0, wf: 1,
      seed: seed || 0, mode: modeDef.id, daily: !!modeDef.daily, rulesetId: modeDef.rulesetId, rng: null, accent: '#4af0ff',
      noCollision: !!modeDef.noCollision, noPowerups: !!modeDef.noPowerups, wideTerrain: !!modeDef.wideTerrain,
      narrowTerrain: !!modeDef.narrowTerrain, oneLife: !!modeDef.oneLife, calmMusic: !!modeDef.calmMusic,
      remaining: modeDef.duration || 0, targetMeters: modeDef.targetMeters || 0, bossRush: !!modeDef.bossRush, nextBossDist: 2000,
      nextSpawnDist: 16, nextPickupDist: 40, nextPowerupDist: 120, powerupsUsed: [], spawnSig: []
    };
    if (seed) world.rng = mulberry32(seed >>> 0);
    ship = {
      x: Math.max(80, W * 0.22),
      y: H * 0.5,
      vy: 0,
      w: 46 * s.stats.size,
      h: 26 * s.stats.size,
      ship: s,
      tilt: 0,
      ability: modeDef.oneLife && s.ability === 'shield' ? null : (s.ability || null),
      abilityCd: 1.5,          // pequeno cooldown inicial p/ evitar disparo acidental
      dashTimer: 0,
      shield: false,
      invuln: 0,
      nearHapticCooldown: 0
    };
    const skin = Ships.getSkin(s.id);
    ship.color = skin.color;
    ship.accent = skin.accent;
    layoutShip();
    obstacles = [];
    particles = [];
    pickups = [];
    boss = null;
    world.nextSpawnDist = 16;
    world.nextPickupDist = 40;
    world.nextPowerupDist = 120;
    world.powerupsUsed = [];
    world.spawnSig = [];
    crashAnim = 0;
    shake = 0;
    freeze = 0;
    runTime = 0;
    wasThrusting = false;
    nextMilestone = 1000;
    milestoneIdx = 0;
    biomeIdx = -1;
    world.maxCombo = 0;
    applyBiome(0);
  }

  // Reposiciona/reescala a nave conforme o viewport atual (rotação, resize).
  // A nave escala com H para manter a proporção com o túnel (que também usa H),
  // evitando que ela pareça "de tamanho diferente" entre portrait e landscape.
  function layoutShip() {
    if (!ship) return;
    const scale = H / 600;
    const sz = (ship.ship && ship.ship.stats.size) || 1;
    ship.w = 46 * sz * scale;
    ship.h = 26 * sz * scale;
    ship.x = Math.max(80, W * 0.22);
    const halfH = ship.h * 0.5;
    if (ship.y < halfH) ship.y = halfH;
    else if (ship.y > H - halfH) ship.y = H - halfH;
  }

  function start(mode) {
    settings = Storage.getSettings();
    cosmetics = Storage.getCosmetics();
    const selectedMode = MODE[mode] && Storage.isModeUnlocked(mode) ? mode : 'classic';
    const seed = selectedMode === 'daily' ? dailySeed() : (Math.random() * 0xffffffff) >>> 0;
    buildWorld(seed, selectedMode);
    setState('ready');   // começa pausado, aguardando input do jogador
    lastT = performance.now();
    acc = 0;
  }
  function pause() { if (state === 'playing') setState('paused'); }
  function resume() { if (state === 'paused') { setState('playing'); lastT = performance.now(); acc = 0; } }
  function isPaused() { return state === 'paused'; }
  function stop() { setState('idle'); }

  function terrain(wx) {
    const diff = world.difficulty;
    const mid = H * 0.5;
    if (world.wideTerrain) {
      // Zen mantém uma abertura constante e generosa: a oscilação move o
      // corredor inteiro, mas nunca o estreita.
      const sway = Math.sin(wx * 0.008) * H * 0.025 + Math.sin(wx * 0.017 + 1.1) * H * 0.012;
      return { top: H * 0.09 + sway, bot: H * 0.91 + sway, mid: mid + sway, amp: H * 0.037 };
    }
    // começa bem aberto e estreita com a distância (rampa mais suave)
    let gap;
    if (world.narrowTerrain) gap = H * 0.58 - diff * H * 0.03;
    else gap = H * 0.78 - diff * H * 0.05;
    gap = Math.max(world.narrowTerrain ? H * 0.30 : H * 0.34, gap);
    // variação pequena no início, cresce com o progresso
    const amp = gap * (0.1 + Math.min(diff * 0.005, 0.22));
    const top = mid - gap * 0.5
      + Math.sin(wx * 0.010) * gap * 0.22
      + Math.sin(wx * 0.023 + 1.3) * gap * 0.12;
    const bot = mid + gap * 0.5
      + Math.sin(wx * 0.011 + 2.1) * gap * 0.22
      + Math.sin(wx * 0.021 + 0.7) * gap * 0.12;
    return { top, bot, mid, amp };
  }

  function spawnAsteroid(x) {
    if (world.daily) {
      const r = H * (0.020 + rnd() * 0.030 + world.difficulty * 0.0005);
      const y = H * (0.20 + rnd() * 0.60);
      obstacles.push({ type: 'asteroid', x, y, r, rot: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 2, seed: rnd() * 1000 });
      return;
    }
    const t = terrain(x + world.scroll);
    const r = 12 + rnd() * 18 + world.difficulty * 0.3;
    const minY = t.top + r + 6;
    const maxY = t.bot - r - 6;
    if (maxY <= minY) return;
    const y = minY + rnd() * (maxY - minY);
    obstacles.push({ type: 'asteroid', x, y, r,
      rot: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 2, seed: rnd() * 1000 });
  }

  function spawnDebris(x) {
    if (world.daily) {
      const n = 3 + Math.floor(rnd() * 3); const base = 0.22 + rnd() * 0.56;
      for (let i = 0; i < n; i++) {
        const r = H * (0.010 + rnd() * 0.012); const y = H * Math.max(0.14, Math.min(0.86, base + (i - n / 2) * (0.04 + rnd() * 0.02)));
        obstacles.push({ type: 'asteroid', x: x + (rnd() - 0.5) * 40, y, r, rot: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 2, seed: rnd() * 1000 });
      }
      return;
    }
    const t = terrain(x + world.scroll);
    const n = 3 + Math.floor(rnd() * 3);
    const base = t.top + rnd() * (t.bot - t.top);
    for (let i = 0; i < n; i++) {
      const r = 6 + rnd() * 7;
      const y = Math.max(t.top + r + 4, Math.min(t.bot - r - 4, base + (i - n / 2) * (18 + rnd() * 10)));
      obstacles.push({ type: 'asteroid', x: x + (rnd() - 0.5) * 40, y, r,
        rot: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 2, seed: rnd() * 1000 });
    }
  }

  function spawnBlackHole(x) {
    if (world.daily) {
      const y = H * (0.22 + rnd() * 0.56); const r = H * (0.025 + rnd() * 0.014);
      obstacles.push({ type: 'blackhole', x, y, r, pull: 1500 + world.difficulty * 30, ring: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 1.5 });
      return;
    }
    const t = terrain(x + world.scroll);
    const y = t.top + rnd() * (t.bot - t.top);
    const r = 15 + rnd() * 8;
    obstacles.push({ type: 'blackhole', x, y, r, pull: 1500 + world.difficulty * 30,
      ring: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 1.5 });
  }

  function spawnLaser(x) {
    if (world.daily) {
      const gapH = H * Math.max(0.12, 0.34 - Math.min(world.difficulty * 0.004, 0.12));
      const gapY = H * (0.14 + gapH / H / 2 + rnd() * (0.72 - gapH / H));
      obstacles.push({ type: 'laser', x, w: H * 0.023, gapY, gapH, on: true, onDur: 1.0 + rnd() * 0.4, offDur: 0.8 + rnd() * 0.4, timer: 1.0 + rnd() * 0.4 });
      return;
    }
    const t = terrain(x + world.scroll);
    const gapH = Math.max(70, (t.bot - t.top) * (0.34 - Math.min(world.difficulty * 0.004, 0.12)));
    const gapY = t.top + gapH / 2 + rnd() * (t.bot - t.top - gapH);
    obstacles.push({ type: 'laser', x, w: 14, gapY, gapH,
      on: true, onDur: 1.0 + rnd() * 0.4, offDur: 0.8 + rnd() * 0.4, timer: 1.0 + rnd() * 0.4 });
  }

  function spawnObstacle() {
    const diff = world.difficulty;
    const x = W + 40;
    const roll = rnd();
    if (diff > 1.2 && roll < 0.20) spawnBlackHole(x);
    else if (diff > 0.8 && roll < 0.40) spawnLaser(x);
    else if (diff > 0.5 && roll < 0.55) spawnDebris(x);
    else spawnAsteroid(x);
    if (recordSpawns) {
      const o = obstacles[obstacles.length - 1];
      if (o) {
        const normalizedY = Math.round((o.y || o.gapY || 0) / H * 1000000);
        const normalizedSize = Math.round((o.r || o.gapH || 0) / H * 1000000);
        world.spawnSig.push({ distanceIndex: Math.round(world.meters * 10), entityType: o.type, normalizedY, normalizedSize, variant: o.type, rulesetId: world.rulesetId, type: o.type, y: normalizedY, r: normalizedSize, m: Math.round(world.meters) });
      }
    }
  }

  function spawnPickup() {
    const x = W + 30;
    if (world.daily) {
      const y = H * (0.22 + rnd() * 0.56); const r = H * (0.015 + rnd() * 0.005);
      pickups.push({ kind: 'crystal', x, y, r, spin: Math.random() * Math.PI * 2, ph: Math.random() * Math.PI * 2 });
      if (recordSpawns) world.spawnSig.push({ distanceIndex: Math.round(world.meters * 10), entityType: 'crystal', normalizedY: Math.round(y / H * 1000000), normalizedSize: Math.round(r / H * 1000000), variant: 'crystal', rulesetId: world.rulesetId, type: 'crystal', y: Math.round(y / H * 1000000), m: Math.round(world.meters) });
      return;
    }
    const t = terrain(x + world.scroll);
    const margin = 44;
    const span = (t.bot - t.top) - margin * 2;
    if (span <= 0) return;
    const y = t.top + margin + rnd() * span;
    pickups.push({ kind: 'crystal', x, y, r: 9 + rnd() * 3, spin: Math.random() * Math.PI * 2, ph: Math.random() * Math.PI * 2 });
    if (recordSpawns) world.spawnSig.push({ distanceIndex: Math.round(world.meters * 10), entityType: 'crystal', normalizedY: Math.round(y / H * 1000000), normalizedSize: Math.round(pickups[pickups.length - 1].r / H * 1000000), variant: 'crystal', rulesetId: world.rulesetId, type: 'crystal', y: Math.round(y / H * 1000000), m: Math.round(world.meters) });
  }

  function recordPowerupSpawn(p) {
    if (!recordSpawns) return;
    world.spawnSig.push({ distanceIndex: Math.round(world.meters * 10), entityType: 'powerup',
      normalizedY: Math.round(p.y / H * 1000000), normalizedSize: Math.round(p.r / H * 1000000),
      variant: p.powerup, rulesetId: world.rulesetId, type: 'powerup', y: Math.round(p.y / H * 1000000),
      m: Math.round(world.meters) });
  }

  function spawnPowerup(type, x, y) {
    if (world.noPowerups) return null;
    const def = PowerUps.get(type || PowerUps.pick(rnd).id);
    if (!def) return null;
    const px = Number.isFinite(x) ? x : W + 38;
    let py = y;
    let r;
    if (world.daily) {
      if (!Number.isFinite(py)) py = H * (0.22 + rnd() * 0.56);
      r = H * 0.020;
    } else {
      const terrainInfo = terrain(px + world.scroll);
      if (!Number.isFinite(py)) py = terrainInfo.top + 42 + rnd() * Math.max(1, terrainInfo.bot - terrainInfo.top - 84);
      r = 13;
    }
    const powerup = { kind: 'powerup', powerup: def.id, x: px, y: py, r, spin: Math.random() * Math.PI * 2 };
    pickups.push(powerup);
    recordPowerupSpawn(powerup);
    return powerup;
  }

  function collectCrystal(p) {
    world.combo += 1;
    world.comboTimer = 3;
    const mult = 1 + Math.floor((world.combo - 1) / 5);
    world.crystals += mult * (world.doubleCrystalsTimer > 0 ? 2 : 1);
    Audio2.pickup();
    vibrate(10);
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 120;
      addParticle(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp,
        0.3 + Math.random() * 0.3, '#ffd84a', 2 + Math.random() * 2);
    }
  }

  function collectPowerup(p) {
    const def = PowerUps.get(p.powerup);
    if (!def) return;
    let applied = false;
    if (def.id === 'magnet') {
      world.magnetTimer = def.duration;
      applied = true;
    } else if (def.id === 'doubleCrystals') {
      world.doubleCrystalsTimer = def.duration;
      applied = true;
    } else if (def.id === 'shield' && !ship.shield) {
      // Nave e pickup compartilham um único escudo: nunca acumulam cargas.
      ship.shield = true;
      applied = true;
    }
    if (!applied) return;
    if (!world.powerupsUsed.includes(def.id)) world.powerupsUsed.push(def.id);
    Audio2.pickup();
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 110;
      addParticle(p.x, p.y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        0.35 + Math.random() * 0.25, def.color, 2 + Math.random() * 2);
    }
  }

  function addParticle(x, y, vx, vy, life, color, size, style) {
    particles.push({ x, y, vx, vy, life, max: life, color, size, style: style || 'dot' });
  }

  function explode(x, y) {
    const style = cosmetics.explosion;
    if (style === 'wave') {
      for (let i = 0; i < 4; i++) addParticle(x, y, 0, 0, 0.65 + i * 0.1, i % 2 ? '#ff4ad8' : '#4af0ff', 18 + i * 12, 'ring');
      return;
    }
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 320;
      const color = style === 'neon' ? (i % 2 ? '#ff4ad8' : '#4af0ff') : (style === 'particles' ? [ship.color, ship.accent, '#ffffff'][i % 3] : (Math.random() > 0.5 ? '#ff7a3c' : '#ffd84a'));
      addParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp,
        0.5 + Math.random() * 0.6, color,
        2 + Math.random() * 3, style === 'particles' && i % 4 === 0 ? 'star' : 'dot');
    }
  }

  function vibrate(pattern) {
    if (settings.haptics && !settings.reduceMotion && navigator.vibrate) navigator.vibrate(pattern);
  }

  function emitTrail() {
    const x = ship.x - ship.w * 0.5;
    const y = ship.y + (Math.random() - 0.5) * ship.h * 0.4;
    if (cosmetics.trail === 'wave') {
      addParticle(x, y, -95 - Math.random() * 80, 0, 0.34, ship.accent, 4 + Math.random() * 2, 'ring');
    } else if (cosmetics.trail === 'stars') {
      addParticle(x, y, -120 - Math.random() * 110, (Math.random() - 0.5) * 50, 0.42, '#ffffff', 3 + Math.random() * 2, 'star');
    } else if (cosmetics.trail === 'flame') {
      addParticle(x, y, -150 - Math.random() * 130, (Math.random() - 0.5) * 65, 0.38, Math.random() > 0.5 ? '#ff7a3c' : '#ffd84a', 3 + Math.random() * 2);
    } else {
      addParticle(x, y, -120 - Math.random() * 120, (Math.random() - 0.5) * 60, 0.3 + Math.random() * 0.3, ship.accent, 2 + Math.random() * 2);
    }
  }

  function explodeShield(x, y) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 160;
      addParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp,
        0.3 + Math.random() * 0.3, '#4af0ff', 1.5 + Math.random() * 2);
    }
  }

  /* ---------- Habilidades (Fase 2) ---------- */
  function tryAbility() {
    if (state !== 'playing' || !ship || !ship.ability) return;
    if (ship.abilityCd > 0) return;
    Audio2.ability();
    if (ship.ability === 'dash') {
      ship.dashTimer = 0.6; ship.abilityCd = 3;
      for (let i = 0; i < 10; i++)
        addParticle(ship.x - ship.w * 0.5, ship.y + (Math.random() - 0.5) * ship.h,
          -200 - Math.random() * 200, (Math.random() - 0.5) * 60, 0.3, ship.accent, 2 + Math.random() * 2);
    } else if (ship.ability === 'shield') {
      ship.shield = true; ship.abilityCd = 6;
    } else if (ship.ability === 'slowmo') {
      world.slowmoTimer = 2; ship.abilityCd = 8;
    }
    vibrate(12);
  }

  /* Colisão mortal respeitando escudo/invulnerabilidade */
  function hit() {
    if (world.noCollision) return;
    if (ship.invuln > 0) return;          // breve invulnerabilidade pós-escudo
    if (ship.shield && !world.oneLife) {
      ship.shield = false;
      ship.invuln = 1.0;
      Audio2.shield();
      explodeShield(ship.x, ship.y);
      vibrate(24);
      if (Storage.getSettings().reduceMotion !== true) shake = Math.max(shake, 6);
      return;
    }
    gameOver();
  }

  /* ---------- Conquistas (Fase 3) ---------- */
  function buildAchCtx() {
    return {
      meters: world.meters,
      time: runTime,
      runCrystals: world.crystals,
      maxCombo: world.combo,
      runs: Storage.get().totalRuns,
      unlockedCount: Storage.get().unlocked.length,
      maxStreak: Storage.get().maxStreak,
      totalMeters: Storage.get().totalMeters,
      daily: world.daily
    };
  }
  function notifyAchievements() {
    if (state !== 'playing') return;
    const newly = Achievements.check(buildAchCtx());
    for (const id of newly) {
      UI.showAchievement(Achievements.getName(id));
      Audio2.unlock();
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    let dt = (t - lastT) / 1000;
    lastT = t;
    if (dt > 0.25) dt = 0.25;   // evita "espiral de morte" em abas inativas
    acc += dt;
    // Passo de simulação fixo: torna o mundo idêntico para qualquer frame rate,
    // o que garante paridade determinística entre partidas do Daily Run.
    while (acc >= FIXED_DT) {
      update(FIXED_DT, t);
      acc -= FIXED_DT;
    }
    render(t);
  }

  function update(dt, t) {
    // hitstop: congela tudo por um instante no impacto (peso)
    if (freeze > 0) {
      freeze -= dt;
      if (shake > 0) shake = Math.max(0, shake - dt * 40);
      return;
    }
    // velocidade do scroll (parallax) - devagar no menu, rápido no jogo
    const scrollSpeed = (state === 'playing') ? world.speed * (world.wf || 1) : 60;
    // O ready só anima o cenário visual; não consome coordenada lógica do Daily.
    if (state === 'playing') world.scroll += scrollSpeed * dt;

    // parallax sempre anima
    for (const s of stars) {
      s.x -= scrollSpeed * s.f * dt;
      s.tw += dt * 3;
      if (s.x < 0) { s.x += W; s.y = Math.random() * H; }
    }
    for (const s of nearStars) {
      s.x -= scrollSpeed * s.f * dt;
      s.tw += dt * 2;
      if (s.x < 0) { s.x += W; s.y = Math.random() * H; }
    }
    for (const n of nebulae) {
      n.x -= scrollSpeed * n.f * dt;
      if (n.x < -n.r) { n.x = W + n.r; n.y = Math.random() * H; }
    }

    if (state === 'playing') { runTime += dt; updateGameplay(dt, t); }
    else if (state === 'ready') {
      // nave flutua suavemente no centro, sem cair
      if (ship) {
        ship.y = H * 0.5 + Math.sin(t * 0.003) * (H * 0.02);
        ship.vy = 0;
        ship.tilt = 0;
      }
    }
    if (state === 'over') {
      crashAnim += dt;
      updateParticles(dt);
    }

    if (shake > 0) shake = Math.max(0, shake - dt * 30);
  }

  function updateGameplay(dt, t) {
    world.difficulty = world.meters / 1200;
    // começa em 220 e acelera com a distância (rampa mais suave)
    world.speed = Math.min(700, 220 + world.difficulty * 58);
    // fatores de habilidade: dash acelera, slowmo desacelera o mundo
    const wf = (world.slowmoTimer > 0 ? 0.4 : 1) * (ship.dashTimer > 0 ? 2.2 : 1);
    world.wf = wf;
    if (ship.dashTimer > 0) ship.dashTimer -= dt;
    if (world.slowmoTimer > 0) world.slowmoTimer -= dt;
    if (world.magnetTimer > 0) world.magnetTimer -= dt;
    if (world.doubleCrystalsTimer > 0) world.doubleCrystalsTimer -= dt;
    if (ship.abilityCd > 0) ship.abilityCd -= dt;
    if (ship.invuln > 0) ship.invuln -= dt;
    world.meters += world.speed * wf * dt * 0.12;
    if (world.combo > world.maxCombo) world.maxCombo = world.combo;

    // bioma por distância (troca de paleta a cada 5000 m)
    const bi = Math.floor(world.meters / 5000);
    if (bi !== biomeIdx) applyBiome(bi);

    // marcos de distância (feed de progresso imediato)
    if (world.meters >= nextMilestone) {
      UI.showMilestone(I18n.t('milestone.reach', { n: nextMilestone }));
      Audio2.unlock();
      milestoneIdx++;
      nextMilestone = MILESTONES[milestoneIdx] || (nextMilestone + 50000);
    }

    // Marathon e Time Attack terminam por objetivo, não por colisão. O modo
    // Time Attack ainda pode falhar quando o cronômetro expira no fim do tick.
    if (world.targetMeters && world.meters >= world.targetMeters) return gameOver('target-complete');

    // física da nave
    const st = ship.ship.stats;
    const gravity = 1150;
    const upAg = Storage.getUpgradeMult('agility');
    const upTh = Storage.getUpgradeMult('thrust');
    const thrust = 2300 * st.agility * upAg * st.thrust * upTh;
    const thrusting = Input.isThrusting();
    if (thrusting) {
      if (!wasThrusting) Audio2.thrust();   // som de empuxo no início do pulso
      ship.vy -= thrust * dt;
      if (settings.particles && Math.random() < 0.8) emitTrail();
    }
    wasThrusting = thrusting;
    ship.vy += gravity * dt;
    ship.vy = Math.max(-520, Math.min(520, ship.vy));
    ship.y += ship.vy * dt;
    ship.tilt = Math.max(-0.5, Math.min(0.5, -ship.vy / 1400));

    // colisão com terreno
    const tInfo = terrain(ship.x + world.scroll);
    const halfH = ship.h * 0.5;
    if (!world.noCollision && (ship.y - halfH < tInfo.top || ship.y + halfH > tInfo.bot)) {
      return hit();
    }
    if (ship.y < halfH) ship.y = halfH;
    if (ship.y > H - halfH) ship.y = H - halfH;

    // faíscas de "quase-colisão" nas bordas do túnel (juiciness)
    ship.nearHapticCooldown = Math.max(0, ship.nearHapticCooldown - dt);
    const margin = 26;
    const dTop = (ship.y - halfH) - tInfo.top;
    const dBot = tInfo.bot - (ship.y + halfH);
    if (settings.particles) {
      if (dTop < margin || dBot < margin) {
        const edgeY = (dTop < dBot ? tInfo.top : tInfo.bot) + (Math.random() - 0.5) * 6;
        const dir = (dTop < dBot) ? 1 : -1;
        for (let i = 0; i < 2; i++) {
          addParticle(ship.x + (Math.random() - 0.5) * ship.w, edgeY,
            (Math.random() - 0.5) * 60, dir * (40 + Math.random() * 70),
            0.22 + Math.random() * 0.18, '#4af0ff', 1.4 + Math.random() * 1.4);
        }
      }
    }
    if ((dTop < margin || dBot < margin) && ship.nearHapticCooldown <= 0) { vibrate(7); ship.nearHapticCooldown = 0.45; }

    // cristais coletáveis + combo
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) world.combo = 0;
    }
    // pickups: spawn dirigido por DISTÂNCIA (determinístico p/ Daily Run)
    if (world.meters >= world.nextPickupDist) {
      spawnPickup();
      world.nextPickupDist += (1.6 + rnd() * 1.8) * world.speed * 0.12;
    }
    if (!world.noPowerups && world.meters >= world.nextPowerupDist) {
      spawnPowerup();
      // Índice por distância: dash/slowmo mudam o tempo de chegada, não a ordem.
      world.nextPowerupDist += (8 + rnd() * 5) * world.speed * 0.12;
    }
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.x -= world.speed * wf * dt;
      p.spin += dt * 3;
      if (p.x + p.r < -20) { pickups.splice(i, 1); continue; }
      if (p.kind === 'crystal' && world.magnetTimer > 0) {
        const dx = ship.x - p.x, dy = ship.y - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const radius = Math.max(150, H * 0.32);
        if (dist < radius) {
          const pull = (1 - dist / radius) * 900;
          p.x += (dx / dist) * pull * dt;
          p.y += (dy / dist) * pull * dt;
        }
      }
      const dx = p.x - ship.x, dy = p.y - ship.y;
      const rr = p.r + ship.w * 0.3;
      if (dx * dx + dy * dy < rr * rr) {
        if (p.kind === 'powerup') collectPowerup(p);
        else collectCrystal(p);
        pickups.splice(i, 1);
      }
    }

    // obstáculos: spawn dirigido por DISTÂNCIA (determinístico p/ Daily Run).
    // Ao indexar pelo metros percorrido (e não por dt/acumulador), o layout do
    // universo fica idêntico entre partidas do mesmo dia, independente do
    // framerate real ou do uso de habilidades (dash/slowmo alteram apenas a
    // velocidade de travessia, não a sequência de obstáculos).
    if (world.meters >= world.nextSpawnDist) {
      spawnObstacle();
      const interval = Math.max(0.5, 2.2 - world.difficulty * 0.18);
      world.nextSpawnDist += interval * world.speed * 0.12 * (0.7 + rnd() * 0.6);
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= world.speed * wf * dt;
      if (o.type === 'asteroid') {
        o.rot += o.spin * dt;
        const dx = o.x - ship.x, dy = o.y - ship.y;
        const rr = o.r + ship.w * 0.32;
        if (!world.noCollision && dx * dx + dy * dy < rr * rr) return hit();
      } else if (o.type === 'blackhole') {
        o.ring += o.spin * dt;
        const dx = o.x - ship.x, dy = o.y - ship.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const well = o.r * 5.5;
        if (dist < well) {
          const f = (1 - dist / well) * o.pull;
          ship.vy += (dy / dist) * f * dt;   // poço de gravidade puxa a nave
        }
        if (!world.noCollision && dist < o.r) return hit();
      } else if (o.type === 'laser') {
        o.timer -= dt;
        if (o.timer <= 0) { o.on = !o.on; o.timer = o.on ? o.onDur : o.offDur; }
        if (o.on) {
          const inX = Math.abs(o.x - ship.x) < (o.w * 0.5 + ship.w * 0.3);
          const inGap = ship.y > o.gapY - o.gapH / 2 && ship.y < o.gapY + o.gapH / 2;
          if (!world.noCollision && inX && !inGap) return hit();
        }
      }
      const margin = (o.type === 'laser') ? o.w * 3 + 20 : (o.r * 3 + 40);
      if (o.x < -margin) obstacles.splice(i, 1);
    }

    updateBoss(dt);

    if (world.remaining > 0) {
      world.remaining = Math.max(0, world.remaining - dt);
      if (world.remaining === 0) return gameOver(world.mode === 'sprint' ? 'sprint-complete' : 'timeattack-failed');
    }

    notifyAchievements();
    updateParticles(dt);
  }

  // Boss Rush não adiciona um sistema de tiro à nave: cada mini-boss ocupa a
  // borda do túnel e lança uma sequência procedural de asteroides por 12 s.
  // Sobreviver à sequência derrota o boss e concede cristais.
  function updateBoss(dt) {
    if (!world.bossRush) return;
    if (!boss && world.meters >= world.nextBossDist) {
      boss = { x: W + 110, y: H * 0.5, r: Math.max(34, H * 0.075), phase: Math.random() * Math.PI * 2, remaining: 12, shotIn: 0.65 };
      world.nextBossDist += 2000;
    }
    if (!boss) return;
    boss.x += (W * 0.76 - boss.x) * Math.min(1, dt * 2.6);
    boss.y = H * 0.5 + Math.sin(performance.now() * 0.002 + boss.phase) * H * 0.22;
    boss.remaining -= dt;
    boss.shotIn -= dt;
    if (boss.shotIn <= 0) {
      const shotY = Math.max(boss.r, Math.min(H - boss.r, boss.y + Math.sin(boss.remaining * 2.3 + boss.phase) * H * 0.16));
      obstacles.push({ type: 'asteroid', x: boss.x - boss.r * 0.7, y: shotY, r: Math.max(11, H * 0.024), rot: 0, spin: 2.2, seed: Math.random() * 1000 });
      boss.shotIn = 0.72;
    }
    if (boss.remaining <= 0) {
      world.crystals += 25;
      UI.showMilestone(I18n.t('boss.defeated', { n: 25 }));
      Audio2.unlock();
      boss = null;
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function gameOver(reason) {
    if (state === 'over') return;
    const completed = reason === 'sprint-complete' || reason === 'target-complete';
    setState('over');
    crashAnim = 0;
    if (!completed) {
      const rm = Storage.getSettings().reduceMotion;
      if (!rm) shake = 9;          // screen shake no impacto
      freeze = 0.07;               // hitstop micro
      explode(ship.x, ship.y);
      vibrate([70, 35, 90]);
      Audio2.hit();                // camada de impacto
      Audio2.crash();
    } else {
      Audio2.unlock();
    }
    Audio2.stopMusic();
    const meters = Math.floor(world.meters);
    const time = runTime;
    const payload = { meters, time, crystals: world.crystals, seed: world.seed, daily: world.daily, mode: world.mode, completed,
                      rulesetId: world.rulesetId, shipId: ship.ship.id,
                      loadout: { agility: Storage.getUpgradeLevel('agility'), thrust: Storage.getUpgradeLevel('thrust') },
                      maxCombo: world.maxCombo, powerups: world.powerupsUsed.slice() };
    setTimeout(() => { if (onOverCb) onOverCb(payload); }, 700);
  }

  /* -------------------- RENDER -------------------- */
  function render(t) {
    ctx.clearRect(0, 0, W, H);
    drawSpaceBg();
    drawNebulae();
    drawStars();
    drawNearStars();

    // plano local (gameplay) do ready em diante — com screen shake
    const rm = Storage.getSettings().reduceMotion;
    const sx = (shake > 0 && !rm) ? (Math.random() * 2 - 1) * shake : 0;
    const sy = (shake > 0 && !rm) ? (Math.random() * 2 - 1) * shake : 0;
    if (state === 'ready' || state === 'playing' || state === 'paused' || state === 'over') {
      ctx.save();
      ctx.translate(sx, sy);
      drawTerrain();
      drawObstacles();
      drawBoss();
      drawPickups();
      drawShip(t);
      drawParticles();
      ctx.restore();
    }
    if (state === 'over') drawFlash();
  }

  function drawSpaceBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05010f');
    g.addColorStop(0.5, '#0a0526');
    g.addColorStop(1, '#04030f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawNebulae() {
    for (const n of nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.c[0] + '55');
      g.addColorStop(0.5, n.c[1] + '22');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStars() {
    for (const s of stars) {
      const a = 0.5 + 0.5 * Math.sin(s.tw);
      ctx.globalAlpha = 0.4 + a * 0.6;
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawNearStars() {
    for (const s of nearStars) {
      const a = 0.6 + 0.4 * Math.sin(s.tw);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#9fd8ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawTerrain() {
    const step = 8;
    // parede superior
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= W; x += step) {
      const tt = terrain(x + world.scroll);
      ctx.lineTo(x, tt.top);
    }
    ctx.lineTo(W, 0);
    ctx.closePath();
    const gt = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    gt.addColorStop(0, '#1a0b3a');
    gt.addColorStop(1, '#2a1466');
    ctx.fillStyle = gt;
    ctx.fill();
    // parede inferior
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += step) {
      const tt = terrain(x + world.scroll);
      ctx.lineTo(x, tt.bot);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const gb = ctx.createLinearGradient(0, H * 0.5, 0, H);
    gb.addColorStop(0, '#2a1466');
    gb.addColorStop(1, '#14082f');
    ctx.fillStyle = gb;
    ctx.fill();

    // bordas luminosas (na cor do bioma atual)
    ctx.strokeStyle = accentColor + '99';
    ctx.lineWidth = 2;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) {
      const tt = terrain(x + world.scroll);
      if (x === 0) ctx.moveTo(x, tt.top); else ctx.lineTo(x, tt.top);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let x = 0; x <= W; x += step) {
      const tt = terrain(x + world.scroll);
      if (x === 0) ctx.moveTo(x, tt.bot); else ctx.lineTo(x, tt.bot);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawObstacles() {
    for (const o of obstacles) {
      if (o.type === 'blackhole') drawBlackHole(o);
      else if (o.type === 'laser') drawLaser(o);
      else drawAsteroid(o);
    }
  }

  function drawBoss() {
    if (!boss) return;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.shadowColor = '#ff4ad8'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#28104b';
    ctx.beginPath(); ctx.arc(0, 0, boss.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff4ad8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, boss.r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4af0ff';
    [-0.34, 0.34].forEach(offset => { ctx.beginPath(); ctx.arc(offset * boss.r, -boss.r * 0.12, boss.r * 0.12, 0, Math.PI * 2); ctx.fill(); });
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, boss.r * 0.68, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawAsteroid(o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.fillStyle = '#6b5a7a';
    ctx.strokeStyle = '#a892c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const sides = 9;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const rr = o.r * (0.75 + 0.25 * Math.sin(o.seed + i * 2.3));
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(20,10,40,0.5)';
    ctx.beginPath(); ctx.arc(-o.r * 0.2, -o.r * 0.1, o.r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(o.r * 0.3, o.r * 0.25, o.r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawBlackHole(o) {
    const grd = ctx.createRadialGradient(o.x, o.y, o.r * 0.2, o.x, o.y, o.r * 2.4);
    grd.addColorStop(0, '#000000');
    grd.addColorStop(0.45, '#000000');
    grd.addColorStop(0.7, 'rgba(180,80,255,0.55)');
    grd.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    // anel de acreção
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.ring);
    ctx.strokeStyle = 'rgba(255,170,90,0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff9a4a';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(0, 0, o.r * 1.5, o.r * 0.7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }

  function drawLaser(o) {
    if (!o.on) {
      // emissores apagados (aviso)
      ctx.fillStyle = 'rgba(255,80,90,0.45)';
      ctx.fillRect(o.x - 3, 0, 6, 8);
      ctx.fillRect(o.x - 3, H - 8, 6, 8);
      return;
    }
    const top = 0, bot = o.gapY - o.gapH / 2;
    const top2 = o.gapY + o.gapH / 2, bot2 = H;
    ctx.fillStyle = 'rgba(255,70,90,0.85)';
    ctx.shadowColor = '#ff4a5a';
    ctx.shadowBlur = 14;
    ctx.fillRect(o.x - o.w / 2, top, o.w, bot - top);
    ctx.fillRect(o.x - o.w / 2, top2, o.w, bot2 - top2);
    ctx.shadowBlur = 0;
  }

  function drawPickups() {
    for (const p of pickups) {
      if (p.kind === 'powerup') {
        const def = PowerUps.get(p.powerup);
        if (!def) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.rotate(-p.spin);
        ctx.fillStyle = '#08101e';
        ctx.font = 'bold ' + Math.max(10, p.r * 0.95) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.symbol, 0, 1);
        ctx.restore();
        continue;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.shadowColor = '#ffd84a';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.moveTo(0, -p.r);
      ctx.lineTo(p.r * 0.7, 0);
      ctx.lineTo(0, p.r);
      ctx.lineTo(-p.r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  function drawShip(t) {
    if (state === 'over' && crashAnim > 0.05) return; // some após explosão
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.tilt);
    ship.ship.draw(ctx, 0, 0, ship.w, ship.h, t, Input.isThrusting() && state === 'playing', ship.color, ship.accent);
    // anel de escudo (absorve 1 hit)
    if (ship.shield) {
      ctx.strokeStyle = '#4af0ff';
      ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 0.02);
      ctx.lineWidth = 3;
      ctx.shadowColor = '#4af0ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, ship.w * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    } else if (ship.invuln > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.4 * Math.min(1, ship.invuln);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ship.w * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      if (p.style === 'ring') {
        const radius = p.size + (1 - p.life / p.max) * p.size * 4;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * 0.32);
        ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.stroke();
      } else if (p.style === 'star') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((1 - p.life / p.max) * Math.PI);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const radius = i % 2 ? p.size * 0.42 : p.size;
          const angle = -Math.PI / 2 + i * Math.PI / 4;
          if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
          else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawFlash() {
    const a = Math.max(0, 0.6 - crashAnim * 1.2);
    if (a > 0) {
      ctx.fillStyle = 'rgba(255,120,80,' + a + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* HUD data */
  function getHud() {
    return {
      meters: Math.floor(world.meters),
      speed: Math.floor(world.speed),
      mode: world.mode,
      remaining: world.remaining,
      targetMeters: world.targetMeters,
      boss: boss ? { remaining: Math.max(0, boss.remaining) } : null,
      bossDistance: world.bossRush ? Math.max(0, Math.ceil(world.nextBossDist - world.meters)) : 0,
      crystals: world.crystals,
      combo: world.combo,
      ability: ship ? ship.ability : null,
      abilityCd: ship ? Math.max(0, ship.abilityCd) : 0,
      shield: ship ? ship.shield : false,
      dash: ship ? ship.dashTimer > 0 : false,
      slowmo: world.slowmoTimer > 0,
      powerups: [
        ...(world.magnetTimer > 0 ? [{ id: 'magnet', remaining: world.magnetTimer }] : []),
        ...(world.doubleCrystalsTimer > 0 ? [{ id: 'doubleCrystals', remaining: world.doubleCrystalsTimer }] : [])
      ]
    };
  }

  return {
    init, start, pause, resume, isPaused, stop, getHud,
    get state() { return state; },
    // Seam de teste/depuração (não afeta o jogo em produção)
    _debug: {
      get world() { return world; },
      get obstacles() { return obstacles; },
      get pickups() { return pickups; },
      get boss() { return boss; },
      get ship() { return ship; },
      tick(dt) { update(dt, performance.now()); },
      hit: () => hit(),
      spawnPowerup(type, x, y) { return spawnPowerup(type, x, y); },
      spawnCrystal(x, y) { const crystal = { kind: 'crystal', x, y, r: 10, spin: 0, ph: 0 }; pickups.push(crystal); return crystal; },
      recordSpawns(b) { recordSpawns = !!b; },
      getSpawnSig() { return world.spawnSig ? world.spawnSig.slice() : []; },
      terrain(wx) { return terrain(wx); }
    }
  };
})();
