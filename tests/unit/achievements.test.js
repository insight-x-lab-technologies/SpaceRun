import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Achievements, Storage, Ships } = globalThis;

describe('Achievements — conquistas', () => {
  beforeEach(() => {
    Storage.reset();
    localStorage.clear();
  });

  it('existem 13 conquistas', () => {
    expect(Achievements.all().length).toBe(13);
  });

  it('desbloqueia first_flight ao completar 1 run', () => {
    const novas = Achievements.check({ runs: 1, meters: 0, time: 0, runCrystals: 0, maxCombo: 0, unlockedCount: 1, maxStreak: 0, daily: false });
    expect(novas).toContain('first_flight');
  });

  it('desbloqueia por distância e não repete já desbloqueadas', () => {
    // 1ª checagem (meters baixo) desbloqueia só first_flight
    Achievements.check({ runs: 1, meters: 100, time: 0, runCrystals: 0, maxCombo: 0, unlockedCount: 1, maxStreak: 0, daily: false });
    // 2ª checagem (meters alto) desbloqueia dist_5k, mas não first_flight de novo
    const novas2 = Achievements.check({ runs: 2, meters: 6000, time: 0, runCrystals: 0, maxCombo: 0, unlockedCount: 1, maxStreak: 0, daily: false });
    expect(novas2).not.toContain('first_flight');
    expect(novas2).toContain('dist_5k');
  });

  it('daily_first só dispara quando ctx.daily é true', () => {
    const novas = Achievements.check({ runs: 1, meters: 0, time: 0, runCrystals: 0, maxCombo: 0, unlockedCount: 1, maxStreak: 0, daily: true });
    expect(novas).toContain('daily_first');
  });

  it('fleet exige toda a frota desbloqueada', () => {
    Ships.list.forEach((s) => Storage.unlock(s.id));
    const ctx = { runs: 1, meters: 0, time: 0, runCrystals: 0, maxCombo: 0, unlockedCount: Storage.get().unlocked.length, maxStreak: 0, daily: false };
    expect(ctx.unlockedCount).toBe(20);
    const novas = Achievements.check(ctx);
    expect(novas).toContain('fleet');
  });

  it('getName/getDesc retornam texto traduzido', () => {
    expect(Achievements.getName('dist_5k').length).toBeGreaterThan(0);
    expect(Achievements.getDesc('dist_5k').length).toBeGreaterThan(0);
  });
});
