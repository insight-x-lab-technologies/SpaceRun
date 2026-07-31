/* Entrada unificada: teclado remapeável, toque e Gamepad API. */
const Input = (() => {
  let thrusting = false;
  const listeners = { start: [], end: [], ability: [] };
  let inited = false;
  let controls = { thrustKey: 'Space', abilityKey: 'ShiftLeft', controlMode: 'hold' };
  let gamepadFrame = null;
  let gamepadThrust = false;
  let gamepadAbility = false;

  function onStart() {
    if (!thrusting) { thrusting = true; listeners.start.forEach(f => f()); }
  }
  function onEnd() {
    if (thrusting) { thrusting = false; listeners.end.forEach(f => f()); }
  }

  function pressThrust() {
    if (controls.controlMode === 'toggle') {
      if (thrusting) onEnd(); else onStart();
    } else onStart();
  }
  function releaseThrust() {
    if (controls.controlMode === 'hold') onEnd();
  }
  function isTextEntry(target) {
    return !!(target && typeof target.matches === 'function' && (target.matches('input, textarea, select') || target.isContentEditable));
  }
  function setControls(next) {
    const value = next && typeof next === 'object' ? next : {};
    const valid = code => typeof code === 'string' && /^(Space|Enter|Escape|Tab|Backspace|Delete|Arrow(?:Up|Down|Left|Right)|Shift(?:Left|Right)?|Control(?:Left|Right)?|Alt(?:Left|Right)?|Key[A-Z]|Digit[0-9]|Numpad[0-9]|F(?:[1-9]|1[0-2]))$/.test(code);
    controls = {
      thrustKey: valid(value.thrustKey) ? value.thrustKey : 'Space',
      abilityKey: valid(value.abilityKey) ? value.abilityKey : 'ShiftLeft',
      controlMode: value.controlMode === 'toggle' ? 'toggle' : 'hold'
    };
    if (controls.thrustKey === controls.abilityKey) controls.abilityKey = controls.thrustKey === 'ShiftLeft' ? 'ShiftRight' : 'ShiftLeft';
    if (controls.controlMode === 'toggle') gamepadThrust = false;
    return Object.assign({}, controls);
  }

  // Dispara a habilidade da nave (Fase 2) — via Shift (desktop) ou botão dedicado.
  function triggerAbility() {
    listeners.ability.forEach(f => f());
  }

  function pollGamepads(schedule) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && Array.from(pads).find(Boolean);
    const pressed = !!(pad && pad.buttons && pad.buttons[0] && pad.buttons[0].pressed);
    const ability = !!(pad && pad.buttons && pad.buttons[5] && pad.buttons[5].pressed);
    if (pressed && !gamepadThrust) pressThrust();
    if (!pressed && gamepadThrust) releaseThrust();
    if (ability && !gamepadAbility) triggerAbility();
    gamepadThrust = pressed;
    gamepadAbility = ability;
    if (schedule !== false) gamepadFrame = requestAnimationFrame(pollGamepads);
  }

  function init() {
    if (inited) return;        // idempotente: evita listeners duplicados
    inited = true;
    setControls(typeof Storage !== 'undefined' ? Storage.getSettings() : null);
    // Desktop: teclas configuráveis; campos de formulário mantêm seu comportamento nativo.
    window.addEventListener('keydown', e => {
      if (isTextEntry(e.target)) return;
      if (e.code === controls.thrustKey) { e.preventDefault(); if (!e.repeat) pressThrust(); return; }
      if (e.code === controls.abilityKey && !e.repeat) { e.preventDefault(); triggerAbility(); }
    });
    window.addEventListener('keyup', e => {
      if (isTextEntry(e.target)) return;
      if (e.code === controls.thrustKey) { e.preventDefault(); releaseThrust(); }
    });

    // Mobile / tablet / mouse: segurar a tela
    const target = document.getElementById('app');
    target.addEventListener('pointerdown', e => {
      if (e.target.closest('.btn') || e.target.closest('.ability-btn')) return;
      if (e.target.closest('.screen:not(.hidden)')) return;
      e.preventDefault(); pressThrust();
    });
    window.addEventListener('pointerup', () => releaseThrust());
    window.addEventListener('pointercancel', () => releaseThrust());
    window.addEventListener('blur', () => onEnd());
    window.addEventListener('gamepadconnected', () => { if (!gamepadFrame) gamepadFrame = requestAnimationFrame(pollGamepads); });
    window.addEventListener('gamepaddisconnected', () => { gamepadThrust = false; gamepadAbility = false; onEnd(); });
    gamepadFrame = requestAnimationFrame(pollGamepads);
  }

  // Seam de teste: limpa estado e ouvintes sem reanexar listeners do window.
  function _reset() {
    thrusting = false;
    listeners.start.length = 0;
    listeners.end.length = 0;
    listeners.ability.length = 0;
    gamepadThrust = false;
    gamepadAbility = false;
    setControls(null);
  }

  return {
    init,
    _reset,
    isThrusting: () => thrusting,
    getControls: () => Object.assign({}, controls),
    setControls,
    _pollGamepads: () => pollGamepads(false),
    triggerAbility,
    on(action, fn) { if (listeners[action]) listeners[action].push(fn); }
  };
})();
