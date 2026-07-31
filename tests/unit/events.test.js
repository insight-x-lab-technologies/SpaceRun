import { describe, expect, it } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Events } = globalThis;

describe('Events — calendário local e rotas curadas da F10', () => {
  it('seleciona somente a janela sazonal local correspondente', () => {
    expect(Events.current(new Date(2026, 6, 31))).toMatchObject({ id: 'starlight' });
    expect(Events.current(new Date(2026, 9, 31))).toMatchObject({ id: 'halloween' });
    expect(Events.current(new Date(2027, 0, 2))).toMatchObject({ id: 'newyear' });
    expect(Events.current(new Date(2026, 2, 10))).toBeNull();
  });

  it('mantém seeds curadas conhecidas e devolve cópias sem estado compartilhado', () => {
    const routes = Events.listSeeds();
    expect(routes).toHaveLength(3);
    expect(routes.map(route => route.seed)).toEqual([319240581, 1204587312, 3289067510]);
    routes[0].seed = 0;
    expect(Events.getSeed('cometRelay')).toMatchObject({ seed: 319240581, event: 'starlight' });
    expect(Events.getSeed('unknown')).toBeNull();
  });
});
