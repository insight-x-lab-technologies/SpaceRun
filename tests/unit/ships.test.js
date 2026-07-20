import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Ships, Storage } = globalThis;

describe('Ships — definição e customização', () => {
  beforeEach(() => {
    Storage.reset();
    localStorage.clear();
  });

  it('get retorna a nave ou o padrão (scout) para id inválido', () => {
    expect(Ships.get('falcon').id).toBe('falcon');
    expect(Ships.get('nao-existe').id).toBe('scout');
  });

  it('getSkin usa a cor padrão da nave quando não há skin salva', () => {
    const s = Ships.getSkin('falcon');
    expect(s.color).toBe('#7CFF6B');
    expect(s.accent).toBe('#ffd84a');
  });

  it('getSkin usa a skin do jogador quando salva', () => {
    Storage.setShipSkin('falcon', '#111111', '#222222');
    const s = Ships.getSkin('falcon');
    expect(s.color).toBe('#111111');
    expect(s.accent).toBe('#222222');
  });

  it('habilidades e thresholds de desbloqueio estão coerentes', () => {
    const falcon = Ships.get('falcon');
    expect(falcon.ability).toBe('dash');
    expect(falcon.unlockAt).toBe(500);
    // ordem crescente de unlockAt
    for (let i = 1; i < Ships.list.length; i++) {
      expect(Ships.list[i].unlockAt).toBeGreaterThanOrEqual(Ships.list[i - 1].unlockAt);
    }
  });

  it('a função draw não lança com contexto stub', () => {
    const grad = { addColorStop() {} };
    const ctx = new Proxy(
      {},
      {
        get(_t, p) {
          if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad;
          return () => {};
        },
        set() { return true; }
      }
    );
    expect(() => Ships.get('scout').draw(ctx, 0, 0, 44, 24, 0, true, '#fff', '#0ff')).not.toThrow();
  });
});
