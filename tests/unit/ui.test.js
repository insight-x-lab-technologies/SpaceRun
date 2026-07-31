import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadApp, loadDOM } from '../helpers/loadApp.js';

loadDOM();
loadApp();
const { UI, I18n, Storage, Ships, Protocol } = globalThis;

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

  it('renderAchievements lista 23 conquistas', () => {
    document.querySelector('[data-action="achievements"]').click();
    expect(document.getElementById('ach-list').children.length).toBe(23);
  });

  it('abre o hub Custom Game e exibe os sete marcos de desbloqueio', () => {
    document.querySelector('[data-action="customGame"]').click();
    expect(document.getElementById('screen-custom-game').classList.contains('hidden')).toBe(false);
    expect(document.querySelectorAll('#custom-mode-list .custom-mode-card')).toHaveLength(7);
    const daily = document.querySelector('[data-action="playMode"][data-mode="daily"]');
    expect(daily.disabled).toBe(true);
    Storage.recordRun(10000, 0, 0);
    document.querySelector('[data-action="customGame"]').click();
    expect(document.querySelector('[data-action="playMode"][data-mode="daily"]').disabled).toBe(false);
    expect(document.querySelector('[data-action="playMode"][data-mode="bossrush"]').disabled).toBe(true);
  });

  it('abre o Radar de eventos com rotas curadas acessíveis offline', () => {
    document.querySelector('[data-action="events"]').click();
    expect(document.getElementById('screen-events').classList.contains('hidden')).toBe(false);
    expect(document.querySelectorAll('#event-seed-list .event-seed-card')).toHaveLength(3);
    expect(document.querySelectorAll('#event-seed-list [data-action="runCommunitySeed"]')).toHaveLength(3);
  });

  it('abre missões e coleta apenas uma recompensa diária', () => {
    document.querySelector('[data-action="missions"]').click();
    expect(document.getElementById('screen-missions').classList.contains('hidden')).toBe(false);
    const before = Storage.get().crystals;
    document.querySelector('[data-action="claimDaily"]').click();
    expect(Storage.get().crystals).toBeGreaterThan(before);
    const once = Storage.get().crystals;
    document.querySelector('[data-action="claimDaily"]').click();
    expect(Storage.get().crystals).toBe(once);
  });

  it('trocar o tema persiste em Storage e aplica no DOM', () => {
    document.querySelector('[data-action="settings"]').click();
    const sel = document.getElementById('set-theme');
    expect(sel).not.toBeNull();
    sel.value = 'retro';
    sel.dispatchEvent(new Event('change'));
    expect(Storage.getSettings().theme).toBe('retro');
    expect(document.documentElement.getAttribute('data-theme')).toBe('retro');
    sel.value = 'neon';
    sel.dispatchEvent(new Event('change'));
  });

  it('Donate deixa claro que a contribuição é opcional e abre plataformas externas com segurança', () => {
    document.querySelector('[data-action="donate"]').click();
    const screen = document.getElementById('screen-donate');
    expect(screen.classList.contains('hidden')).toBe(false);
    expect(screen.textContent).toContain(I18n.t('donate.promise'));
    const links = screen.querySelectorAll('.donate-link');
    expect(links).toHaveLength(2);
    links.forEach(link => {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
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

  it('registra e apresenta o modo selecionado no Game Over', () => {
    UI.showGameOver({ meters: 60, time: 1, crystals: 0, seed: 1, mode: 'sprint', rulesetId: 'sprint-v1', shipId: 'scout' });
    expect(document.getElementById('go-mode').textContent).toBe('Sprint');
    expect(Storage.getHistory()[0]).toMatchObject({ mode: 'sprint', rulesetId: 'sprint-v1' });
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

  it('aplica e persiste a cabine acessível F8B', () => {
    document.querySelector('[data-action="settings"]').click();
    const palette = document.getElementById('set-colorblind');
    palette.value = 'deuteranopia'; palette.dispatchEvent(new Event('change'));
    const controlMode = document.getElementById('set-control-mode');
    controlMode.value = 'toggle'; controlMode.dispatchEvent(new Event('change'));
    const oneHanded = document.getElementById('set-one-handed');
    oneHanded.checked = true; oneHanded.dispatchEvent(new Event('change'));
    expect(Storage.getSettings()).toMatchObject({ colorblind: 'deuteranopia', controlMode: 'toggle', oneHanded: true });
    expect(document.body.classList.contains('colorblind-deuteranopia')).toBe(true);
    expect(document.body.classList.contains('one-handed')).toBe(true);
    document.getElementById('set-thrust-key').click();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(Storage.getSettings().thrustKey).toBe('KeyW');
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

  it('personalização F7 permite comprar rastro e ativar vibração tátil', () => {
    Storage.recordRun(0, 0, 1000);
    document.querySelector('[data-action="hangar"]').click();
    const buy = document.querySelector('[data-action="buyCosmetic"][data-type="trail"][data-value="wave"]');
    expect(buy).not.toBeNull();
    buy.click();
    expect(Storage.getCosmetics().trail).toBe('wave');
    document.querySelector('[data-action="settings"]').click();
    const haptics = document.getElementById('set-haptics');
    haptics.checked = true;
    haptics.dispatchEvent(new Event('change'));
    expect(Storage.getSettings().haptics).toBe(true);
  });

  it('apagar progresso reseta o storage', () => {
    Storage.recordRun(5000, 50, 10);
    window.confirm = () => true;
    document.querySelector('[data-action="reset"]').click();
    expect(Storage.getBest()).toBe(0);
    expect(Storage.get().crystals).toBe(0);
  });

  it('comprar upgrade deduz cristais e sobe o nível', () => {
    Storage.recordRun(0, 0, 1000);
    document.querySelector('[data-action="hangar"]').click();
    document.querySelector('[data-action="buyUpgrade"][data-stat="agility"]').click();
    expect(Storage.getUpgradeLevel('agility')).toBe(1);
  });

  it('fila de compartilhamento social monta os links no idioma atual', () => {
    const row = document.getElementById('share-row');
    expect(row).not.toBeNull();
    const ics = row.querySelectorAll('.share-ic');
    expect(ics.length).toBe(7);

    const wa = row.querySelector('[data-share="whatsapp"]');
    expect(wa.getAttribute('href')).toContain('wa.me/?text=');
    expect(decodeURIComponent(wa.getAttribute('href'))).toContain('Check out this awesome game:');
    expect(wa.getAttribute('aria-label')).toBe('Share on WhatsApp');

    expect(row.querySelector('[data-share="telegram"]').getAttribute('href')).toContain('t.me/share/url');
    expect(row.querySelector('[data-share="x"]').getAttribute('href')).toContain('twitter.com/intent/tweet');
    expect(row.querySelector('[data-share="facebook"]').getAttribute('href')).toContain('facebook.com/sharer');

    // TikTok/Instagram não têm web-intent: usam o Web Share nativo (sem href)
    expect(row.querySelector('[data-share="tiktok"]').getAttribute('href')).toBeNull();
    expect(row.querySelector('[data-share="instagram"]').getAttribute('href')).toBeNull();
    // copy é um botão (sem href)
    expect(row.querySelector('[data-share="copy"]').getAttribute('href')).toBeNull();
  });

  it('compartilhamento usa mensagem localizada ao trocar o idioma', () => {
    const sel = document.getElementById('set-lang');
    sel.value = 'pt';
    sel.dispatchEvent(new Event('change'));
    const wa = document.getElementById('share-row').querySelector('[data-share="whatsapp"]');
    expect(decodeURIComponent(wa.getAttribute('href'))).toContain('Dê uma olhada neste jogo super legal:');
    expect(wa.getAttribute('aria-label')).toBe('Compartilhar no WhatsApp');
    sel.value = 'en';
    sel.dispatchEvent(new Event('change'));
  });

  it('mostra o link manual quando Web Share e Clipboard falham', async () => {
    const ghost = { seed: 99, mode: 'classic', rulesetId: 'classic-v2', origin: 'ab12cd34ef56', shipId: 'scout', loadout: { agility: 0, thrust: 0 }, durationTicks: 2, inputs: [], claimedScore: { m: 5, t: 1 } };
    UI.showGameOver({ meters: 5, time: 1, crystals: 0, seed: 99, mode: 'classic', rulesetId: 'classic-v2', shipId: 'scout', ghost });
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(new Error('unsupported')), configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
    Object.defineProperty(document, 'execCommand', { value: vi.fn(() => false), configurable: true });
    document.querySelector('#screen-gameover [data-action="shareGhost"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.getElementById('screen-share-link').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('share-link-input').value).toContain('?sr=');
    expect(document.getElementById('share-link-feedback').textContent).toBe(I18n.t('ghost.manual'));
  });

  it('abre prévia, salva um ghost importado e o inicia pela coleção', () => {
    const play = vi.fn();
    UI.init(play);
    const ghost = { seed: 99, mode: 'classic', rulesetId: 'classic-v2', origin: 'ab12cd34ef56', shipId: 'scout', loadout: { agility: 0, thrust: 0 }, durationTicks: 2, inputs: [[0, 'thrustOn']], claimedScore: { m: 5, t: 1 } };
    expect(UI.importSharedToken(Protocol.encode('ghost', ghost)).ok).toBe(true);
    expect(document.getElementById('screen-ghost-preview').classList.contains('hidden')).toBe(false);
    document.querySelector('[data-action="savePreview"]').click();
    expect(Storage.getGhosts(entry => entry.type === 'imported')).toHaveLength(1);
    expect(document.getElementById('screen-ghosts').classList.contains('hidden')).toBe(false);
    document.querySelector('#ghost-list-imported [data-action="runGhost"]').click();
    expect(play).toHaveBeenCalledWith('classic', expect.objectContaining({ ghost, ghostKind: 'ghost' }));
  });

  it('mantém a importação de Top 10 por link fora da coleção de ghosts', () => {
    const token = Protocol.encode('scores', { mode: 'classic', rulesetId: 'classic-v2', origin: 'ab12cd34ef56', entries: [{ name: 'Orbit', m: 9, t: 1, shipId: 'scout', loadout: { agility: 0, thrust: 0 } }] });
    expect(UI.importSharedToken(token).ok).toBe(true);
    expect(document.getElementById('screen-leaderboard').classList.contains('hidden')).toBe(false);
    document.querySelector('#screen-leaderboard [data-action="importShared"]').click();
    expect(Storage.getLeaderboard(entry => entry.source === 'imported')).toHaveLength(1);
    expect(Storage.getGhosts()).toHaveLength(0);
  });
});
