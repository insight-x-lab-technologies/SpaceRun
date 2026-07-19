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
  let obstacles = [], particles = [];
  let spawnTimer = 0;
  let crashAnim = 0;

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

  function buildWorld() {
    const s = Ships.get(Storage.get().selectedShip);
    world = { scroll: 0, speed: 220, meters: 0, difficulty: 0 };
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
    spawnTimer = 0.6;
    crashAnim = 0;
  }

  function start() {
    settings.particles = Storage.getSettings().particles;
    buildWorld();
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
    // começa bem aberto e estreita com a distância
    let gap = H * 0.72 - diff * H * 0.055;
    gap = Math.max(H * 0.3, gap);
    // variação pequena no início, cresce com o progresso
    const amp = gap * (0.1 + Math.min(diff * 0.006, 0.22));
    const top = mid - gap * 0.5
      + Math.sin(wx * 0.010) * gap * 0.22
      + Math.sin(wx * 0.023 + 1.3) * gap * 0.12;
    const bot = mid + gap * 0.5
      + Math.sin(wx * 0.011 + 2.1) * gap * 0.22
      + Math.sin(wx * 0.021 + 0.7) * gap * 0.12;
    return { top, bot, mid, amp };
  }

  function spawnObstacle() {
    const x = W + 40;
    const t = terrain(x + world.scroll);
    const r = 12 + Math.random() * 18 + world.difficulty * 0.3;
    const minY = t.top + r + 6;
    const maxY = t.bot - r - 6;
    if (maxY <= minY) return;
    const y = minY + Math.random() * (maxY - minY);
    obstacles.push({
      x, y, r,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 2,
      seed: Math.random() * 1000
    });
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

    if (state === 'playing') updateGameplay(dt, t);
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
  }

  function updateGameplay(dt, t) {
    world.difficulty = world.meters / 1000;
    // começa em 220 e acelera com a distância
    world.speed = Math.min(720, 220 + world.difficulty * 70);
    world.meters += world.speed * dt * 0.12;

    // física da nave
    const st = ship.ship.stats;
    const gravity = 1150;
    const thrust = 2300 * st.agility * st.thrust;
    if (Input.isThrusting()) {
      ship.vy -= thrust * dt;
      if (settings.particles && Math.random() < 0.8) {
        addParticle(ship.x - ship.w * 0.5, ship.y + (Math.random() - 0.5) * ship.h * 0.4,
          -120 - Math.random() * 120, (Math.random() - 0.5) * 60,
          0.3 + Math.random() * 0.3, '#4af0ff', 2 + Math.random() * 2);
      }
    }
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

    // obstáculos
    spawnTimer -= dt;
    // começa com poucos obstáculos e aumenta a frequência
    const interval = Math.max(0.5, 2.2 - world.difficulty * 0.18);
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = interval * (0.7 + Math.random() * 0.6); }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= world.speed * dt;
      o.rot += o.spin * dt;
      if (o.x + o.r < -20) { obstacles.splice(i, 1); continue; }
      const dx = o.x - ship.x, dy = o.y - ship.y;
      const rr = o.r + ship.w * 0.32;
      if (dx * dx + dy * dy < rr * rr) return gameOver();
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
    explode(ship.x, ship.y);
    Audio2.crash();
    Audio2.stopMusic();
    const meters = Math.floor(world.meters);
    setTimeout(() => { if (onOverCb) onOverCb(meters); }, 700);
  }

  /* -------------------- RENDER -------------------- */
  function render(t) {
    ctx.clearRect(0, 0, W, H);
    drawSpaceBg();
    drawNebulae();
    drawStars();
    drawNearStars();

    // plano local (gameplay) do ready em diante
    if (state === 'ready' || state === 'playing' || state === 'paused' || state === 'over') {
      drawTerrain();
      drawObstacles();
      drawShip(t);
    }
    drawParticles();
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
      ctx.fillStyle = '#cfe8ff';
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

    // bordas luminosas
    ctx.strokeStyle = 'rgba(74,240,255,0.6)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4af0ff';
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
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot);
      // corpo do asteroide
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
      // crateras
      ctx.fillStyle = 'rgba(20,10,40,0.5)';
      ctx.beginPath(); ctx.arc(-o.r * 0.2, -o.r * 0.1, o.r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(o.r * 0.3, o.r * 0.25, o.r * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
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
    return { meters: Math.floor(world.meters), speed: Math.floor(world.speed) };
  }

  return { init, start, pause, resume, isPaused, stop, getHud, get state() { return state; } };
})();
