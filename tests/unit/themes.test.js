import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Themes, Storage, Audio2 } = globalThis;

describe('Themes — temas (cores, fonte, áudio)', () => {
  beforeEach(() => {
    Storage.reset();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  it('expõe 3 temas com id/font/vars/audio', () => {
    expect(Themes.list.length).toBe(3);
    for (const t of Themes.list) {
      expect(typeof t.id).toBe('string');
      expect(typeof t.font).toBe('string');
      expect(t.vars['--accent']).toBeTruthy();
      expect(t.audio).toBeTruthy();
    }
  });

  it('tema padrão é neon', () => {
    expect(Themes.currentId()).toBe('neon');
  });

  it('apply define variáveis CSS, fonte e data-theme no <html>', () => {
    Themes.apply('aurora');
    const root = document.documentElement;
    expect(root.getAttribute('data-theme')).toBe('aurora');
    expect(root.style.getPropertyValue('--accent')).toBe('#b58cff');
    expect(root.style.getPropertyValue('--font')).toContain('Georgia');
  });

  it('set persiste a escolha em Storage', () => {
    Themes.set('retro');
    expect(Storage.getSettings().theme).toBe('retro');
    expect(Themes.currentId()).toBe('retro');
  });

  it('id inválido cai para neon', () => {
    expect(Themes.get('inexistente').id).toBe('neon');
    Themes.set('xxx');
    expect(Storage.getSettings().theme).toBe('neon');
  });

  it('init aplica o tema salvo', () => {
    Storage.setSetting('theme', 'retro');
    Themes.init();
    expect(document.documentElement.getAttribute('data-theme')).toBe('retro');
  });
});

// --- WebAudio fake reaproveitado dos testes de áudio ---
class FakeParam {
  constructor() { this.value = 0; }
  setValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
}
class FakeNode {
  constructor() { this.frequency = new FakeParam(); this.gain = new FakeParam(); this.type = 'sine'; }
  connect() {} start() {} stop() {}
}
class FakeAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; this.oscCount = 0; }
  createOscillator() { this.oscCount++; return new FakeNode(); }
  createGain() { return new FakeNode(); }
  resume() {}
}

describe('Audio2 — áudio por tema + MP3 opcional', () => {
  beforeEach(() => {
    globalThis.window.AudioContext = FakeAudioContext;
    Audio2.setEnabled(true);
    Audio2.setMusicEnabled(false);
    Audio2.setTheme(Themes.get('neon').audio); // volta ao padrão procedural
  });

  it('setTheme troca os parâmetros do clique sem lançar', () => {
    Audio2.setTheme(Themes.get('retro').audio);
    expect(() => Audio2.uiClick()).not.toThrow();
  });

  it('música procedural usa a sequência do tema (sem MP3)', () => {
    Audio2.setMusicEnabled(true);
    Audio2.setTheme(Themes.get('aurora').audio);
    expect(() => { Audio2.startMusic('menu'); Audio2.startMusic('game'); Audio2.stopMusic(); }).not.toThrow();
  });

  it('MP3: quando o tema define uma faixa, toca via elemento Audio', () => {
    let created = null;
    class FakeAudioEl {
      constructor(src) { created = src; this.loop = false; this.volume = 1; }
      play() { return Promise.resolve(); }
      pause() {}
    }
    globalThis.Audio = FakeAudioEl;
    globalThis.window.Audio = FakeAudioEl;
    Audio2.setMusicEnabled(true);
    Audio2.setMusicTracks('assets/audio/menu.mp3', 'assets/audio/game.mp3');
    Audio2.startMusic('menu');
    expect(created).toBe('assets/audio/menu.mp3');
    Audio2.startMusic('game');
    expect(created).toBe('assets/audio/game.mp3');
    Audio2.stopMusic();
    Audio2.setMusicTracks(null, null);
    delete globalThis.Audio;
  });
});
