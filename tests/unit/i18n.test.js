import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { I18n, Storage } = globalThis;

describe('I18n — internacionalização pt/en/es', () => {
  beforeEach(() => {
    Storage.reset();
    localStorage.clear();
  });

  it('traduz chaves conhecidas nos três idiomas', () => {
    expect(I18n.t('menu.play')).toBe('New Game'); // padrão en
    I18n.setLang('pt');
    expect(I18n.t('menu.play')).toBe('Novo Jogo');
    I18n.setLang('es');
    expect(I18n.t('menu.play')).toBe('Nuevo Juego');
  });

  it('detecta o idioma do navegador (pt/es) e cai em en', () => {
    const saved = navigator.language;
    Object.defineProperty(navigator, 'language', { value: 'pt-BR', configurable: true });
    I18n.init();
    expect(I18n.lang).toBe('pt');
    Object.defineProperty(navigator, 'language', { value: 'es-AR', configurable: true });
    I18n.init();
    expect(I18n.lang).toBe('es');
    Object.defineProperty(navigator, 'language', { value: 'fr-FR', configurable: true });
    I18n.init();
    expect(I18n.lang).toBe('en');
    Object.defineProperty(navigator, 'language', { value: saved, configurable: true });
  });

  it('interpola variáveis {n}', () => {
    I18n.setLang('en');
    expect(I18n.t('milestone.reach', { n: 5000 })).toBe('5000 m!');
  });

  it('cai no inglês para chave inexistente', () => {
    expect(I18n.t('does.not.exist')).toBe('does.not.exist');
  });

  it('aplica textos data-i18n no DOM', () => {
    document.body.innerHTML = '<h2 data-i18n="menu.play">x</h2><p data-i18n="ready.msg">y</p>';
    I18n.init();
    I18n.apply();
    expect(document.querySelector('[data-i18n="menu.play"]').textContent).toBe('New Game');
    expect(document.querySelector('[data-i18n="ready.msg"]').textContent).toBe('Press SPACE or tap the screen to start');
  });

  it('todas as 20 naves têm descrição nos 3 idiomas', () => {
    for (const s of globalThis.Ships.list) {
      for (const lang of ['pt', 'en', 'es']) {
        I18n.setLang(lang);
        expect(I18n.t('ship.' + s.id + '.desc').length).toBeGreaterThan(0);
      }
    }
  });
});
