/* Envelope seguro e versionado para links compartilhados (F5). */
const Protocol = (() => {
  const VERSION = 1;
  const MAX_ENCODED = 12288;
  const MAX_JSON = 8192;
  const MODES = ['classic', 'daily', 'zen', 'sprint', 'hardcore', 'marathon', 'timeattack', 'bossrush'];
  const SHIPS = ['scout', 'falcon', 'tank', 'phantom', 'nova', 'vortex', 'quasar', 'pulsar', 'nebula', 'singularity', 'comet', 'aurora', 'raptor', 'helix', 'titan', 'spectre', 'ember', 'zephyr', 'cosmos', 'eclipse'];
  const EVENTS = ['thrustOn', 'thrustOff'];

  function isObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function uint(v, max) { const n = Number(v); return Number.isSafeInteger(n) && n >= 0 && n <= max ? n : null; }
  function text(v, max) { return typeof v === 'string' && v.length <= max ? v : null; }
  function hash(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function toBase64(value) {
    return btoa(unescape(encodeURIComponent(value))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function fromBase64(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
    try { return decodeURIComponent(escape(atob(padded))); } catch (e) { return null; }
  }
  function ruleset(v) { return typeof v === 'string' && /^[a-z]+-v\d+$/.test(v) && v.length <= 32 ? v : null; }
  function loadout(v) {
    if (!isObject(v)) return null;
    const agility = uint(v.agility, 10); const thrust = uint(v.thrust, 10);
    return agility === null || thrust === null ? null : { agility, thrust };
  }
  function score(v) {
    if (!isObject(v)) return null;
    const m = uint(v.m, Number.MAX_SAFE_INTEGER); const t = Number(v.t);
    return m === null || !Number.isFinite(t) || t < 0 || t > 1e9 ? null : { m, t: Math.round(t * 10) / 10 };
  }
  function ghost(v) {
    if (!isObject(v)) return null;
    const seed = uint(v.seed, 0xffffffff); const mode = text(v.mode, 16); const rs = ruleset(v.rulesetId); const origin = text(v.origin, 24);
    const shipId = text(v.shipId, 24); const durationTicks = uint(v.durationTicks, 21600); const snapshot = loadout(v.loadout); const claimedScore = score(v.claimedScore);
    if (seed === null || !MODES.includes(mode) || !rs || !origin || !/^[a-z0-9]{8,24}$/.test(origin) || !SHIPS.includes(shipId) || durationTicks === null || !snapshot || !claimedScore || !Array.isArray(v.inputs) || v.inputs.length > 6000) return null;
    let last = -1; const inputs = [];
    for (const event of v.inputs) {
      if (!Array.isArray(event) || event.length !== 2) return null;
      const tick = uint(event[0], durationTicks); const kind = text(event[1], 12);
      if (tick === null || !EVENTS.includes(kind) || tick <= last) return null;
      last = tick; inputs.push([tick, kind]);
    }
    return { seed, mode, rulesetId: rs, origin, shipId, loadout: snapshot, durationTicks, inputs, claimedScore };
  }
  function scores(v) {
    if (!isObject(v) || !Array.isArray(v.entries) || v.entries.length > 10) return null;
    const mode = text(v.mode, 16); const rs = ruleset(v.rulesetId); const origin = text(v.origin, 32);
    if (!MODES.includes(mode) || !rs || !origin) return null;
    const entries = [];
    for (const entry of v.entries) {
      if (!isObject(entry)) return null;
      const s = score(entry); const name = text(entry.name, 16); const shipId = text(entry.shipId, 24); const snapshot = loadout(entry.loadout);
      if (!s || name === null || !SHIPS.includes(shipId) || !snapshot) return null;
      entries.push({ name, m: s.m, t: s.t, shipId, loadout: snapshot });
    }
    return { mode, rulesetId: rs, origin, entries };
  }
  function challenge(v) {
    const base = ghost(v);
    const target = isObject(v) ? score(v.target) : null;
    return base && target ? Object.assign({}, base, { target }) : null;
  }
  function validate(kind, payload) {
    return kind === 'ghost' ? ghost(payload)
      : kind === 'challenge' ? challenge(payload)
        : kind === 'scores' ? scores(payload) : null;
  }
  function encode(kind, payload) {
    const clean = validate(kind, payload);
    if (!clean) return null;
    const body = { protocolVersion: VERSION, kind, createdAt: Date.now(), gameVersion: '0.8.2', rulesetId: clean.rulesetId, payload: clean };
    body.checksum = hash(JSON.stringify(body));
    const encoded = toBase64(JSON.stringify(body));
    return encoded.length <= MAX_ENCODED ? encoded : null;
  }
  function decode(encoded) {
    if (typeof encoded !== 'string' || encoded.length === 0) return { ok: false, reason: 'invalid' };
    if (encoded.length > MAX_ENCODED) return { ok: false, reason: 'tooLarge' };
    const raw = fromBase64(encoded);
    if (!raw) return { ok: false, reason: 'invalid' };
    if (raw.length > MAX_JSON) return { ok: false, reason: 'tooLarge' };
    let body; try { body = JSON.parse(raw); } catch (e) { return { ok: false, reason: 'invalid' }; }
    if (!isObject(body) || body.protocolVersion !== VERSION || !['ghost', 'challenge', 'scores'].includes(body.kind) || !ruleset(body.rulesetId) || !isObject(body.payload) || typeof body.checksum !== 'string') return { ok: false, reason: 'unsupported' };
    const expected = hash(JSON.stringify({ protocolVersion: body.protocolVersion, kind: body.kind, createdAt: body.createdAt, gameVersion: body.gameVersion, rulesetId: body.rulesetId, payload: body.payload }));
    if (body.checksum !== expected) return { ok: false, reason: 'invalid' };
    const payload = validate(body.kind, body.payload);
    if (!payload || payload.rulesetId !== body.rulesetId) return { ok: false, reason: 'invalid' };
    return { ok: true, value: { kind: body.kind, createdAt: uint(body.createdAt, 4102444800000) || 0, rulesetId: body.rulesetId, payload } };
  }
  return { VERSION, MAX_ENCODED, encode, decode, validateGhost: ghost, validateChallenge: challenge };
})();
