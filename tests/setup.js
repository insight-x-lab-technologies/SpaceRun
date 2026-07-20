// Mocks e helpers compartilhados entre os testes unitários (ambiente jsdom).

// --- requestAnimationFrame controlável (para dirigir o loop do jogo) ---
globalThis.__rafQueue = [];
globalThis.requestAnimationFrame = (cb) => {
  globalThis.__rafQueue.push(cb);
  return globalThis.__rafQueue.length;
};
globalThis.cancelAnimationFrame = () => {};
globalThis.__ts = 0;
// Avança n "frames" chamando os callbacks registrados (o loop do jogo
// re-registra o próprio rAF a cada chamada).
globalThis.stepFrames = (n = 1, dtMs = 16) => {
  for (let i = 0; i < n; i++) {
    globalThis.__ts += dtMs;
    const q = globalThis.__rafQueue;
    globalThis.__rafQueue = [];
    q.forEach((cb) => cb(globalThis.__ts));
  }
};

// --- Canvas 2D stub (jsdom não implementa renderização real) ---
const gradient = { addColorStop() {} };
const ctxStub = new Proxy(
  {},
  {
    get(_t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set() {
      return true;
    }
  }
);
if (typeof globalThis.HTMLCanvasElement !== 'undefined') {
  globalThis.HTMLCanvasElement.prototype.getContext = () => ctxStub;
  globalThis.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
}

// --- AudioContext intencionalmente AUSENTE ---
// O módulo Audio2 trata a ausência via try/catch (modo silencioso), então os
// testes de áudio que quiserem validar a síntese instalam um fake em window.
