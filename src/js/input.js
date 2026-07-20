/* Entrada: barra de espaço (desktop) ou toque/clique (mobile/tablet) */
const Input = (() => {
  let thrusting = false;
  const listeners = { start: [], end: [], ability: [] };
  let lastEnd = -1e9;          // timestamp da última soltura (para detectar double-tap)
  const DOUBLE_TAP_MS = 280;   // janela para o gesto de habilidade
  let inited = false;

  function onStart() {
    const now = performance.now();
    // double-tap rápido (soltar e pressionar de novo) dispara a habilidade
    if (now - lastEnd < DOUBLE_TAP_MS) {
      listeners.ability.forEach(f => f());
    }
    if (!thrusting) { thrusting = true; listeners.start.forEach(f => f()); }
  }
  function onEnd() {
    if (thrusting) { thrusting = false; lastEnd = performance.now(); listeners.end.forEach(f => f()); }
  }

  function init() {
    if (inited) return;        // idempotente: evita listeners duplicados
    inited = true;
    // Desktop: barra de espaço
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); onStart(); }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); onEnd(); }
    });

    // Mobile / tablet / mouse: segurar a tela
    const target = document.getElementById('app');
    target.addEventListener('pointerdown', e => {
      if (e.target.closest('.btn') || e.target.closest('.screen:not(.hidden)')) return;
      e.preventDefault(); onStart();
    });
    window.addEventListener('pointerup', () => onEnd());
    window.addEventListener('pointercancel', () => onEnd());
    window.addEventListener('blur', () => onEnd());
  }

  // Seam de teste: limpa estado e ouvintes sem reanexar listeners do window.
  function _reset() {
    thrusting = false;
    lastEnd = -1e9;
    listeners.start.length = 0;
    listeners.end.length = 0;
    listeners.ability.length = 0;
  }

  return {
    init,
    _reset,
    isThrusting: () => thrusting,
    on(action, fn) { if (listeners[action]) listeners[action].push(fn); }
  };
})();
