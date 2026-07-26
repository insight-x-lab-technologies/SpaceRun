/* Cliente Supabase sem SDK. A chave publicável é apropriada para o navegador; RLS protege os dados. */
const Cloud = (() => {
  const URL = 'https://wpbryudhqerpnzbpmcio.supabase.co';
  const KEY = 'sb_publishable_YvN2XGdZp8IidXB9zOtC-g_wy9RkeXN';
  const SCHEMA = 'spacerun';
  const MODES = ['classic', 'daily', 'zen', 'sprint', 'hardcore', 'marathon', 'timeattack', 'bossrush'];
  let token = null, userId = null, ready = false;
  function headers(extra) { return Object.assign({ apikey: KEY, Authorization: 'Bearer ' + (token || KEY), 'Accept-Profile': SCHEMA, 'Content-Profile': SCHEMA, 'Content-Type': 'application/json' }, extra || {}); }
  async function request(path, options) {
    const res = await fetch(URL + path, Object.assign({ headers: headers() }, options || {}));
    if (!res.ok) throw new Error('cloud-' + res.status);
    return res.status === 204 ? null : res.json();
  }
  async function init() {
    if (ready) return true;
    try {
      const cached = sessionStorage.getItem('spacerun.cloud.session');
      if (cached) { const s = JSON.parse(cached); if (s && s.access_token && s.user && s.user.id) { token = s.access_token; userId = s.user.id; ready = true; return true; } }
      const res = await fetch(URL + '/auth/v1/signup', { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error('anonymous-auth-disabled');
      const body = await res.json();
      // O endpoint REST do GoTrue retorna token no topo; o SDK o embrulha em `session`.
      const s = body.session || body; const user = s.user || body.user;
      if (!s || !s.access_token || !user || !user.id) throw new Error('anonymous-session');
      token = s.access_token; userId = user.id; sessionStorage.setItem('spacerun.cloud.session', JSON.stringify({ access_token: token, user: { id: userId } })); ready = true; return true;
    } catch (e) { ready = false; return false; }
  }
  async function syncProfile(profile) {
    if (!await init()) return false;
    try { await request('/rest/v1/profiles?on_conflict=user_id', { method: 'POST', headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ user_id: userId, display_name: String(profile.name || '').slice(0, 16), xp: Math.max(0, Math.floor(profile.xp || 0)), level: Math.max(1, Math.floor(profile.level || 1)) }) }); return true; } catch (e) { return false; }
  }
  async function submitScore(run) {
    if (!await init()) return false;
    const mode = MODES.includes(run && run.mode) ? run.mode : null;
    const ruleset = typeof (run && run.rulesetId) === 'string' ? run.rulesetId.slice(0, 32) : '';
    if (!mode || !ruleset) return false;
    try { await request('/rest/v1/rpc/submit_score', { method: 'POST', body: JSON.stringify({ p_distance: Math.max(0, Math.floor(run.m || 0)), p_duration: Math.max(0, Number(run.t || 0)), p_mode: mode, p_ruleset: ruleset, p_ship: String(run.shipId || 'scout').slice(0, 32) }) }); return true; } catch (e) { return false; }
  }
  async function leaderboard(mode, rulesetId) {
    if (!await init()) return [];
    if (!MODES.includes(mode) || typeof rulesetId !== 'string' || !rulesetId) return [];
    const query = '/rest/v1/global_leaderboard?select=display_name,distance,duration,mode,ruleset_id,ship_id&mode=eq.' + encodeURIComponent(mode) + '&ruleset_id=eq.' + encodeURIComponent(rulesetId) + '&order=distance.desc,duration.asc&limit=10';
    try { const rows = await request(query); return Array.isArray(rows) ? rows : []; } catch (e) { return []; }
  }
  return { init, syncProfile, submitScore, leaderboard, isReady: () => ready };
})();
