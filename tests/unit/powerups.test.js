import { describe, expect, it } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { PowerUps } = globalThis;

describe('PowerUps — definições declarativas', () => {
  it('expõe três efeitos válidos com durações explícitas', () => {
    expect(PowerUps.list.map(p => p.id)).toEqual(['magnet', 'doubleCrystals', 'shield']);
    expect(PowerUps.get('magnet').duration).toBe(5);
    expect(PowerUps.get('doubleCrystals').duration).toBe(8);
    expect(PowerUps.get('shield').duration).toBe(0);
  });

  it('escolhe um tipo conhecido com RNG injetado', () => {
    expect(PowerUps.pick(() => 0).id).toBe('magnet');
    expect(PowerUps.pick(() => 0.5).id).toBe('doubleCrystals');
    expect(PowerUps.pick(() => 0.999).id).toBe('shield');
    expect(PowerUps.isKnown('unknown')).toBe(false);
  });
});
