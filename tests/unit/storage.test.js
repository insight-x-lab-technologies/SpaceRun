import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Storage, Ships } = globalThis;

describe('Storage — progresso do jogador', () => {
  beforeEach(() => {
    Storage.reset();
    localStorage.clear();
  });

  it('vem com defaults sensatos', () => {
    const d = Storage.get();
    expect(d.best).toBe(0);
    expect(d.totalMeters).toBe(0);
    expect(d.totalRuns).toBe(0);
    expect(d.crystals).toBe(0);
    expect(d.selectedShip).toBe('scout');
    expect(d.unlocked).toContain('scout');
    expect(d.upgrades).toEqual({ agility: 0, thrust: 0 });
    expect(d.cosmetics).toMatchObject({ trail: 'ion', explosion: 'nova', title: 'cadet' });
    expect(d.settings.haptics).toBe(false);
  });

  it('recordRun atualiza best, totalMeters e totalRuns', () => {
    Storage.recordRun(1200, 30, 5);
    expect(Storage.getBest()).toBe(1200);
    expect(Storage.get().totalMeters).toBe(1200);
    expect(Storage.get().totalRuns).toBe(1);
    expect(Storage.get().crystals).toBe(5);
    expect(Storage.get().bestTime).toBe(30);
    expect(Storage.getHistory()[0].rulesetId).toBe('classic-v2');
  });

  it('normaliza os power-ups usados no histórico da run', () => {
    Storage.recordRun({ m: 12, t: 1, c: 0, powerups: ['magnet', 'unknown', 'magnet', 'shield'] });
    expect(Storage.getHistory()[0].powerups).toEqual(['magnet', 'shield']);
  });

  it('aceita apenas ids de modo conhecidos ao registrar uma run', () => {
    Storage.recordRun({ m: 12, t: 1, c: 0, mode: 'timeattack', rulesetId: 'timeattack-v1' });
    Storage.recordRun({ m: 12, t: 1, c: 0, mode: 'desconhecido' });
    expect(Storage.getHistory().map(run => run.mode)).toEqual(['timeattack', 'classic']);
  });

  it('deriva os sete desbloqueios de modo a partir dos metros totais', () => {
    expect(Storage.isModeUnlocked('daily')).toBe(false);
    expect(Storage.getModeMilestone('bossrush')).toBe(1000000);
    Storage.recordRun(10000, 0, 0);
    expect(Storage.isModeUnlocked('daily')).toBe(true);
    expect(Storage.isModeUnlocked('zen')).toBe(false);
    Storage.recordRun(990000, 0, 0);
    expect(Storage.isModeUnlocked('bossrush')).toBe(true);
    expect(Storage.isModeUnlocked('unknown')).toBe(false);
  });

  it('recordRun só marca isBest quando bate o recorde', () => {
    const r1 = Storage.recordRun(1000, 10, 0);
    expect(r1.isBest).toBe(true);
    const r2 = Storage.recordRun(500, 5, 0);
    expect(r2.isBest).toBe(false);
    expect(Storage.getBest()).toBe(1000);
  });

  it('desbloqueia naves por metros acumulados', () => {
    // falcon desbloqueia em 500m, tank em 1500m
    const r = Storage.recordRun(1600, 20, 0);
    expect(r.newUnlocks).toContain('falcon');
    expect(r.newUnlocks).toContain('tank');
    expect(Storage.isUnlocked('falcon')).toBe(true);
    expect(Storage.isUnlocked('tank')).toBe(true);
    expect(Storage.isUnlocked('phantom')).toBe(false);
  });

  it('mantém o streak de recordes e maxStreak', () => {
    Storage.recordRun(100, 1, 0); // best 100, streak 1
    Storage.recordRun(200, 2, 0); // best 200, streak 2
    Storage.recordRun(50, 3, 0);  // não bate, streak 0
    Storage.recordRun(300, 4, 0); // best 300, streak 1
    expect(Storage.get().maxStreak).toBe(2);
    expect(Storage.get().streak).toBe(1);
  });

  it('recordRun grava histórico (máx 50) e leaderboard Top 10', () => {
    Storage.recordRun(100, 1, 0);
    expect(Storage.get().history.length).toBe(1);
    const idx = Storage.recordLeaderboard(100, 1);
    expect(idx).toBe(0);
    for (let i = 0; i < 15; i++) Storage.recordLeaderboard(i, 1);
    expect(Storage.getLeaderboard().length).toBe(10);
  });

  it('mantém Top 10 independente por modo e ruleset', () => {
    for (let i = 0; i < 12; i++) {
      Storage.recordLeaderboard({ m: i, t: 1, mode: 'classic', rulesetId: 'classic-v2' });
      Storage.recordLeaderboard({ m: i, t: 1, mode: 'sprint', rulesetId: 'sprint-v1' });
    }
    const classic = Storage.getLeaderboard(x => x.mode === 'classic' && x.rulesetId === 'classic-v2');
    const sprint = Storage.getLeaderboard(x => x.mode === 'sprint' && x.rulesetId === 'sprint-v1');
    expect(classic).toHaveLength(10);
    expect(sprint).toHaveLength(10);
    expect(classic[0].m).toBe(11);
    expect(sprint[0].m).toBe(11);
  });

  it('mantém importados separados do Top 10 local e marca a origem', () => {
    Storage.recordLeaderboard({ m: 10, t: 1, mode: 'classic', rulesetId: 'classic-v2' });
    expect(Storage.importLeaderboard([{ name: 'Orbit', m: 999, t: 9, mode: 'classic', rulesetId: 'classic-v2', shipId: 'scout', loadout: { agility: 0, thrust: 0 } }], 'ab12cd34ef56')).toBe(1);
    expect(Storage.getLeaderboard(x => x.source === 'local')).toHaveLength(1);
    expect(Storage.getLeaderboard(x => x.source === 'imported')).toEqual([expect.objectContaining({ name: 'Orbit', origin: 'ab12cd34ef56' })]);
    expect(Storage.getFriendCode()).toMatch(/^[a-z0-9]{8,24}$/);
  });

  it('mantém categorias dos modos novos sem descartar os Top 10 existentes', () => {
    ['marathon', 'timeattack', 'bossrush'].forEach(mode => {
      for (let i = 0; i < 11; i++) Storage.recordLeaderboard({ m: i, t: 1, mode, rulesetId: mode + '-v1' });
    });
    ['marathon', 'timeattack', 'bossrush'].forEach(mode => {
      expect(Storage.getLeaderboard(x => x.mode === mode && x.rulesetId === mode + '-v1')).toHaveLength(10);
    });
    expect(Storage.getLeaderboard()).toHaveLength(30);
  });

  it('upgrades de cristais: compra, custo e nível', () => {
    Storage.recordRun(0, 0, 1000);
    const lvl0 = Storage.getUpgradeLevel('agility');
    const cost = Storage.getUpgradeCost('agility');
    expect(Storage.buyUpgrade('agility')).toBe(true);
    expect(Storage.getUpgradeLevel('agility')).toBe(lvl0 + 1);
    expect(Storage.getUpgradeCost('agility')).toBe(cost * 2);
    expect(Storage.getUpgradeMult('agility')).toBeCloseTo(1.02, 5);
  });

  it('upgrades não compram sem cristais suficientes', () => {
    expect(Storage.buyUpgrade('thrust')).toBe(false);
    expect(Storage.getUpgradeLevel('thrust')).toBe(0);
  });

  it('skins: salvar e restaurar cor/accent por nave', () => {
    expect(Storage.getShipSkin('scout')).toBeNull();
    Storage.setShipSkin('scout', '#112233', '#445566');
    const s = Storage.getShipSkin('scout');
    expect(s.color).toBe('#112233');
    expect(s.accent).toBe('#445566');
    Storage.resetShipSkin('scout');
    expect(Storage.getShipSkin('scout')).toBeNull();
  });

  it('cosméticos validam compra, seleção e títulos por distância', () => {
    Storage.recordRun(0, 0, 1000);
    expect(Storage.buyCosmetic('trail', 'stars')).toBe(true);
    expect(Storage.getCosmetics()).toMatchObject({ trail: 'stars' });
    expect(Storage.setCosmetic('explosion', 'neon')).toBe(false);
    expect(Storage.buyCosmetic('explosion', 'neon')).toBe(true);
    expect(Storage.setCosmetic('explosion', 'neon')).toBe(true);
    Storage.recordRun(10000, 0, 0);
    expect(Storage.getCosmetics().unlocked).toContain('title:voyager');
    expect(Storage.setCosmetic('title', 'voyager')).toBe(true);
  });

  it('reset zera tudo', () => {
    Storage.recordRun(5000, 50, 10);
    Storage.reset();
    expect(Storage.getBest()).toBe(0);
    expect(Storage.get().totalRuns).toBe(0);
    expect(Storage.get().crystals).toBe(0);
  });

  it('recompensa diária não duplica ao voltar o calendário e limita a sequência', () => {
    const day1 = new Date(2026, 6, 20, 12);
    expect(Storage.claimDailyReward(day1)).toMatchObject({ reward: 50, streak: 1 });
    expect(Storage.claimDailyReward(day1)).toBeNull();
    expect(Storage.claimDailyReward(new Date(2026, 6, 19, 12))).toBeNull();
    expect(Storage.claimDailyReward(new Date(2026, 6, 21, 12))).toMatchObject({ reward: 75, streak: 2 });
  });

  it('registra progresso limitado de retenção e XP a cada run', () => {
    Storage.recordRun({ m: 1600, t: 50, c: 14, d: new Date(2026, 6, 20, 12).getTime(), mode: 'daily' });
    const r = Storage.getRetention();
    expect(r.daily.progress).toMatchObject({ runs: 1, meters: 1600, crystals: 14, seconds: 50, daily: 1 });
    expect(r.weekly.progress.best).toBe(1600);
    expect(Storage.getProfile()).toMatchObject({ xp: 30, level: 1 });
  });

  it('Ships.list tem 20 naves com habilidades variadas', () => {
    expect(Ships.list.length).toBe(20);
    const abilities = new Set(Ships.list.map((s) => s.ability));
    expect(abilities.has('dash')).toBe(true);
    expect(abilities.has('shield')).toBe(true);
    expect(abilities.has('slowmo')).toBe(true);
  });

  it('migra o save v1 preservando progresso, contexto legado e backup', () => {
    localStorage.clear();
    localStorage.setItem('spacerun.save.v1', JSON.stringify({ best: 321, totalMeters: 999, selectedShip: 'falcon', unlocked: ['scout', 'falcon'], history: [{ m: 12, t: 3.4, c: 2, d: 10 }], leaderboard: [{ name: 'Pilot', m: 12, t: 3.4, d: 10 }] }));
    loadApp();
    expect(globalThis.Storage.get().schemaVersion).toBe(2);
    expect(globalThis.Storage.get().best).toBe(321);
    expect(globalThis.Storage.getHistory()[0]).toMatchObject({ mode: 'classic', rulesetId: 'legacy-v04', shipId: 'unknown' });
    expect(localStorage.getItem('spacerun.save.v1.backup')).toContain('totalMeters');
  });

  it('normaliza dados hostis e expõe apenas snapshots imutáveis', () => {
    const snapshot = Storage.getSnapshot();
    snapshot.crystals = 999999;
    expect(Storage.getSnapshot().crystals).not.toBe(999999);
    const bad = JSON.stringify({ schemaVersion: 2, best: -1, totalRuns: Infinity, unlocked: ['unknown'], playerName: '<img>', shipSkins: { scout: { color: 'red', accent: '#000000' } }, settings: { sound: 'false' } });
    expect(Storage.importSave(bad)).toBe(true);
    const saved = Storage.getSnapshot();
    expect(saved.best).toBe(0);
    expect(saved.unlocked).toEqual(['scout']);
    expect(saved.playerName).toBe('<img>');
    expect(saved.shipSkins.scout).toBeUndefined();
    expect(saved.settings.sound).toBe(true);
    expect(saved.cosmetics).toMatchObject({ trail: 'ion', explosion: 'nova', title: 'cadet' });
    expect(saved.settings.haptics).toBe(false);
  });

  it('rejeita importações inválidas sem substituir o snapshot atual', () => {
    Storage.recordRun(55, 1, 0);
    const before = Storage.getSnapshot();
    expect(Storage.importSave('{')).toBe(false);
    expect(Storage.getLastError()).toBe('import-parse');
    expect(Storage.getSnapshot().best).toBe(before.best);
    expect(Storage.importSave('x'.repeat(70000))).toBe(false);
    expect(Storage.getLastError()).toBe('import-size');
  });
});
