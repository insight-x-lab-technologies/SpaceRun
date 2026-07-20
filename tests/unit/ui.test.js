import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp, loadDOM } from '../helpers/loadApp.js';

loadDOM();
loadApp();
const { UI, I18n, Storage, Ships } = globalThis;

function init() {
  Storage.reset();
  localStorage.clear();
  I18n.init();
  UI.init(() => {}); // uma vez: evita listeners de clique duplicados entre testes
}

describe('UI — telas, hangar, conquistas, game over', () => {
  beforeAll(init);
  beforeEach(() => {
    Storage.reset();
    localStorage.clear();
  });

  it('renderHangar lista as 20 naves', () => {
    document.querySelector('[data-action="hangar"]').click();
    expect(document.getElementById('screen-hangar').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('ship-list').children.length).toBe(20);
  });

  it('renderAchievements lista 13 conquistas', () => {
    document.querySelector('[data-action="achievements"]').click();
    expect(document.getElementById('ach-list').children.length).toBe(13);
  });

  it('showGameOver registra a run e preenche o resultado', () => {
    UI.showGameOver({ meters: 1234, time: 42.5, crystals: 7, seed: 99, daily: false, shipId: 'scout', maxCombo: 3 });
    expect(document.getElementById('screen-gameover').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('go-distance').textContent).toBe('1234 m');
    expect(document.getElementById('go-time').textContent).toBe('42.5s');
    expect(Storage.getBest()).toBe(1234);
    expect(Storage.get().totalRuns).toBe(1);
    expect(Storage.getLeaderboard().length).toBe(1);
  });

  it('showGameOver mostra a seed somente no modo diário', () => {
    UI.showGameOver({ meters: 1, time: 1, crystals: 0, seed: 555, daily: true, shipId: 'scout' });
    expect(document.getElementById('go-seed-row').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('go-seed').textContent).toBe('555');
    UI.showGameOver({ meters: 1, time: 1, crystals: 0, seed: 1, daily: false, shipId: 'scout' });
    expect(document.getElementById('go-seed-row').classList.contains('hidden')).toBe(true);
  });

  it('toggle de som atualiza Storage', () => {
    const cb = document.getElementById('set-sound');
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    expect(Storage.getSettings().sound).toBe(false);
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    expect(Storage.getSettings().sound).toBe(true);
  });

  it('selecionar e pintar uma nave persiste a skin', () => {
    document.querySelector('[data-action="hangar"]').click();
    Storage.unlock('falcon');
    Storage.setSelectedShip('falcon');
    document.getElementById('skin-color').value = '#abcdef';
    document.getElementById('skin-accent').value = '#123456';
    document.querySelector('[data-action="saveSkin"]').click();
    const s = Ships.getSkin('falcon');
    expect(s.color).toBe('#abcdef');
    expect(s.accent).toBe('#123456');
  });

  it('apagar progresso reseta o storage', () => {
    Storage.recordRun(5000, 50, 10);
    window.confirm = () => true;
    document.querySelector('[data-action="reset"]').click();
    expect(Storage.getBest()).toBe(0);
    expect(Storage.get().crystals).toBe(0);
  });

  it('comprar upgrade deduz cristais e sobe o nível', () => {
    Storage.get().crystals = 1000;
    document.querySelector('[data-action="hangar"]').click();
    document.querySelector('[data-action="buyUpgrade"][data-stat="agility"]').click();
    expect(Storage.getUpgradeLevel('agility')).toBe(1);
  });
});
