/* Entrada: barra de espaço (desktop) ou toque/clique (mobile/tablet) */
const Input = (() => {
  let thrusting = false;
  const listeners = { start: [], end: [], ability: [] };
  let inited = false;

  function onStart() {
    if (!thrusting) { thrusting = true; listeners.start.forEach(f => f()); }
  }
  function onEnd() {
    if (thrusting) { thrusting = false; listeners.end.forEach(f => f()); }
  }

  // Dispara a habilidade da nave (Fase 2) — via Shift (desktop) ou botão dedicado.
  function triggerAbility() {
    listeners.ability.forEach(f => f());
  }

  function init() {
    if (inited) return;        // idempotente: evita listeners duplicados
    inited = true;
    // Desktop: barra de espaço (empuxo) e Shift (habilidade)
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); onStart(); return; }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
        if (!e.repeat) triggerAbility();
      }
    });
    window.addEventListener('keyup', e => {
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); onEnd(); }
    });

    // Mobile / tablet / mouse: segurar a tela
    const target = document.getElementById('app');
    target.addEventListener('pointerdown', e => {
      if (e.target.closest('.btn') || e.target.closest('.ability-btn')) return;
      if (e.target.closest('.screen:not(.hidden)')) return;
      e.preventDefault(); onStart();
    });
    window.addEventListener('pointerup', () => onEnd());
    window.addEventListener('pointercancel', () => onEnd());
    window.addEventListener('blur', () => onEnd());
  }

  // Seam de teste: limpa estado e ouvintes sem reanexar listeners do window.
  function _reset() {
    thrusting = false;
    listeners.start.length = 0;
    listeners.end.length = 0;
    listeners.ability.length = 0;
  }

  return {
    init,
    _reset,
    isThrusting: () => thrusting,
    triggerAbility,
    on(action, fn) { if (listeners[action]) listeners[action].push(fn); }
  };
})();
