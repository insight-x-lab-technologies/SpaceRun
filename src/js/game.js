/* Motor do jogo: canvas, parallax 3 planos, física, terreno e obstáculos */
const Game = (() => {
  let canvas, ctx, W = 0, H = 0, dpr = 1;
  let raf = null, lastT = 0;
  let state = 'idle';        // idle | ready | playing | paused | over
  let onOverCb = null;
  let onStateCb = null;

  let world = { scroll: 0, speed: 60, meters: 0, difficulty: 0 };
  let ship = null;
  let stars = [], nearStars = [], nebulae = [];
  let obstacles = [], particles = [], pickups = [];
  let spawnTimer = 0, pickupTimer = 1.5;
  let crashAnim = 0;

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

  let settings = { particles: true };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildStarfield();
  }

  function buildStarfield() {
    stars = [];
    nearStars = [];
    nebulae = [];
    const starCount = Math.floor((W * H) / 6000);
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        f: 0.12 + Math.random() * 0.18,
        tw: Math.random() * Math.PI * 2
      });
    }
    const nearCount = Math.floor((W * H) / 26000);
    for (let i = 0; i < nearCount; i++) {
      nearStars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 2.2 + 1.2,
        f: 0.45 + Math.random() * 0.3,
        tw: Math.random() * Math.PI * 2
      });
    }
    const nebCount = 5;
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
    resize();
    window.addEventListener('resize', resize);
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

  function buildWorld(seed, daily) {
    const s = Ships.get(Storage.get().selectedShip);
    world = {
      scroll: 0, speed: 220, meters: 0, difficulty: 0,
      crystals: 0, combo: 0, comboTimer: 0,
      seed: seed || 0, daily: !!daily, rng: null, accent: '#4af0ff'
    };
    if (seed) world.rng = mulberry32(seed >>> 0);
    ship = {
      x: Math.max(80, W * 0.22),
      y: H * 0.5,
      vy: 0,
      w: 46 * s.stats.size,
      h: 26 * s.stats.size,
      ship: s,
      tilt: 0
    };
    obstacles = [];
    particles = [];
    pickups = [];
    spawnTimer = 0.6;
    pickupTimer = 1.5;
    crashAnim = 0;
    shake = 0;
    freeze = 0;
    runTime = 0;
    wasThrusting = false;
    nextMilestone = 1000;
    milestoneIdx = 0;
    biomeIdx = -1;
    applyBiome(0);
  }

  function start(mode) {
    settings.particles = Storage.getSettings().particles;
    let seed = 0, daily = false;
    if (mode === 'daily') { daily = true; seed = dailySeed(); }
    else { seed = (Math.random() * 0xffffffff) >>> 0; }
    buildWorld(seed, daily);
    setState('ready');   // começa pausado, aguardando input do jogador
    lastT = performance.now();
  }
  function pause() { if (state === 'playing') setState('paused'); }
  function resume() { if (state === 'paused') { setState('playing'); lastT = performance.now(); } }
  function isPaused() { return state === 'paused'; }
  function stop() { setState('idle'); }

  function terrain(wx) {
    const diff = world.difficulty;
    const mid = H * 0.5;
    // começa bem aberto e estreita com a distância (rampa mais suave)
    let gap = H * 0.78 - diff * H * 0.05;
    gap = Math.max(H * 0.34, gap);
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
    const t = terrain(x + world.scroll);
    const y = t.top + rnd() * (t.bot - t.top);
    const r = 15 + rnd() * 8;
    obstacles.push({ type: 'blackhole', x, y, r, pull: 1500 + world.difficulty * 30,
      ring: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 1.5 });
  }

  function spawnLaser(x) {
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
    if (diff > 1.2 && roll < 0.20) return spawnBlackHole(x);
    if (diff > 0.8 && roll < 0.40) return spawnLaser(x);
    if (diff > 0.5 && roll < 0.55) return spawnDebris(x);
    spawnAsteroid(x);
  }

  function spawnPickup() {
    const x = W + 30;
    const t = terrain(x + world.scroll);
    const margin = 44;
    const span = (t.bot - t.top) - margin * 2;
    if (span <= 0) return;
    const y = t.top + margin + rnd() * span;
    pickups.push({ x, y, r: 9 + rnd() * 3, spin: rnd() * Math.PI * 2, ph: rnd() * Math.PI * 2 });
  }

  function collectCrystal(p) {
    world.combo += 1;
    world.comboTimer = 3;
    const mult = 1 + Math.floor((world.combo - 1) / 5);
    world.crystals += mult;
    Audio2.pickup();
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 120;
      addParticle(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp,
        0.3 + Math.random() * 0.3, '#ffd84a', 2 + Math.random() * 2);
    }
  }

  function addParticle(x, y, vx, vy, life, color, size) {
    particles.push({ x, y, vx, vy, life, max: life, color, size });
  }

  function explode(x, y) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 320;
      addParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp,
        0.5 + Math.random() * 0.6,
        Math.random() > 0.5 ? '#ff7a3c' : '#ffd84a',
        2 + Math.random() * 3);
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    let dt = (t - lastT) / 1000;
    lastT = t;
    if (dt > 0.05) dt = 0.05; // evita saltos
    update(dt, t);
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
    const scrollSpeed = (state === 'playing') ? world.speed : 60;
    world.scroll += scrollSpeed * dt;

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
    world.meters += world.speed * dt * 0.12;

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

    // física da nave
    const st = ship.ship.stats;
    const gravity = 1150;
    const thrust = 2300 * st.agility * st.thrust;
    const thrusting = Input.isThrusting();
    if (thrusting) {
      if (!wasThrusting) Audio2.thrust();   // som de empuxo no início do pulso
      ship.vy -= thrust * dt;
      if (settings.particles && Math.random() < 0.8) {
        addParticle(ship.x - ship.w * 0.5, ship.y + (Math.random() - 0.5) * ship.h * 0.4,
          -120 - Math.random() * 120, (Math.random() - 0.5) * 60,
          0.3 + Math.random() * 0.3, '#4af0ff', 2 + Math.random() * 2);
      }
    }
    wasThrusting = thrusting;
    ship.vy += gravity * dt;
    ship.vy = Math.max(-520, Math.min(520, ship.vy));
    ship.y += ship.vy * dt;
    ship.tilt = Math.max(-0.5, Math.min(0.5, -ship.vy / 1400));

    // colisão com terreno
    const tInfo = terrain(ship.x + world.scroll);
    const halfH = ship.h * 0.5;
    if (ship.y - halfH < tInfo.top || ship.y + halfH > tInfo.bot) {
      return gameOver();
    }
    if (ship.y < halfH) ship.y = halfH;
    if (ship.y > H - halfH) ship.y = H - halfH;

    // faíscas de "quase-colisão" nas bordas do túnel (juiciness)
    if (settings.particles) {
      const margin = 26;
      const dTop = (ship.y - halfH) - tInfo.top;
      const dBot = tInfo.bot - (ship.y + halfH);
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

    // cristais coletáveis + combo
    if (world.comboTimer > 0) {
      world.comboTimer -= dt;
      if (world.comboTimer <= 0) world.combo = 0;
    }
    pickupTimer -= dt;
    if (pickupTimer <= 0) { spawnPickup(); pickupTimer = 1.6 + rnd() * 1.8; }
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.x -= world.speed * dt;
      p.spin += dt * 3;
      if (p.x + p.r < -20) { pickups.splice(i, 1); continue; }
      const dx = p.x - ship.x, dy = p.y - ship.y;
      const rr = p.r + ship.w * 0.3;
      if (dx * dx + dy * dy < rr * rr) { collectCrystal(p); pickups.splice(i, 1); }
    }

    // obstáculos
    spawnTimer -= dt;
    // começa com poucos obstáculos e aumenta a frequência
    const interval = Math.max(0.5, 2.2 - world.difficulty * 0.18);
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = interval * (0.7 + rnd() * 0.6); }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= world.speed * dt;
      if (o.type === 'asteroid') {
        o.rot += o.spin * dt;
        const dx = o.x - ship.x, dy = o.y - ship.y;
        const rr = o.r + ship.w * 0.32;
        if (dx * dx + dy * dy < rr * rr) return gameOver();
      } else if (o.type === 'blackhole') {
        o.ring += o.spin * dt;
        const dx = o.x - ship.x, dy = o.y - ship.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const well = o.r * 5.5;
        if (dist < well) {
          const f = (1 - dist / well) * o.pull;
          ship.vy += (dy / dist) * f * dt;   // poço de gravidade puxa a nave
        }
        if (dist < o.r) return gameOver();
      } else if (o.type === 'laser') {
        o.timer -= dt;
        if (o.timer <= 0) { o.on = !o.on; o.timer = o.on ? o.onDur : o.offDur; }
        if (o.on) {
          const inX = Math.abs(o.x - ship.x) < (o.w * 0.5 + ship.w * 0.3);
          const inGap = ship.y > o.gapY - o.gapH / 2 && ship.y < o.gapY + o.gapH / 2;
          if (inX && !inGap) return gameOver();
        }
      }
      const margin = (o.type === 'laser') ? o.w * 3 + 20 : (o.r * 3 + 40);
      if (o.x < -margin) obstacles.splice(i, 1);
    }

    updateParticles(dt);
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

  function gameOver() {
    if (state === 'over') return;
    setState('over');
    crashAnim = 0;
    const rm = Storage.getSettings().reduceMotion;
    if (!rm) shake = 9;          // screen shake no impacto
    freeze = 0.07;               // hitstop micro
    explode(ship.x, ship.y);
    Audio2.hit();                // camada de impacto
    Audio2.crash();
    Audio2.stopMusic();
    const meters = Math.floor(world.meters);
    const time = runTime;
    const payload = { meters, time, crystals: world.crystals, seed: world.seed, daily: world.daily };
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
    ship.ship.draw(ctx, 0, 0, ship.w, ship.h, t, Input.isThrusting() && state === 'playing');
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
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
      crystals: world.crystals,
      combo: world.combo
    };
  }

  return { init, start, pause, resume, isPaused, stop, getHud, get state() { return state; } };
})();
