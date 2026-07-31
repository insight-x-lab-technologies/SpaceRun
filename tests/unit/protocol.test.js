import { describe, expect, it } from 'vitest';
import { loadApp } from '../helpers/loadApp.js';

loadApp();
const { Protocol } = globalThis;

const ghost = {
  seed: 20260728,
  mode: 'daily',
  rulesetId: 'daily-v2',
  origin: 'ab12cd34ef56',
  shipId: 'scout',
  loadout: { agility: 0, thrust: 0 },
  durationTicks: 120,
  inputs: [[0, 'thrustOn'], [18, 'thrustOff']],
  claimedScore: { m: 123, t: 2.0 }
};

describe('Protocol — links sociais F5', () => {
  it('faz round-trip de um ghost versionado', () => {
    const token = Protocol.encode('ghost', ghost);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Protocol.decode(token)).toEqual(expect.objectContaining({ ok: true, value: expect.objectContaining({ kind: 'ghost', rulesetId: 'daily-v2', payload: ghost }) }));
  });

  it('recusa checksum corrompido, base64 inválido e conteúdo acima do limite', () => {
    const token = Protocol.encode('ghost', ghost);
    expect(Protocol.decode((token.startsWith('a') ? 'b' : 'a') + token.slice(1))).toEqual({ ok: false, reason: 'invalid' });
    expect(Protocol.decode('%%%')).toEqual({ ok: false, reason: 'invalid' });
    expect(Protocol.decode('a'.repeat(Protocol.MAX_ENCODED + 1))).toEqual({ ok: false, reason: 'tooLarge' });
  });

  it('não aceita eventos fora de ordem ou ids desconhecidos', () => {
    expect(Protocol.encode('ghost', Object.assign({}, ghost, { shipId: 'evil' }))).toBeNull();
    expect(Protocol.encode('ghost', Object.assign({}, ghost, { inputs: [[10, 'thrustOn'], [2, 'thrustOff']] }))).toBeNull();
  });

  it('mantém o schema de desafio separado e exige uma meta declarada', () => {
    expect(Protocol.encode('challenge', ghost)).toBeNull();
    const challenge = Object.assign({}, ghost, { target: { m: 120, t: 2 } });
    const token = Protocol.encode('challenge', challenge);
    expect(Protocol.decode(token)).toEqual(expect.objectContaining({ ok: true, value: expect.objectContaining({ kind: 'challenge', payload: challenge }) }));
  });
});
