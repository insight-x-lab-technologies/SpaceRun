/* Áudio procedural (WebAudio, sem arquivos) */
const Audio2 = (() => {
  let ctx = null;
  let soundOn = true;     // efeitos sonoros
  let musicOn = false;    // música de fundo

  // ----- música -----
  const music = { type: null, timer: null, next: 0, step: 0, master: null, drone: null, el: null };

  const MENU_SEQ  = [220.00, 261.63, 329.63, 293.66, 261.63, 220.00, 329.63, 392.00];
  const GAME_SEQ  = [440.00, 523.25, 659.25, 523.25, 587.33, 659.25, 523.25, 440.00];

  // Configuração de áudio do tema atual (clique + música). Padrão = "neon"
  // (mesmo comportamento procedural de sempre). MP3 é opcional: quando
  // menuMp3/gameMp3 apontam para um arquivo, ele é usado no lugar da síntese.
  const theme = {
    click: { freq: 660, dur: 0.05, type: 'square', vol: 0.08 },
    menuWave: 'triangle', gameWave: 'square',
    menuSeq: MENU_SEQ.slice(), gameSeq: GAME_SEQ.slice(),
    menuMp3: null, gameMp3: null
  };

  /* Aplica a config de áudio de um tema; reinicia a música para refletir. */
  function setTheme(cfg) {
    if (!cfg) return;
    if (cfg.click) theme.click = Object.assign({}, theme.click, cfg.click);
    if (cfg.menuWave) theme.menuWave = cfg.menuWave;
    if (cfg.gameWave) theme.gameWave = cfg.gameWave;
    if (Array.isArray(cfg.menuSeq) && cfg.menuSeq.length) theme.menuSeq = cfg.menuSeq.slice();
    if (Array.isArray(cfg.gameSeq) && cfg.gameSeq.length) theme.gameSeq = cfg.gameSeq.slice();
    theme.menuMp3 = cfg.menuMp3 || null;
    theme.gameMp3 = cfg.gameMp3 || null;
    stopMusic();
  }

  /* Define faixas MP3 diretamente (infra opcional; null volta ao procedural). */
  function setMusicTracks(menuUrl, gameUrl) {
    theme.menuMp3 = menuUrl || null;
    theme.gameMp3 = gameUrl || null;
    stopMusic();
  }

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setEnabled(v) { soundOn = v; }
  function setMusicEnabled(v) { musicOn = v; if (!v) stopMusic(); }

  /* ---------- efeitos ---------- */
  function blip(freq, dur, type = 'square', vol = 0.12) {
    if (!soundOn) return;
    const c = ensure(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  function uiClick() { const c = theme.click; blip(c.freq, c.dur, c.type, c.vol); }
  function thrust() { blip(420, 0.06, 'square', 0.05); }
  function hit() { blip(160, 0.12, 'square', 0.12); }
  function crash() {
    if (!soundOn) return;
    const c = ensure(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.4);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.45);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.45);
  }
  function unlock() { blip(660,0.1); setTimeout(()=>blip(880,0.12),100); setTimeout(()=>blip(1100,0.16),220); }
  function pickup() { blip(1180, 0.07, 'triangle', 0.09); }
  function ability() { blip(880, 0.08, 'square', 0.07); setTimeout(() => blip(1320, 0.1, 'square', 0.06), 70); }
  function shield() { blip(520, 0.14, 'sawtooth', 0.1); setTimeout(() => blip(300, 0.18, 'sawtooth', 0.09), 60); }

  /* ---------- MP3 opcional (por tema) ---------- */
  function stopEl() {
    if (music.el) { try { music.el.pause(); } catch (e) {} music.el = null; }
  }
  function playMp3(url) {
    stopEl();
    try {
      const a = new Audio(url);
      a.loop = true; a.volume = 0.5;
      const p = a.play && a.play();
      if (p && p.catch) p.catch(() => {});
      music.el = a;
    } catch (e) { music.el = null; }
  }

  /* ---------- música procedural ---------- */
  function startMusic(type) {
    if (!musicOn) { stopMusic(); return; }
    // MP3 do tema tem prioridade quando definido (não depende de AudioContext)
    const url = (type === 'menu') ? theme.menuMp3 : theme.gameMp3;
    if (url && typeof Audio !== 'undefined') {
      if (music.type === type && music.el) return; // já tocando essa faixa
      stopMusic();
      music.type = type;
      playMp3(url);
      return;
    }
    const c = ensure(); if (!c) return;
    if (music.type === type && music.timer) return; // já tocando
    stopMusic();
    music.type = type;
    music.step = 0;
    music.next = c.currentTime + 0.06;
    if (!music.master) {
      music.master = c.createGain();
      music.master.gain.value = 0.07;
      music.master.connect(c.destination);
    }
    if (type === 'menu') startDrone(c, 110, 0.04); // pad grave
    music.timer = setInterval(scheduler, 25);
  }

  function startDrone(c, freq, vol) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.value = vol;
    // leve vibrato
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 0.2; lg.gain.value = 2;
    lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); g.connect(music.master);
    o.start(); lfo.start();
    music.drone = { o, lfo };
  }

  function stopDrone() {
    if (music.drone) {
      try { music.drone.o.stop(); music.drone.lfo.stop(); } catch (e) {}
      music.drone = null;
    }
  }

  function note(freq, start, dur, type, rel) {
    const c = ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(rel, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(music.master);
    o.start(start); o.stop(start + dur + 0.02);
  }

  function scheduler() {
    const c = ctx; if (!c || c.state !== 'running') return;
    if (music.next < c.currentTime) music.next = c.currentTime + 0.05; // resync
    while (music.next < c.currentTime + 0.12) {
      const type = music.type;
      if (type === 'menu') {
        const seq = theme.menuSeq;
        const f = seq[music.step % seq.length];
        note(f, music.next, 0.42, theme.menuWave, 0.5);
        if (music.step % 4 === 0) note(f * 2, music.next, 0.3, 'sine', 0.18);
      } else { // game
        const seq = theme.gameSeq;
        const f = seq[music.step % seq.length];
        note(f, music.next, 0.15, theme.gameWave, 0.32);
        if (music.step % 2 === 0) note(110, music.next, 0.15, 'triangle', 0.5);
        if (music.step % 4 === 2) note(164.81, music.next, 0.15, 'triangle', 0.3);
      }
      music.next += (type === 'menu') ? 0.46 : 0.16;
      music.step++;
    }
  }

  function stopMusic() {
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
    stopDrone();
    stopEl();
    music.type = null;
  }

  return {
    ensure,
    setEnabled, setMusicEnabled, setTheme, setMusicTracks,
    uiClick, thrust, hit, crash, unlock, pickup, ability, shield,
    startMusic, stopMusic
  };
})();
