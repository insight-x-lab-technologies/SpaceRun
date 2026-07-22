import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDOM, loadApp } from '../helpers/loadApp.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../../src');

// Falso ServiceWorkerContainer com armazenamento de handlers (EventTarget mínimo).
function makeFakeSW(hasController) {
  const handlers = {};
  return {
    controller: hasController ? {} : undefined,
    register: () => Promise.resolve({}),
    addEventListener: (type, cb) => {
      (handlers[type] = handlers[type] || []).push(cb);
    },
    _emit: (type, ev) => (handlers[type] || []).forEach((cb) => cb(ev)),
  };
}

// Substitui window.location por um mock (jsdom torna reload não-configurável).
function reloadSpy() {
  const loc = { reload: vi.fn(), href: 'http://localhost/' };
  Object.defineProperty(window, 'location', { value: loc, configurable: true, writable: true });
  return loc.reload;
}

// Impede o vazamento de listeners de window entre os testes (cada bootstrap
// registra um listener 'load' que, caso acumulado, lê o fakeSW atual e dispara
// ouvintes repetidos).
function isolateWindow() {
  const registry = new Map();
  const origAdd = window.addEventListener.bind(window);
  const origRemove = window.removeEventListener.bind(window);
  window.addEventListener = (type, cb, opts) => {
    if (!registry.has(type)) registry.set(type, new Set());
    registry.get(type).add(cb);
    return origAdd(type, cb, opts);
  };
  window.removeEventListener = (type, cb, opts) => {
    if (registry.has(type)) registry.get(type).delete(cb);
    return origRemove(type, cb, opts);
  };
  return () => {
    for (const [type, set] of registry) for (const cb of set) origRemove(type, cb);
    window.addEventListener = origAdd;
    window.removeEventListener = origRemove;
  };
}

// Avalia o bootstrap (main.js) no mesmo escopo global dos módulos.
function bootstrap() {
  const code = fs.readFileSync(path.join(SRC, 'js', 'main.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(code)();
  // O registro do SW está preso no listener 'load' da window.
  window.dispatchEvent(new Event('load'));
}

describe('main.js — bootstrap e reload do Service Worker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    loadDOM();
    loadApp();
  });

  it('registra o SW e NÃO recarrega quando não havia controller (1ª visita)', () => {
    const cleanup = isolateWindow();
    try {
      const sw = makeFakeSW(false);
      Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
      const reload = reloadSpy();
      bootstrap();

      sw._emit('controllerchange');
      expect(reload).not.toHaveBeenCalled();

      sw._emit('message', { data: { type: 'SW_UPDATED', version: '0.2' } });
      expect(reload).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('não recarrega quando há controller anterior e o SW assume', () => {
    const cleanup = isolateWindow();
    try {
      const sw = makeFakeSW(true);
      Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
      const reload = reloadSpy();
      bootstrap();

      sw._emit('controllerchange');
      expect(reload).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('oferece atualização explícita ao receber SW_UPDATED', () => {
    const cleanup = isolateWindow();
    try {
      const sw = makeFakeSW(true);
      Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
      const reload = reloadSpy();
      bootstrap();

      sw._emit('message', { data: { type: 'SW_UPDATED', version: '0.2' } });
      expect(reload).not.toHaveBeenCalled();
      const notice = document.getElementById('update-notice');
      expect(notice.classList.contains('hidden')).toBe(false);
      notice.querySelector('[data-action="applyUpdate"]').click();
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      cleanup();
    }
  });

  it('aplica a atualização apenas uma vez', () => {
    const cleanup = isolateWindow();
    try {
      const sw = makeFakeSW(true);
      Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
      const reload = reloadSpy();
      bootstrap();

      sw._emit('message', { data: { type: 'SW_UPDATED', version: '0.2' } });
      const button = document.querySelector('#update-notice [data-action="applyUpdate"]');
      button.click();
      button.click();
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      cleanup();
    }
  });

  it('expõe a tela Home ao iniciar (boot sem erro)', () => {
    const cleanup = isolateWindow();
    try {
      const sw = makeFakeSW(false);
      Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true });
      bootstrap();
      expect(document.getElementById('screen-home')).not.toBeNull();
      expect(document.querySelector('.logo').textContent).toContain('SPACERUN');
      expect(document.querySelector('[data-action="play"]')).not.toBeNull();
    } finally {
      cleanup();
    }
  });
});
