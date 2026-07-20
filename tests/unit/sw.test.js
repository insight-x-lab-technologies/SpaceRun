import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../../src');
const code = fs.readFileSync(path.join(SRC, 'sw.js'), 'utf8');

function makeSelf() {
  const handlers = {};
  return {
    location: { origin: 'http://localhost:4173' },
    clients: { matchAll: () => Promise.resolve([]) },
    skipWaiting: () => {},
    addEventListener: (t, cb) => { (handlers[t] = handlers[t] || []).push(cb); },
    _handlers: handlers
  };
}

function makeCaches(initial) {
  const store = new Map(Object.entries(initial || {}));
  const cacheObj = {
    addAll: () => Promise.resolve(),
    put: (key, val) => { store.set(typeof key === 'string' ? key : key.url, val); return Promise.resolve(); },
    match: (key) => Promise.resolve(store.get(typeof key === 'string' ? key : (key && key.url)))
  };
  return {
    _store: store,
    open: () => Promise.resolve(cacheObj),
    match: (key) => Promise.resolve(store.get(typeof key === 'string' ? key : (key && key.url))),
    keys: () => Promise.resolve([...store.keys()]),
    delete: () => Promise.resolve()
  };
}

function makeFetch(handler) {
  const calls = [];
  const fn = (req) => { calls.push(req); return handler(req); };
  fn.calls = calls;
  return fn;
}

// Carrega o sw.js num escopo isolado, injetando os globais simulados.
function load(self, caches, fetchMock) {
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', code)(self, caches, fetchMock);
  return self._handlers;
}

function fire(handlers, request) {
  let captured;
  handlers.fetch[0]({ request, respondWith: (p) => { captured = p; } });
  return captured;
}

describe('sw.js — estratégia de cache (network-first + SWR)', () => {
  it('navegação online: usa a rede e atualiza o cache de index.html', async () => {
    const self = makeSelf();
    const caches = makeCaches();
    const fetchMock = makeFetch(() => Promise.resolve({ url: 'NETWORK', clone: () => ({ url: 'NETWORK_COPY' }) }));
    const handlers = load(self, caches, fetchMock);

    const resp = await fire(handlers, { method: 'GET', url: 'http://localhost:4173/', mode: 'navigate' });
    await Promise.resolve();
    expect(resp.url).toBe('NETWORK');
    expect(fetchMock.calls.length).toBe(1);
    expect(caches._store.get('index.html')).toEqual({ url: 'NETWORK_COPY' });
  });

  it('navegação offline: cai no cache de index.html', async () => {
    const self = makeSelf();
    const caches = makeCaches({ 'index.html': { url: 'CACHE' } });
    const fetchMock = makeFetch(() => Promise.reject(new Error('offline')));
    const handlers = load(self, caches, fetchMock);

    const resp = await fire(handlers, { method: 'GET', url: 'http://localhost:4173/', mode: 'navigate' });
    expect(resp.url).toBe('CACHE');
  });

  it('asset (SWR): serve do cache e atualiza em segundo plano', async () => {
    const self = makeSelf();
    const caches = makeCaches({ 'http://localhost:4173/js/game.js': { url: 'CACHE' } });
    const fetchMock = makeFetch(() => Promise.resolve({ url: 'NETWORK', clone: () => ({ url: 'NETWORK_COPY' }) }));
    const handlers = load(self, caches, fetchMock);

    const resp = await fire(handlers, { method: 'GET', url: 'http://localhost:4173/js/game.js', mode: 'asset' });
    expect(resp.url).toBe('CACHE');        // resposta rápida vem do cache
    expect(fetchMock.calls.length).toBe(1); // atualização em background chamou a rede
  });

  it('ignora origens diferentes (terceiros)', async () => {
    const self = makeSelf();
    const caches = makeCaches();
    const fetchMock = makeFetch(() => Promise.resolve({ url: 'NETWORK' }));
    const handlers = load(self, caches, fetchMock);

    const resp = await fire(handlers, { method: 'GET', url: 'https://example.com/x.png', mode: 'asset' });
    expect(resp).toBeUndefined();
    expect(fetchMock.calls.length).toBe(0);
  });
});
