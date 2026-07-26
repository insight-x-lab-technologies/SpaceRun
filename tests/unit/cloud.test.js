import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Cloud } = globalThis;

describe('Cloud — categorias de placar por modo e ruleset', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('spacerun.cloud.session', JSON.stringify({ access_token: 'test-token', user: { id: 'pilot-id' } }));
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 204, json: async () => [] }));
  });

  it('envia o modo completo ao placar remoto sem reduzi-lo a Classic', async () => {
    await expect(Cloud.submitScore({ m: 321, t: 9.5, mode: 'bossrush', rulesetId: 'bossrush-v1', shipId: 'scout' })).resolves.toBe(true);
    const [, options] = globalThis.fetch.mock.calls.at(-1);
    expect(JSON.parse(options.body)).toMatchObject({ p_mode: 'bossrush', p_ruleset: 'bossrush-v1' });
  });

  it('consulta o Top 10 global apenas da categoria selecionada', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
    await expect(Cloud.leaderboard('timeattack', 'timeattack-v1')).resolves.toEqual([]);
    expect(globalThis.fetch.mock.calls.at(-1)[0]).toContain('mode=eq.timeattack');
    expect(globalThis.fetch.mock.calls.at(-1)[0]).toContain('ruleset_id=eq.timeattack-v1');
  });
});
