/* Áudio procedural (WebAudio, sem arquivos) */
const Audio2 = (() => {
  let ctx = null;
  let soundOn = true;     // efeitos sonoros
  let musicOn = false;    // música de fundo

  // ----- música -----
  const music = { type: null, timer: null, next: 0, step: 0, master: null, drone: null };

  const MENU_SEQ  = [220.00, 261.63, 329.63, 293.66, 261.63, 220.00, 329.63, 392.00];
  const GAME_SEQ  = [440.00, 523.25, 659.25, 523.25, 587.33, 659.25, 523.25, 440.00];

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

  function uiClick() { blip(660, 0.05, 'square', 0.08); }
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

  /* ---------- música procedural ---------- */
  function startMusic(type) {
    if (!musicOn) { stopMusic(); return; }
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
        const f = MENU_SEQ[music.step % MENU_SEQ.length];
        note(f, music.next, 0.42, 'triangle', 0.5);
        if (music.step % 4 === 0) note(f * 2, music.next, 0.3, 'sine', 0.18);
      } else { // game
        const f = GAME_SEQ[music.step % GAME_SEQ.length];
        note(f, music.next, 0.15, 'square', 0.32);
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
    music.type = null;
  }

  return {
    ensure,
    setEnabled, setMusicEnabled,
    uiClick, thrust, hit, crash, unlock, pickup, ability, shield,
    startMusic, stopMusic
  };
})();
