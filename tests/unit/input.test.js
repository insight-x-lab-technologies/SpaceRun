import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp, loadDOM } from '../helpers/loadApp.js';

loadDOM();
loadApp();
const { Input } = globalThis;
Input.init(); // uma vez (idempotente); listeners do window anexados uma só vez

describe('Input — empuxo unificado (teclado/toque) e habilidade (Shift)', () => {
  beforeEach(() => {
    Input._reset(); // limpa estado/thrust e ouvintes registrados pelos testes
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
  });

  it('keydown Espaço inicia o empuxo e emite "start"', () => {
    let starts = 0;
    Input.on('start', () => starts++);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(Input.isThrusting()).toBe(true);
    expect(starts).toBe(1);
  });

  it('keyup encerra o empuxo e emite "end"', () => {
    let ends = 0;
    Input.on('end', () => ends++);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    expect(Input.isThrusting()).toBe(false);
    expect(ends).toBe(1);
  });

  it('pointerdown na área de jogo inicia o empuxo (mobile)', () => {
    const app = document.getElementById('app');
    app.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(Input.isThrusting()).toBe(true);
    window.dispatchEvent(new Event('pointerup', { bubbles: true }));
    expect(Input.isThrusting()).toBe(false);
  });

  it('pointerdown em botão NÃO inicia o empuxo', () => {
    const btn = document.querySelector('[data-action="hangar"]');
    btn.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(Input.isThrusting()).toBe(false);
  });

  it('tecla Shift emite "ability"', () => {
    let abilities = 0;
    Input.on('ability', () => abilities++);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
    expect(abilities).toBe(1);
  });

  it('Espaço (empuxo) NÃO emite ability; Shift repetido conta uma vez', () => {
    let abilities = 0;
    Input.on('ability', () => abilities++);
    // Espaço (sobe/desce) não dispara habilidade
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    expect(abilities).toBe(0);
    // autorepeat (repeat=true) não deve reemitir
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft', repeat: true }));
    expect(abilities).toBe(0);
    // nova pressão (sem repeat) emite
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
    expect(abilities).toBe(1);
  });

  it('triggerAbility() emite "ability" (botão dedicado de toque)', () => {
    let abilities = 0;
    Input.on('ability', () => abilities++);
    Input.triggerAbility();
    expect(abilities).toBe(1);
    Input.triggerAbility();
    expect(abilities).toBe(2);
  });

  it('aceita teclas remapeadas e modo toggle sem alterar o contrato de eventos', () => {
    Input.setControls({ thrustKey: 'KeyW', abilityKey: 'KeyE', controlMode: 'toggle' });
    let starts = 0; let ends = 0; let abilities = 0;
    Input.on('start', () => starts++); Input.on('end', () => ends++); Input.on('ability', () => abilities++);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(Input.isThrusting()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    expect(Input.isThrusting()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
    expect(Input.isThrusting()).toBe(false);
    expect([starts, ends, abilities]).toEqual([1, 1, 1]);
    expect(Input.setControls({ thrustKey: 'ShiftLeft', abilityKey: 'ShiftLeft' })).toMatchObject({ thrustKey: 'ShiftLeft', abilityKey: 'ShiftRight' });
  });

  it('Gamepad A controla o empuxo e RB dispara a habilidade com fallback seguro', () => {
    const original = navigator.getGamepads;
    let buttons = [{ pressed: true }, { pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }, { pressed: true }];
    Object.defineProperty(navigator, 'getGamepads', { value: () => [{ buttons }], configurable: true });
    let starts = 0; let ends = 0; let abilities = 0;
    Input.on('start', () => starts++); Input.on('end', () => ends++); Input.on('ability', () => abilities++);
    Input._pollGamepads();
    buttons = [{ pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }, { pressed: false }];
    Input._pollGamepads();
    expect([starts, ends, abilities]).toEqual([1, 1, 1]);
    Object.defineProperty(navigator, 'getGamepads', { value: original, configurable: true });
  });
});
