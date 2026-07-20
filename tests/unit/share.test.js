import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp, loadDOM } from '../helpers/loadApp.js';

loadDOM();
loadApp();
const { Share, I18n, Storage } = globalThis;

describe('Share — score card procedural (canvas)', () => {
  beforeEach(() => {
    Storage.reset();
    localStorage.clear();
    I18n.init();
  });

  it('render não lança e produz um data URL', () => {
    const canvas = document.getElementById('share-canvas');
    expect(() => Share.render(canvas, { meters: 1234, time: 42.5, crystals: 7, shipId: 'scout', daily: false })).not.toThrow();
    // toDataURL está stubado para retornar um data URL
    expect(canvas.toDataURL('image/png')).toMatch(/^data:image\/png/);
  });

  it('render funciona para qualquer nave (skins)', () => {
    for (const s of globalThis.Ships.list) {
      const canvas = document.getElementById('share-canvas');
      expect(() => Share.render(canvas, { meters: 1, time: 1, crystals: 0, shipId: s.id })).not.toThrow();
    }
  });
});
