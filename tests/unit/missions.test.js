import { beforeEach, describe, expect, it } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Storage, Missions } = globalThis;

describe('Missions — F4B local', () => {
  beforeEach(() => { localStorage.clear(); Storage.reset(); });

  it('seleciona exatamente três missões diárias estáveis para a mesma data', () => {
    Storage.recordRun({ m: 10, t: 1, c: 0, d: new Date(2026, 6, 20, 12).getTime() });
    const first = Missions.snapshot().daily.map(m => m.id);
    const second = Missions.snapshot().daily.map(m => m.id);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
  });
});
