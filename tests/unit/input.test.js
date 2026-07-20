import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp, loadDOM } from '../helpers/loadApp.js';

loadDOM();
loadApp();
const { Input } = globalThis;
Input.init(); // uma vez (idempotente); listeners do window anexados uma só vez

describe('Input — empuxo unificado (teclado/toque) e double-tap', () => {
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

  it('double-tap (soltar e pressionar rápido) emite "ability"', () => {
    let abilities = 0;
    Input.on('ability', () => abilities++);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })); // rápido -> ability
    expect(abilities).toBe(1);
  });

  it('dois toques lentos NÃO emitem ability', () => {
    let abilities = 0;
    Input.on('ability', () => abilities++);
    const realNow = performance.now;
    // keydown + keyup com now controlado para fixar lastEnd no passado
    performance.now = () => 1;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    performance.now = () => 2;
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); // lastEnd = 2
    // keydown "lento": now muito distante de lastEnd (>280ms)
    performance.now = () => 2000;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(abilities).toBe(0);
    performance.now = realNow;
  });
});
