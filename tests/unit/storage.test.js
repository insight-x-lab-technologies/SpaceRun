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
  });

  it('recordRun atualiza best, totalMeters e totalRuns', () => {
    Storage.recordRun(1200, 30, 5);
    expect(Storage.getBest()).toBe(1200);
    expect(Storage.get().totalMeters).toBe(1200);
    expect(Storage.get().totalRuns).toBe(1);
    expect(Storage.get().crystals).toBe(5);
    expect(Storage.get().bestTime).toBe(30);
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

  it('reset zera tudo', () => {
    Storage.recordRun(5000, 50, 10);
    Storage.reset();
    expect(Storage.getBest()).toBe(0);
    expect(Storage.get().totalRuns).toBe(0);
    expect(Storage.get().crystals).toBe(0);
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
