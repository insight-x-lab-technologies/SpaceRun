/* Áudio procedural (WebAudio, sem arquivos) */
const Audio2 = (() => {
  let ctx = null;
  let enabled = true;
  let musicNodes = null;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type = 'square', vol = 0.12) {
    if (!enabled) return;
    const c = ensure(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + dur);
  }

  function crash() {
    if (!enabled) return;
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

  function startMusic() {
    if (!enabled) return;
    const c = ensure(); if (!c || musicNodes) return;
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle'; o.frequency.value = 110;
    o2.type = 'sine'; o2.frequency.value = 165;
    g.gain.value = 0.04;
    o.connect(g); o2.connect(g); g.connect(c.destination);
    o.start(); o2.start();
    musicNodes = { o, o2, g };
  }
  function stopMusic() {
    if (musicNodes) {
      try { musicNodes.o.stop(); musicNodes.o2.stop(); } catch (e) {}
      musicNodes = null;
    }
  }

  return {
    setEnabled: v => { enabled = v; if (!v) stopMusic(); },
    thrust: () => blip(420, 0.06, 'square', 0.05),
    hit: () => blip(160, 0.12, 'square', 0.12),
    crash,
    unlock: () => { blip(660,0.1); setTimeout(()=>blip(880,0.12),100); setTimeout(()=>blip(1100,0.16),220); },
    startMusic, stopMusic
  };
})();
