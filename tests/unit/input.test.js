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
});
