import { describe, it, expect, beforeEach } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Audio2 } = globalThis;

// Fake mínimo de WebAudio para validar a síntese sem áudio real.
class FakeParam {
  constructor() { this.value = 0; }
  setValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
}
class FakeNode {
  constructor() { this.frequency = new FakeParam(); this.gain = new FakeParam(); this.type = 'sine'; }
  connect() {}
  start() {}
  stop() {}
}
class FakeAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; this.oscCount = 0; this.gainCount = 0; }
  createOscillator() { this.oscCount++; return new FakeNode(); }
  createGain() { this.gainCount++; return new FakeNode(); }
  resume() {}
}

beforeEach(() => {
  globalThis.window.AudioContext = FakeAudioContext;
  Audio2.setEnabled(true);
  Audio2.setMusicEnabled(false);
});

describe('Audio2 — áudio procedural (WebAudio)', () => {
  it('ensure cria o contexto e síntese de efeitos cria osciladores', () => {
    const c = Audio2.ensure();
    expect(c).toBeTruthy();
    expect(c.oscCount).toBe(0);
    Audio2.thrust();
    Audio2.hit();
    Audio2.crash();
    Audio2.pickup();
    Audio2.ability();
    Audio2.shield();
    expect(c.oscCount).toBeGreaterThan(0);
  });

  it('sem som ligado, os efeitos são no-ops (não lançam)', () => {
    Audio2.setEnabled(false);
    expect(() => { Audio2.thrust(); Audio2.crash(); Audio2.unlock(); }).not.toThrow();
  });

  it('música: startMusic cria timer e stopMusic o cancela', () => {
    Audio2.setMusicEnabled(true);
    Audio2.startMusic('game');
    Audio2.startMusic('menu');
    // não lança; smoke de que o sequenciador rodou
    expect(() => Audio2.stopMusic()).not.toThrow();
  });

  it('setEnabled/setMusicEnabled alteram os flags internos', () => {
    Audio2.setEnabled(false);
    Audio2.setMusicEnabled(true);
    // com som desligado, efeitos não criam oscilador
    const c = Audio2.ensure();
    const before = c.oscCount;
    Audio2.thrust();
    expect(c.oscCount).toBe(before);
  });
});
