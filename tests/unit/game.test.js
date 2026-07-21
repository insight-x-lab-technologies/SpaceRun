import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { loadApp, loadDOM } from '../helpers/loadApp.js';

loadDOM();
loadApp();
const { Game, Input, Storage, Ships } = globalThis;

let lastState = null;
let onOverPayload = null;
const realPerf = performance.now;

beforeAll(() => {
  // Relógio controlado para garantir simulação determinística.
  performance.now = () => globalThis.__ts;
  const canvas = document.getElementById('game-canvas');
  Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
  Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
  Game.init(canvas, (p) => { onOverPayload = p; }, (s) => { lastState = s; });
});

afterAll(() => {
  performance.now = realPerf;
});

beforeEach(() => {
  globalThis.__ts = 0;
  onOverPayload = null;
  Storage.reset();
  localStorage.clear();
  // libera qualquer empuxo "travado" de testes anteriores
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
});

// Mantém a nave viva (sem colidir) durante a simulação determinística.
function keepAlive() {
  const s = Game._debug.ship;
  if (s) s.vy = (300 - s.y) * 5;
}
function startPlaying() {
  Game.start('classic');
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); // solta; keepAlive controla a nave
}

describe('Game — máquina de estados e ciclo de vida', () => {
  it('start entra em ready; primeiro input vai para playing', () => {
    Game.start('classic');
    expect(Game.state).toBe('ready');
    expect(lastState).toBe('ready');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(Game.state).toBe('playing');
  });

  it('pause/resume e stop transitam corretamente', () => {
    startPlaying();
    Game.pause();
    expect(Game.state).toBe('paused');
    Game.resume();
    expect(Game.state).toBe('playing');
    Game.stop();
    expect(Game.state).toBe('idle');
  });

  it('a simulação avança metros com o tempo', () => {
    startPlaying();
    for (let i = 0; i < 120; i++) { keepAlive(); globalThis.stepFrames(1); }
    expect(Game.getHud().meters).toBeGreaterThan(0);
  });
});

describe('Game — colisão e game over', () => {
  it('hit() fatal leva a "over" e dispara onOver após 700ms', () => {
    vi.useFakeTimers();
    startPlaying();
    Game._debug.hit();
    expect(Game.state).toBe('over');
    vi.advanceTimersByTime(700);
    expect(onOverPayload).not.toBeNull();
    expect(typeof onOverPayload.meters).toBe('number');
    vi.useRealTimers();
  });

  it('shield absorve o primeiro hit (não termina o jogo)', () => {
    Storage.unlock('tank');
    Storage.setSelectedShip('tank');
    Game.start('classic');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    for (let i = 0; i < 100; i++) { keepAlive(); globalThis.stepFrames(1); } // espera cooldown inicial
    // ativa escudo via tecla de habilidade (Shift / botão dedicado)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
    expect(Game.getHud().shield).toBe(true);
    Game._debug.hit();
    expect(Game.state).toBe('playing'); // escudo absorveu
  });
});

describe('Game — habilidades (tecla/botão dedicado)', () => {
  it('falcon (dash) ativa o dash', () => {
    Storage.unlock('falcon');
    Storage.setSelectedShip('falcon');
    startPlaying();
    for (let i = 0; i < 100; i++) { keepAlive(); globalThis.stepFrames(1); } // espera cooldown inicial
    // habilidade via tecla (Shift / botão dedicado)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
    expect(Game.getHud().dash).toBe(true);
  });
});

describe('Game — Daily Run determinístico e por dia', () => {
  function captureDaily() {
    Game.start('daily');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    for (let i = 0; i < 300; i++) { keepAlive(); globalThis.stepFrames(1); }
    const obs = Game._debug.obstacles
      .map((o) => `${o.type}:${Math.round(o.x)}:${Math.round(o.y)}:${Math.round(o.r)}`)
      .join('|');
    return { obs, seed: Game._debug.world.seed };
  }

  it('duas partidas no mesmo dia geram o mesmo mundo (paridade)', () => {
    const a = captureDaily();
    const b = captureDaily();
    expect(a.seed).toBe(b.seed);
    expect(a.obs).toBe(b.obs);
  });

  it('daily difere de uma partida clássica (seed aleatória)', () => {
    const daily = captureDaily();
    const classic = (() => {
      Game.start('classic');
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      for (let i = 0; i < 30; i++) { keepAlive(); globalThis.stepFrames(1); }
      return Game._debug.world.seed;
    })();
    expect(daily.seed).not.toBe(classic);
  });

  it('a seed muda de um dia para o outro', () => {
    const RealDate = globalThis.Date;
    function setFakeDate(y, m, d) {
      const Fake = function (...args) {
        if (args.length === 0) return new RealDate(y, m - 1, d, 12, 0, 0);
        return new RealDate(...args);
      };
      Fake.now = () => new RealDate(y, m - 1, d, 12, 0, 0).getTime();
      Object.setPrototypeOf(Fake, RealDate);
      globalThis.Date = Fake;
    }
    setFakeDate(2026, 7, 19);
    Game.start('daily');
    const seedA = Game._debug.world.seed;
    expect(seedA).toBe(20260719);
    setFakeDate(2026, 7, 20);
    Game.start('daily');
    const seedB = Game._debug.world.seed;
    expect(seedB).toBe(20260720);
    expect(seedA).not.toBe(seedB);
    globalThis.Date = RealDate;
  });

  // O mundo do Daily Run deve ser idêntico mesmo quando o relógio de frames
  // varia (rAF real), pois o spawn agora é indexado por distância, não por dt.
  it('daily é determinístico com frame timing irregular', () => {
    Game._debug.recordSpawns(true);
    const dts = [8, 15, 20, 12, 17, 9, 22, 14, 16, 19];
    function run() {
      Game.start('daily');
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
      for (let i = 0; i < 300; i++) { keepAlive(); Game._debug.tick(dts[i % dts.length] / 1000); }
      return Game._debug.getSpawnSig();
    }
    const a = run();
    const b = run();
    expect(a.length).toBeGreaterThan(0);
    expect(a.map((s) => s.type)).toEqual(b.map((s) => s.type));
    expect(a.map((s) => Math.round(s.y / 2))).toEqual(b.map((s) => Math.round(s.y / 2)));
    Game._debug.recordSpawns(false);
  });

  // Uso de dash (wf=2.2) não deve alterar a sequência de obstáculos: o layout
  // por distância garante que o obstáculo N seja sempre o mesmo (a corrida
  // mais rápida apenas alcança mais longe, então a run com dash é sufixo).
  it('daily é determinístico mesmo usando dash (habilidade)', () => {
    Storage.unlock('falcon');
    Storage.setSelectedShip('falcon');
    Game._debug.recordSpawns(true);
    function run(useDash) {
      Game.start('daily');
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
      for (let i = 0; i < 300; i++) {
        keepAlive();
        if (useDash && i === 50) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
        globalThis.stepFrames(1);
      }
      return Game._debug.getSpawnSig();
    }
    const a = run(false);
    const b = run(true);
    const sig = (arr) => arr.map((s) => `${s.type}:${Math.round(s.y / 2)}`);
    // a run sem dash é prefixo da run com dash (mesmo layout, mais longe)
    expect(sig(b).slice(0, a.length)).toEqual(sig(a));
    Game._debug.recordSpawns(false);
  });
});
