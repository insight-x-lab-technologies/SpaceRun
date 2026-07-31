/* Gerenciamento de telas e UI */
const UI = (() => {
  const screens = {};
  let onPlay = null;
  let lastResult = null;
  let milestoneEl = null;
  let achievementEl = null;
  let achQueue = [], achShowing = false;
  let updateApply = null;
  let lastFocused = null;
  let lastMode = 'classic';
  let pendingShared = null;
  let sharedPreviewError = null;
  let shareReturnScreen = 'screen-gameover';
  const MODE_RULESETS = { classic: 'classic-v2', daily: 'daily-v2', zen: 'zen-v1', sprint: 'sprint-v1', hardcore: 'hardcore-v1', marathon: 'marathon-v1', timeattack: 'timeattack-v1', bossrush: 'bossrush-v1' };
  const CUSTOM_MODES = ['daily', 'zen', 'sprint', 'hardcore', 'marathon', 'timeattack', 'bossrush'];

  function show(id) {
    if (id) lastFocused = document.activeElement;
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    if (id) {
      screens[id].classList.remove('hidden');
      const target = screens[id].querySelector('h1, h2, button, [tabindex]');
      if (target) { target.setAttribute('tabindex', target.matches('h1,h2') ? '-1' : target.getAttribute('tabindex') || '0'); target.focus({ preventScroll: true }); }
    } else if (lastFocused && document.contains(lastFocused) && !lastFocused.classList.contains('hidden')) {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function refreshRecords() {
    const best = Storage.getBest();
    const b = best + ' m';
    const hb = document.getElementById('home-best');
    const ab = document.getElementById('hangar-best');
    if (hb) hb.textContent = b;
    if (ab) ab.textContent = b;

    const data = Storage.getSnapshot();
    const runs = data.totalRuns;
    const time = data.bestTime ? data.bestTime.toFixed(1) + 's' : '0s';
    const hr = document.getElementById('home-runs');
    const ht = document.getElementById('home-time');
    const ar = document.getElementById('hangar-runs');
    const at = document.getElementById('hangar-time');
    if (hr) hr.textContent = runs;
    if (ht) ht.textContent = time;
    if (ar) ar.textContent = runs;
    if (at) at.textContent = time;
  }

  function renderCustomModes() {
    const wrap = document.getElementById('custom-mode-list');
    if (!wrap) return;
    wrap.replaceChildren();
    CUSTOM_MODES.forEach(mode => {
      const unlocked = Storage.isModeUnlocked(mode);
      const milestone = Storage.getModeMilestone(mode);
      const card = document.createElement('article');
      card.className = 'custom-mode-card' + (unlocked ? '' : ' locked');
      const copy = document.createElement('div');
      const title = document.createElement('h3'); title.textContent = I18n.t('mode.' + mode);
      const desc = document.createElement('p'); desc.textContent = I18n.t('mode.' + mode + '.desc');
      const progress = document.createElement('p'); progress.className = 'custom-mode-progress';
      progress.textContent = unlocked ? I18n.t('custom.unlocked') : I18n.t('custom.locked', { n: milestone });
      copy.append(title, desc, progress);
      const play = document.createElement('button');
      play.className = 'btn small'; play.type = 'button'; play.dataset.action = 'playMode'; play.dataset.mode = mode;
      play.disabled = !unlocked;
      play.textContent = unlocked ? I18n.t('custom.play') : '🔒';
      card.append(copy, play);
      wrap.appendChild(card);
    });
  }

  /* Aplica classes de acessibilidade no <body> conforme as configurações */
  function applyAccessibility() {
    const s = Storage.getSettings();
    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
    document.body.classList.toggle('high-contrast', !!s.highContrast);
    document.body.classList.toggle('one-handed', !!s.oneHanded);
    ['protanopia', 'deuteranopia', 'tritanopia'].forEach(mode => document.body.classList.toggle('colorblind-' + mode, s.colorblind === mode));
  }

  /* Ícones de compartilhamento social no footer da Home */
  function shareUrl() {
    return location.origin + location.pathname;
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t);
    }
    return new Promise(res => {
      const ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); res();
    });
  }
  function updateShare() {
    const row = document.getElementById('share-row');
    if (!row) return;
    const url = shareUrl();
    const msg = I18n.t('share.game', { url });
    row.querySelectorAll('.share-ic').forEach(el => {
      const net = el.dataset.share;
      const label = I18n.t('share.net.' + net);
      el.setAttribute('aria-label', label);
      el.setAttribute('title', label);
      if (net === 'whatsapp') el.href = 'https://wa.me/?text=' + encodeURIComponent(msg);
      else if (net === 'telegram') el.href = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(msg);
      else if (net === 'x') el.href = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(msg);
      else if (net === 'facebook') el.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
      else { el.removeAttribute('href'); } // tiktok/instagram/copy usam handlers próprios
    });
  }
  function wireShare() {
    const row = document.getElementById('share-row');
    if (!row || row.dataset.wired) return;
    row.dataset.wired = '1';
    row.addEventListener('click', e => {
      const el = e.target.closest('.share-ic');
      if (!el) return;
      const net = el.dataset.share;
      const url = shareUrl();
      const msg = I18n.t('share.game', { url });
      if (net === 'tiktok' || net === 'instagram') {
        e.preventDefault();
        if (navigator.share) {
          navigator.share({ title: 'SpaceRun', text: msg, url }).catch(() => {});
        } else {
          window.open(net === 'tiktok' ? 'https://www.tiktok.com' : 'https://www.instagram.com', '_blank', 'noopener');
        }
      } else if (net === 'copy') {
        e.preventDefault();
        copyText(url).then(() => showAchievement(I18n.t('share.copied'))).catch(() => {});
      }
    });
  }

  function renderHangar() {
    const list = document.getElementById('ship-list');
    list.innerHTML = '';
    const data = Storage.getSnapshot();
    Ships.list.forEach(s => {
      const unlocked = Storage.isUnlocked(s.id);
      const selected = data.selectedShip === s.id;
      const card = document.createElement('div');
      card.className = 'ship-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');

      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const cctx = cv.getContext('2d');
      const skin = Ships.getSkin(s.id);
      s.draw(cctx, 32, 32, 44, 24, performance.now(), false, skin.color, skin.accent);

      const info = document.createElement('div');
      info.className = 'ship-info';
      const lockTxt = unlocked ? '' :
        `<div class="ship-lock">${I18n.t('ship.locked', { n: s.unlockAt })}</div>`;
      info.innerHTML = `
        <div class="ship-name">${s.name}</div>
        <div class="ship-desc">${I18n.t('ship.' + s.id + '.desc')}</div>
        <div class="ship-stat">${I18n.t('ship.stat', { a: s.stats.agility.toFixed(2), s: s.stats.size.toFixed(2) })}</div>
        ${lockTxt}`;

      card.appendChild(cv);
      card.appendChild(info);

      if (unlocked) {
        card.addEventListener('click', () => {
          Storage.setSelectedShip(s.id);
          renderHangar();
        });
      }
      list.appendChild(card);
    });

    renderHangarExtra();
  }

  /* Seção de personalização (skins) + upgrades + habilidade (Fase 2) */
  function renderHangarExtra() {
    const extra = document.getElementById('hangar-extra');
    if (!extra) return;
    const sel = Storage.get().selectedShip;
    const def = Ships.get(sel);
    const skin = Ships.getSkin(sel);
    const ability = def.ability ? I18n.t('ability.' + def.ability) : I18n.t('ability.none');
    const agLvl = Storage.getUpgradeLevel('agility');
    const thLvl = Storage.getUpgradeLevel('thrust');
    const agCost = Storage.getUpgradeCost('agility');
    const thCost = Storage.getUpgradeCost('thrust');
    const crystals = Storage.get().crystals;
    const cosmetics = Storage.getCosmetics();

    const upBtn = (stat, cost) => {
      if (cost == null) return `<span class="maxed">${I18n.t('hangar.maxed')}</span>`;
      const dis = crystals < cost ? 'disabled' : '';
      return `<button class="btn small" data-action="buyUpgrade" data-stat="${stat}" ${dis}>${I18n.t('hangar.cost', { n: cost })}</button>`;
    };
    const cosmeticChoices = (type, values) => values.map(value => {
      const key = type + ':' + value;
      const unlocked = cosmetics.unlocked.includes(key);
      const selected = cosmetics[type] === value;
      const cost = Storage.getCosmeticCost(type, value);
      const action = unlocked ? 'selectCosmetic' : 'buyCosmetic';
      const suffix = selected ? I18n.t('hangar.unlocked') : (unlocked ? I18n.t('hangar.select') : I18n.t('hangar.cost', { n: cost }));
      const disabled = !unlocked && crystals < cost ? 'disabled' : '';
      return `<button class="cosmetic-chip${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}" data-action="${action}" data-type="${type}" data-value="${value}" ${disabled}><span>${I18n.t('cosmetic.' + type + '.' + value) || I18n.t('title.' + value)}</span><small>${suffix}</small></button>`;
    }).join('');
    const titleChoices = ['cadet', 'voyager', 'legend'].map(value => {
      const key = 'title:' + value;
      const unlocked = cosmetics.unlocked.includes(key);
      const selected = cosmetics.title === value;
      const label = unlocked ? (selected ? I18n.t('hangar.unlocked') : I18n.t('hangar.select')) : I18n.t('hangar.unlockAt', { n: value === 'voyager' ? '10.000' : '100.000' });
      return `<button class="cosmetic-chip${selected ? ' selected' : ''}${unlocked ? '' : ' locked'}" data-action="selectCosmetic" data-type="title" data-value="${value}" ${unlocked ? '' : 'disabled'}><span>${I18n.t('title.' + value)}</span><small>${label}</small></button>`;
    }).join('');

    extra.innerHTML = `
      <div class="hangar-section">
        <h3>${I18n.t('hangar.customize')}</h3>
        <div class="customize-row">
          <label>${I18n.t('hangar.color')}</label>
          <input type="color" id="skin-color" value="${skin.color}">
          <label>${I18n.t('hangar.accent')}</label>
          <input type="color" id="skin-accent" value="${skin.accent}">
        </div>
        <div class="customize-actions">
          <button class="btn small" data-action="saveSkin">${I18n.t('hangar.saveSkin')}</button>
          <button class="btn small" data-action="resetSkin">${I18n.t('hangar.resetSkin')}</button>
        </div>
        <div class="ability-line">${I18n.t('hangar.ability')}: <b>${ability}</b></div>
      </div>
      <div class="hangar-section">
        <h3>${I18n.t('hangar.upgrades')}</h3>
        <div class="upgrade-row">
          <span>${I18n.t('hangar.upAgility')} — ${I18n.t('hangar.level', { n: agLvl })}</span>
          ${upBtn('agility', agCost)}
        </div>
        <div class="upgrade-row">
          <span>${I18n.t('hangar.upThrust')} — ${I18n.t('hangar.level', { n: thLvl })}</span>
          ${upBtn('thrust', thCost)}
        </div>
        <div class="crystals-line">${I18n.t('hangar.crystals', { n: crystals })}</div>
      </div>
      <div class="hangar-section expression-section">
        <h3>${I18n.t('hangar.expression')}</h3>
        <div class="expression-label">${I18n.t('hangar.trail')}</div>
        <div class="cosmetic-grid">${cosmeticChoices('trail', ['ion', 'wave', 'stars', 'flame'])}</div>
        <div class="expression-label">${I18n.t('hangar.explosion')}</div>
        <div class="cosmetic-grid">${cosmeticChoices('explosion', ['nova', 'neon', 'particles', 'wave'])}</div>
        <div class="expression-label">${I18n.t('hangar.titleTag')}</div>
        <div class="cosmetic-grid">${titleChoices}</div>
      </div>
    `;
  }

  /* Tela de Conquistas (Fase 3) */
  function renderAchievements() {
    const wrap = document.getElementById('ach-list');
    if (!wrap) return;
    const defs = Achievements.all();
    const total = defs.length;
    const unlocked = defs.filter(d => Achievements.isUnlocked(d.id)).length;
    const label = document.getElementById('ach-count');
    if (label) label.textContent = I18n.t('ach.unlockedLabel', { n: unlocked, total });
    wrap.innerHTML = '';
    defs.forEach(d => {
      const has = Achievements.isUnlocked(d.id);
      const card = document.createElement('div');
      card.className = 'ach-card' + (has ? ' unlocked' : ' locked');
      card.innerHTML = `
        <div class="ach-name">${has ? '🏆 ' : '🔒 '}${Achievements.getName(d.id)}</div>
        <div class="ach-desc">${Achievements.getDesc(d.id)}</div>
        ${has ? '' : `<div class="ach-locked">${I18n.t('ach.locked')}</div>`}
      `;
      wrap.appendChild(card);
    });
  }

  /* Tela de Estatísticas (Fase 3) */
  function renderStats() {
    const d = Storage.getSnapshot();
    const h = d.history;
    const avgDist = h.length ? Math.round(h.reduce((s, r) => s + r.m, 0) / h.length) : 0;
    const avgTime = h.length ? (h.reduce((s, r) => s + r.t, 0) / h.length).toFixed(1) : '0.0';
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('stats-runs', d.totalRuns);
    set('stats-total-meters', Math.floor(d.totalMeters) + ' m');
    set('stats-best', d.best + ' m');
    set('stats-avg-distance', avgDist + ' m');
    set('stats-avg-time', avgTime + 's');
    set('stats-best-streak', d.maxStreak);
    set('stats-total-crystals', d.crystals);

    const hist = document.getElementById('stats-history');
    if (hist) {
      if (!h.length) {
        hist.replaceChildren();
        const empty = document.createElement('div'); empty.className = 'stats-empty'; empty.textContent = I18n.t('stats.empty'); hist.appendChild(empty);
      } else {
        hist.replaceChildren();
        h.slice().reverse().slice(0, 8).forEach(r => {
          const row = document.createElement('div'); row.className = 'hist-row';
          [r.m + ' m', r.t + 's', '◆ ' + r.c].forEach(value => { const cell = document.createElement('span'); cell.textContent = value; row.appendChild(cell); });
          hist.appendChild(row);
        });
      }
    }
  }

  /* Tela de Ranking local (Fase 3) */
  function renderLeaderboard() {
    const wrap = document.getElementById('lb-list');
    if (!wrap) return;
    const select = document.getElementById('lb-mode');
    const mode = select && Object.prototype.hasOwnProperty.call(MODE_RULESETS, select.value) ? select.value : 'classic';
    const lb = Storage.getLeaderboard(entry => entry.source === 'local' && entry.mode === mode && entry.rulesetId === MODE_RULESETS[mode]);
    const me = Storage.getPlayerName();
    if (!lb.length) {
      wrap.replaceChildren(); const empty = document.createElement('div'); empty.className = 'stats-empty'; empty.textContent = I18n.t('lb.empty'); wrap.appendChild(empty);
    } else {
      wrap.replaceChildren(); lb.forEach((e, i) => {
        const isMe = me && e.name === me;
        const row = document.createElement('div'); row.className = 'lb-row' + (isMe ? ' me' : '');
        const title = isMe ? I18n.t('title.' + Storage.getCosmetics().title) + ' · ' : '';
        const values = ['#' + (i + 1), title + (e.name || '—') + (isMe ? ' (' + I18n.t('lb.you') + ')' : ''), e.m + ' m', e.t + 's'];
        ['lb-rank', 'lb-name', 'lb-m', 'lb-t'].forEach((className, index) => { const cell = document.createElement('span'); cell.className = className; cell.textContent = values[index]; row.appendChild(cell); });
        wrap.appendChild(row);
      });
    }
    const nameInput = document.getElementById('lb-name');
    if (nameInput) nameInput.value = me;
    renderImportedLeaderboard(mode);
    renderGlobalLeaderboard();
  }

  function renderImportedLeaderboard(mode) {
    const wrap = document.getElementById('lb-imported-list');
    if (!wrap) return;
    const entries = Storage.getLeaderboard(entry => entry.source === 'imported' && entry.mode === mode && entry.rulesetId === MODE_RULESETS[mode]);
    wrap.replaceChildren();
    if (!entries.length) { const empty = document.createElement('div'); empty.className = 'stats-empty'; empty.textContent = I18n.t('ghost.none'); wrap.appendChild(empty); return; }
    entries.forEach((entry, i) => {
      const row = document.createElement('div'); row.className = 'lb-row imported';
      const values = ['#' + (i + 1), entry.name || '—', entry.m + ' m', entry.t + 's'];
      ['lb-rank', 'lb-name', 'lb-m', 'lb-t'].forEach((className, index) => { const cell = document.createElement('span'); cell.className = className; cell.textContent = values[index]; row.appendChild(cell); });
      const ghost = Storage.findGhostForScore(entry);
      if (ghost) { const play = document.createElement('button'); play.className = 'btn tiny'; play.type = 'button'; play.dataset.action = 'runGhost'; play.dataset.ghostId = ghost.id; play.textContent = I18n.t('ghost.run'); row.appendChild(play); }
      wrap.appendChild(row);
    });
  }

  function ghostDetails(payload) {
    const details = document.createElement('dl'); details.className = 'ghost-details';
    const values = [
      ['ghost.mode', I18n.t('mode.' + payload.mode)], ['ghost.ruleset', payload.rulesetId],
      ['ghost.distance', payload.claimedScore.m + ' m'], ['ghost.duration', payload.claimedScore.t.toFixed(1) + 's'],
      ['ghost.ship', Ships.get(payload.shipId).name], ['ghost.loadout', I18n.t('ghost.loadoutValue', { agility: payload.loadout.agility, thrust: payload.loadout.thrust })],
      ['ghost.origin', I18n.t('ghost.importedOrigin', { origin: payload.origin })]
    ];
    if (payload.target) values.push(['ghost.target', I18n.t('ghost.targetValue', { m: payload.target.m, t: payload.target.t.toFixed(1) })]);
    values.forEach(([label, value]) => { const term = document.createElement('dt'); term.textContent = I18n.t(label); const desc = document.createElement('dd'); desc.textContent = value; details.append(term, desc); });
    return details;
  }
  function renderGhostPreview() {
    const wrap = document.getElementById('ghost-preview-content'); if (!wrap) return;
    wrap.replaceChildren();
    if (sharedPreviewError) {
      const message = document.createElement('p'); message.className = 'shared-notice'; message.setAttribute('role', 'status'); message.textContent = I18n.t('ghost.linkError.' + sharedPreviewError);
      wrap.appendChild(message); return;
    }
    if (!pendingShared) return;
    const title = document.createElement('p'); title.className = 'ghost-kicker'; title.textContent = I18n.t(pendingShared.kind === 'challenge' ? 'ghost.previewChallenge' : 'ghost.previewGhost');
    const warning = document.createElement('p'); warning.className = 'shared-notice'; warning.setAttribute('role', 'status'); warning.textContent = I18n.t('ghost.unverified');
    wrap.append(title, warning, ghostDetails(pendingShared.payload));
  }
  function renderGhostCollection() {
    const own = document.getElementById('ghost-list-self'); const imported = document.getElementById('ghost-list-imported');
    const render = (wrap, entries, emptyKey) => {
      if (!wrap) return; wrap.replaceChildren();
      if (!entries.length) { const empty = document.createElement('p'); empty.className = 'stats-empty'; empty.textContent = I18n.t(emptyKey); wrap.appendChild(empty); return; }
      entries.forEach(entry => {
        const card = document.createElement('article'); card.className = 'ghost-card ' + entry.type;
        const heading = document.createElement('h3'); heading.textContent = I18n.t(entry.type === 'self' ? 'ghost.selfBest' : entry.kind === 'challenge' ? 'ghost.previewChallenge' : 'ghost.importedGhost');
        const origin = document.createElement('p'); origin.className = 'ghost-origin'; origin.textContent = entry.type === 'self' ? I18n.t('ghost.selfOrigin') : I18n.t('ghost.importedOrigin', { origin: entry.origin });
        const actions = document.createElement('div'); actions.className = 'ghost-card-actions';
        const run = document.createElement('button'); run.className = 'btn small'; run.type = 'button'; run.dataset.action = 'runGhost'; run.dataset.ghostId = entry.id; run.textContent = I18n.t('ghost.run');
        const remove = document.createElement('button'); remove.className = 'btn small'; remove.type = 'button'; remove.dataset.action = 'removeGhost'; remove.dataset.ghostId = entry.id; remove.textContent = I18n.t('ghost.remove');
        actions.append(run, remove);
        const share = document.createElement('button'); share.className = 'btn small'; share.type = 'button'; share.dataset.action = 'shareSavedGhost'; share.dataset.ghostId = entry.id; share.textContent = I18n.t('ghost.shareAgain');
        actions.appendChild(share); card.append(heading, origin, ghostDetails(entry.payload), actions); wrap.appendChild(card);
      });
    };
    render(own, Storage.getGhosts(entry => entry.type === 'self'), 'ghost.noneSelf');
    render(imported, Storage.getGhosts(entry => entry.type === 'imported'), 'ghost.noneImported');
  }

  function sharedUrl(token) {
    const url = new URL(window.location.href); url.searchParams.set('sr', token); return url.toString();
  }
  function activeScreenId() {
    return Object.keys(screens).find(id => screens[id] && !screens[id].classList.contains('hidden')) || 'screen-gameover';
  }
  function setShareFeedback(key) {
    const target = activeScreenId() === 'screen-leaderboard'
      ? document.getElementById('shared-notice')
      : document.getElementById('go-share-feedback');
    if (target) { target.textContent = I18n.t(key); target.classList.remove('hidden'); }
  }
  async function copySharedUrl(url, allowLegacy) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch (e) {}
    if (!allowLegacy) return false;
    const input = document.getElementById('share-link-input');
    if (!input) return false;
    input.value = url;
    input.focus(); input.select(); input.setSelectionRange(0, input.value.length);
    try { return document.execCommand('copy'); } catch (e) { return false; }
  }
  function showLinkFallback(url) {
    const input = document.getElementById('share-link-input');
    const feedback = document.getElementById('share-link-feedback');
    shareReturnScreen = activeScreenId();
    if (input) input.value = url;
    if (feedback) feedback.textContent = I18n.t('ghost.manual');
    show('screen-share-link');
    if (input) { input.focus({ preventScroll: true }); input.select(); }
  }
  async function shareToken(token, title) {
    if (!token) { setShareFeedback('ghost.linkUnavailable'); return false; }
    const url = sharedUrl(token);
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'SpaceRun', text: title, url }); setShareFeedback('ghost.shared'); return true; } catch (e) {}
    }
    if (await copySharedUrl(url, false)) { setShareFeedback('ghost.linkCopied'); return true; }
    showLinkFallback(url);
    return false;
  }
  function readSharedToken(token) {
    const decoded = Protocol.decode(token);
    if (!decoded.ok) { pendingShared = null; sharedPreviewError = decoded.reason; clearSharedToken(); renderGhostPreview(); show('screen-ghost-preview'); return decoded; }
    const sharedMode = decoded.value.payload.mode;
    if (MODE_RULESETS[sharedMode] !== decoded.value.rulesetId) { pendingShared = null; sharedPreviewError = 'unsupported'; clearSharedToken(); renderGhostPreview(); show('screen-ghost-preview'); return { ok: false, reason: 'unsupported' }; }
    pendingShared = decoded.value;
    sharedPreviewError = null;
    if (decoded.value.kind === 'scores') {
      const notice = document.getElementById('shared-notice');
      if (notice) { notice.textContent = I18n.t('ghost.readyImport'); notice.classList.remove('hidden'); }
      renderLeaderboard(); show('screen-leaderboard');
      return decoded;
    }
    renderGhostPreview(); show('screen-ghost-preview');
    return decoded;
  }
  function clearSharedToken() {
    const url = new URL(window.location.href); if (!url.searchParams.has('sr')) return;
    url.searchParams.delete('sr'); history.replaceState({}, '', url.pathname + url.search + url.hash);
  }

  async function renderGlobalLeaderboard() {
    const wrap = document.getElementById('lb-global-list');
    if (!wrap || typeof Cloud === 'undefined') return;
    wrap.replaceChildren();
    const select = document.getElementById('lb-mode');
    const mode = select && Object.prototype.hasOwnProperty.call(MODE_RULESETS, select.value) ? select.value : 'classic';
    const rows = await Cloud.leaderboard(mode, MODE_RULESETS[mode]);
    if (!rows.length) { const empty = document.createElement('div'); empty.className = 'stats-empty'; empty.textContent = I18n.t('lb.offline'); wrap.appendChild(empty); return; }
    rows.forEach((row, i) => {
      const el = document.createElement('div'); el.className = 'lb-row';
      ['#' + (i + 1), row.display_name || '—', row.distance + ' m', Number(row.duration || 0).toFixed(1) + 's'].forEach((value, index) => { const cell = document.createElement('span'); cell.className = ['lb-rank', 'lb-name', 'lb-m', 'lb-t'][index]; cell.textContent = value; el.appendChild(cell); });
      wrap.appendChild(el);
    });
  }

  function renderMissions() {
    const data = Missions.snapshot(); const profile = document.getElementById('profile-summary');
    const text = I18n.t('missions.profile', { name: data.profile.name || 'Pilot', level: data.profile.level, xp: data.profile.xp });
    if (profile) profile.textContent = text;
    const render = (id, items) => { const wrap = document.getElementById(id); if (!wrap) return; wrap.replaceChildren(); items.forEach(m => { const row = document.createElement('div'); row.className = 'mission-row' + (m.complete ? ' done' : ''); row.textContent = I18n.t('mission.' + m.id) + ': ' + m.value + '/' + m.target + ' · +' + m.reward + ' ◆'; wrap.appendChild(row); }); };
    render('missions-daily', data.daily); render('missions-weekly', data.weekly);
    const reward = document.getElementById('daily-reward'); if (reward) reward.textContent = text;
  }

  /* Popup de conquista (toast em fila) */
  function showAchievement(text) {
    if (!achievementEl) achievementEl = document.getElementById('achievement');
    if (!achievementEl) return;
    achQueue.push(text);
    if (!achShowing) nextAchievement();
  }
  function nextAchievement() {
    if (!achQueue.length) { achShowing = false; return; }
    achShowing = true;
    const text = achQueue.shift();
    achievementEl.textContent = '🏆 ' + text;
    achievementEl.classList.remove('hidden');
    achievementEl.style.animation = 'none';
    void achievementEl.offsetWidth;
    achievementEl.style.animation = '';
    clearTimeout(achievementEl._t);
    achievementEl._t = setTimeout(() => {
      achievementEl.classList.add('hidden');
      setTimeout(nextAchievement, 300);
    }, 2200);
  }

  /* Popup de marco de distância */
  function showMilestone(text) {
    if (!milestoneEl) milestoneEl = document.getElementById('milestone');
    if (!milestoneEl) return;
    milestoneEl.textContent = text;
    milestoneEl.classList.remove('hidden');
    milestoneEl.style.animation = 'none';
    void milestoneEl.offsetWidth;   // reflow p/ reiniciar animação
    milestoneEl.style.animation = '';
    clearTimeout(milestoneEl._t);
    milestoneEl._t = setTimeout(() => milestoneEl.classList.add('hidden'), 1400);
  }

  /* Tela de compartilhamento (score card) — Fase 3 */
  function showShare() {
    if (!lastResult) return;
    const canvas = document.getElementById('share-canvas');
    if (canvas && Share) Share.render(canvas, lastResult);
    const dl = document.getElementById('share-download');
    if (dl && canvas) dl.href = canvas.toDataURL('image/png');
    show('screen-share');
  }

  function showGameOver(payload) {
    const meters = (payload && typeof payload === 'object') ? payload.meters : payload;
    const time = (payload && typeof payload === 'object') ? payload.time : 0;
    const crystals = (payload && typeof payload === 'object') ? payload.crystals : 0;
    const seed = (payload && typeof payload === 'object') ? payload.seed : 0;
    const daily = (payload && typeof payload === 'object') ? payload.daily : false;
    const mode = payload && Object.prototype.hasOwnProperty.call(MODE_RULESETS, payload.mode) ? payload.mode : (daily ? 'daily' : 'classic');
    lastMode = mode;
    lastResult = Object.assign({}, payload || {}, { mode });

    // registra a partida (atualiza recordes, desbloqueios, história, streak)
    const context = { mode, seed, rulesetId: (payload && payload.rulesetId) || MODE_RULESETS[mode], shipId: (payload && payload.shipId) || Storage.getSnapshot().selectedShip, loadout: (payload && payload.loadout) || undefined, maxCombo: (payload && payload.maxCombo) || 0, powerups: (payload && payload.powerups) || [] };
    const res = Storage.recordRun({ m: meters, t: time, c: crystals, ...context });
    if (typeof Cloud !== 'undefined') { Cloud.syncProfile(Storage.getProfile()); Cloud.submitScore({ m: meters, t: time, ...context }); }

    // salva no ranking local (usa o nome opcional do jogador)
    Storage.recordLeaderboard({ m: meters, t: time, ...context });

    // conquistas dependentes de estado persistido (corridas, frota, streak, diário)
    const fctx = {
      meters, time, runCrystals: crystals, maxCombo: (payload && payload.maxCombo) || 0,
      runs: Storage.getSnapshot().totalRuns,
      unlockedCount: Storage.getSnapshot().unlocked.length,
      maxStreak: Storage.getSnapshot().maxStreak,
      totalMeters: Storage.getSnapshot().totalMeters,
      daily
    };
    Achievements.check(fctx).forEach(id => { showAchievement(Achievements.getName(id)); Audio2.unlock(); });

    document.getElementById('go-distance').textContent = meters + ' m';
    document.getElementById('go-best').textContent = Storage.getBest() + ' m';
    const timeEl = document.getElementById('go-time');
    if (timeEl) timeEl.textContent = (time ? time.toFixed(1) : '0') + 's';
    const cryEl = document.getElementById('go-crystals');
    if (cryEl) cryEl.textContent = crystals;
    const modeEl = document.getElementById('go-mode');
    if (modeEl) modeEl.textContent = I18n.t('mode.' + mode);
    const seedRow = document.getElementById('go-seed-row');
    const seedEl = document.getElementById('go-seed');
    if (seedRow && seedEl) {
      if (daily) { seedEl.textContent = String(seed); seedRow.classList.remove('hidden'); }
      else seedRow.classList.add('hidden');
    }
    const unlockEl = document.getElementById('go-unlock');
    if (res.newUnlocks.length) {
      const names = res.newUnlocks.map(id => Ships.get(id).name).join(', ');
      unlockEl.textContent = I18n.t('go.unlock', { names });
      unlockEl.classList.remove('hidden');
      Audio2.unlock();
    } else {
      unlockEl.classList.add('hidden');
    }
    if (lastResult.ghost) Storage.saveSelfGhost(lastResult.ghost);
    renderGhostComparison(lastResult);
    refreshRecords();
    
    show('screen-gameover');
    if (updateApply) setUpdateAvailable(updateApply);
  }

  function renderGhostComparison(result) {
    const wrap = document.getElementById('go-ghost-comparison'); if (!wrap) return;
    wrap.replaceChildren();
    const context = result && result.ghostContext;
    if (!context || !context.reference) { wrap.classList.add('hidden'); return; }
    const heading = document.createElement('h3'); heading.textContent = I18n.t(context.kind === 'challenge' ? 'ghost.challengeResult' : 'ghost.ghostResult');
    const you = document.createElement('p'); you.textContent = I18n.t('ghost.compareYou', { m: result.meters, t: result.time.toFixed(1) });
    const reference = document.createElement('p'); reference.textContent = I18n.t('ghost.compareReference', { m: context.reference.m, t: context.reference.t.toFixed(1) });
    wrap.append(heading, you, reference);
    if (context.kind === 'challenge') { const outcome = document.createElement('p'); outcome.className = 'ghost-comparison-outcome'; outcome.textContent = I18n.t(result.meters > context.reference.m ? 'ghost.referenceReached' : 'ghost.referenceMissed'); wrap.appendChild(outcome); }
    wrap.classList.remove('hidden');
  }

  function renderSettings() {
    const s = Storage.getSettings();
    document.getElementById('set-sound').checked = s.sound;
    document.getElementById('set-music').checked = s.music;
    document.getElementById('set-particles').checked = s.particles;
    document.getElementById('set-reduce-motion').checked = s.reduceMotion;
    document.getElementById('set-high-contrast').checked = s.highContrast;
    const haptics = document.getElementById('set-haptics'); if (haptics) haptics.checked = s.haptics;
    const perf = document.getElementById('set-performance-mode'); if (perf) perf.checked = s.performanceMode;
    const colorblind = document.getElementById('set-colorblind'); if (colorblind) colorblind.value = s.colorblind;
    const controlMode = document.getElementById('set-control-mode'); if (controlMode) controlMode.value = s.controlMode;
    const oneHanded = document.getElementById('set-one-handed'); if (oneHanded) oneHanded.checked = s.oneHanded;
    const thrustKey = document.getElementById('set-thrust-key');
    const abilityKey = document.getElementById('set-ability-key');
    const keyName = code => {
      const translated = I18n.t('settings.key.' + code);
      return translated === 'settings.key.' + code ? code.replace(/^Key/, '').replace(/^Digit/, '') : translated;
    };
    if (thrustKey) thrustKey.textContent = keyName(s.thrustKey);
    if (abilityKey) abilityKey.textContent = keyName(s.abilityKey);
    document.getElementById('set-lang').value = I18n.lang;
    const themeSel = document.getElementById('set-theme');
    if (themeSel) themeSel.value = Themes.currentId();

    document.getElementById('set-sound').onchange = e => {
      Audio2.uiClick();
      Storage.setSetting('sound', e.target.checked);
      Audio2.setEnabled(e.target.checked);
    };
    document.getElementById('set-music').onchange = e => {
      Audio2.uiClick();
      Storage.setSetting('music', e.target.checked);
      Audio2.setMusicEnabled(e.target.checked);
      window.dispatchEvent(new Event('musicchange'));
    };
    document.getElementById('set-particles').onchange = e => {
      Audio2.uiClick();
      Storage.setSetting('particles', e.target.checked);
    };
    document.getElementById('set-reduce-motion').onchange = e => {
      Audio2.uiClick();
      Storage.setSetting('reduceMotion', e.target.checked);
      applyAccessibility();
    };
    document.getElementById('set-high-contrast').onchange = e => {
      Audio2.uiClick();
      Storage.setSetting('highContrast', e.target.checked);
      applyAccessibility();
    };
    if (perf) perf.onchange = e => { Audio2.uiClick(); Storage.setSetting('performanceMode', e.target.checked); };
    if (haptics) haptics.onchange = e => { Audio2.uiClick(); Storage.setSetting('haptics', e.target.checked); };
    if (colorblind) colorblind.onchange = e => { Audio2.uiClick(); Storage.setSetting('colorblind', e.target.value); applyAccessibility(); };
    if (controlMode) controlMode.onchange = e => { Audio2.uiClick(); Storage.setSetting('controlMode', e.target.value); Input.setControls(Storage.getSettings()); };
    if (oneHanded) oneHanded.onchange = e => { Audio2.uiClick(); Storage.setSetting('oneHanded', e.target.checked); applyAccessibility(); };
    const bindKey = (kind, button) => {
      if (!button) return;
      button.onclick = () => {
        const status = document.getElementById('keybind-status');
        if (status) status.textContent = I18n.t('settings.keyListening');
        button.classList.add('listening'); button.textContent = '…';
        const capture = e => {
          e.preventDefault(); e.stopPropagation();
          if (e.code === 'Escape') { renderSettings(); return; }
          const next = Storage.getSettings(); next[kind] = e.code;
          const other = kind === 'thrustKey' ? 'abilityKey' : 'thrustKey';
          if (next[other] === e.code) { if (status) status.textContent = I18n.t('settings.keyConflict'); renderSettings(); return; }
          Storage.setSetting(kind, e.code); Input.setControls(Storage.getSettings());
          if (status) status.textContent = I18n.t('settings.keySaved', { key: keyName(e.code) });
          renderSettings();
        };
        window.addEventListener('keydown', capture, { once: true, capture: true });
      };
    };
    bindKey('thrustKey', thrustKey); bindKey('abilityKey', abilityKey);
    const themeSelEl = document.getElementById('set-theme');
    if (themeSelEl) themeSelEl.onchange = e => {
      Themes.set(e.target.value);
      Audio2.uiClick();
    };
    document.getElementById('set-lang').onchange = e => {
      Audio2.uiClick();
      I18n.setLang(e.target.value);
      I18n.apply();
      updateShare();
      document.documentElement.lang = I18n.lang === 'pt' ? 'pt-BR' : I18n.lang;
      renderSettings();
      ['screen-custom-game', 'screen-hangar', 'screen-achievements', 'screen-stats', 'screen-leaderboard', 'screen-missions', 'screen-ghosts', 'screen-ghost-preview']
        .forEach(id => { if (!screens[id].classList.contains('hidden')) rerenderScreen(id); });
      refreshRecords();
    };
  }

  function rerenderScreen(id) {
    if (id === 'screen-custom-game') renderCustomModes();
    else if (id === 'screen-hangar') renderHangar();
    else if (id === 'screen-achievements') renderAchievements();
    else if (id === 'screen-stats') renderStats();
    else if (id === 'screen-leaderboard') renderLeaderboard();
    else if (id === 'screen-missions') renderMissions();
    else if (id === 'screen-ghosts') renderGhostCollection();
    else if (id === 'screen-ghost-preview') renderGhostPreview();
  }

  function init(playCb) {
    onPlay = playCb;
    ['screen-home', 'screen-custom-game', 'screen-hangar', 'screen-settings', 'screen-donate',
      'screen-gameover', 'screen-pause', 'screen-achievements',
      'screen-stats', 'screen-leaderboard', 'screen-missions', 'screen-ghosts', 'screen-ghost-preview', 'screen-share', 'screen-share-link']
      .forEach(id => screens[id] = document.getElementById(id));

    I18n.init();
    I18n.apply();
    document.getElementById('hud-pause').setAttribute('aria-label', I18n.t('aria.pause'));
    document.getElementById('ability-btn').setAttribute('aria-label', I18n.t('aria.ability'));
    Themes.init();
    applyAccessibility();
    wireShare();
    updateShare();
    const lbMode = document.getElementById('lb-mode');
    if (lbMode) lbMode.addEventListener('change', renderLeaderboard);
    if (typeof Cloud !== 'undefined') Cloud.init().then(ok => { if (ok) Cloud.syncProfile(Storage.getProfile()); });
    document.documentElement.lang = I18n.lang === 'pt' ? 'pt-BR' : I18n.lang;

    // delegação de cliques nos botões data-action
    document.getElementById('app').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      handleAction(a, btn);
    });

    renderSettings();
    refreshRecords();
    try { const token = new URL(window.location.href).searchParams.get('sr'); if (token) readSharedToken(token); } catch (e) {}
  }

  async function handleAction(a, btn) {
    Audio2.uiClick();
    switch (a) {
      case 'play':
        show(null);
        onPlay('classic');
        break;
      case 'replay':
        show(null);
        onPlay(lastMode);
        break;
      case 'shareGhost': {
        const token = lastResult && lastResult.ghost ? Protocol.encode('ghost', lastResult.ghost) : null;
        shareToken(token, I18n.t('ghost.share')); break;
      }
      case 'shareChallenge': {
        const challenge = lastResult && lastResult.ghost ? Object.assign({}, lastResult.ghost, { target: lastResult.ghost.claimedScore }) : null;
        const token = challenge ? Protocol.encode('challenge', challenge) : null;
        shareToken(token, I18n.t('ghost.challenge')); break;
      }
      case 'importShared': {
        if (!pendingShared || pendingShared.kind !== 'scores') break;
        const shared = pendingShared;
        Storage.importLeaderboard(shared.payload.entries.map(entry => Object.assign({}, entry, { mode: shared.payload.mode, rulesetId: shared.payload.rulesetId })), shared.payload.origin);
        pendingShared = null; clearSharedToken(); renderLeaderboard(); break;
      }
      case 'runPreview': {
        if (!pendingShared) break;
        const shared = pendingShared; pendingShared = null; clearSharedToken();
        show(null); onPlay(shared.payload.mode, { ghost: shared.payload, ghostKind: shared.kind }); break;
      }
      case 'savePreview': {
        if (!pendingShared) break;
        const shared = pendingShared; const saved = Storage.saveImportedGhost(shared.kind, shared.payload);
        if (!saved) break;
        Storage.importLeaderboard([{ name: I18n.t('ghost.pilot'), m: shared.payload.claimedScore.m, t: shared.payload.claimedScore.t, mode: shared.payload.mode, rulesetId: shared.payload.rulesetId, shipId: shared.payload.shipId, loadout: shared.payload.loadout }], shared.payload.origin);
        pendingShared = null; clearSharedToken(); renderGhostCollection(); show('screen-ghosts'); break;
      }
      case 'dismissPreview': pendingShared = null; sharedPreviewError = null; clearSharedToken(); show('screen-home'); break;
      case 'ghosts': renderGhostCollection(); show('screen-ghosts'); break;
      case 'runGhost': {
        const record = btn && Storage.getGhost(btn.dataset.ghostId);
        if (!record || MODE_RULESETS[record.payload.mode] !== record.payload.rulesetId) break;
        show(null); onPlay(record.payload.mode, { ghost: record.payload, ghostKind: record.kind }); break;
      }
      case 'removeGhost': if (btn && Storage.removeGhost(btn.dataset.ghostId)) renderGhostCollection(); break;
      case 'shareSavedGhost': {
        const record = btn && Storage.getGhost(btn.dataset.ghostId);
        shareToken(record ? Protocol.encode(record.kind, record.payload) : null, I18n.t(record && record.kind === 'challenge' ? 'ghost.challenge' : 'ghost.share'));
        break;
      }
      case 'shareScores': {
        const mode = document.getElementById('lb-mode').value;
        const entries = Storage.getLeaderboard(entry => entry.source === 'local' && entry.mode === mode && entry.rulesetId === MODE_RULESETS[mode]).map(entry => ({ name: entry.name, m: entry.m, t: entry.t, shipId: entry.shipId, loadout: entry.loadout }));
        shareToken(Protocol.encode('scores', { mode, rulesetId: MODE_RULESETS[mode], origin: Storage.getFriendCode(), entries }), I18n.t('ghost.shareScores'));
        break;
      }
      case 'copySharedLink': {
        const input = document.getElementById('share-link-input');
        const feedback = document.getElementById('share-link-feedback');
        if (input && await copySharedUrl(input.value, true)) {
          if (feedback) feedback.textContent = I18n.t('ghost.linkCopied');
        } else if (feedback) feedback.textContent = I18n.t('ghost.copyFailed');
        break;
      }
      case 'closeSharedLink':
        show(shareReturnScreen);
        break;
      case 'customGame':
        renderCustomModes(); show('screen-custom-game');
        break;
      case 'playMode': {
        const mode = btn && btn.dataset.mode;
        if (!Object.prototype.hasOwnProperty.call(MODE_RULESETS, mode) || !Storage.isModeUnlocked(mode)) break;
        show(null);
        onPlay(mode);
        break;
      }
      case 'hangar':
        renderHangar(); refreshRecords(); show('screen-hangar');
        break;
      case 'settings':
        renderSettings(); show('screen-settings');
        break;
      case 'donate':
        show('screen-donate');
        break;
      case 'achievements':
        renderAchievements(); show('screen-achievements');
        break;
      case 'stats':
        renderStats(); show('screen-stats');
        break;
      case 'leaderboard':
        renderLeaderboard(); show('screen-leaderboard');
        break;
      case 'missions': renderMissions(); show('screen-missions'); break;
      case 'claimDaily': {
        const result = Storage.claimDailyReward(new Date());
        const reward = document.getElementById('daily-reward');
        if (reward) reward.textContent = result ? I18n.t('missions.claimed', { n: result.reward }) : I18n.t('missions.claimedToday');
        if (result && typeof Cloud !== 'undefined') Cloud.syncProfile(Storage.getProfile());
        break;
      }
      case 'refreshGlobal': renderGlobalLeaderboard(); break;
      case 'share':
        showShare();
        break;
      case 'shareNative': {
        const canvas = document.getElementById('share-canvas');
        if (canvas && navigator.share) {
          canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], 'spacerun.png', { type: 'image/png' });
            try {
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'SpaceRun', text: I18n.t('share.title') }).catch(() => {});
              } else {
                navigator.share({ title: 'SpaceRun', text: I18n.t('share.title') }).catch(() => {});
              }
            } catch (e) {}
          });
        }
        break;
      }
      case 'closeShare':
        show('screen-gameover');
        break;
      case 'saveSkin': {
        const c = document.getElementById('skin-color');
        const ac = document.getElementById('skin-accent');
        if (c && ac) Storage.setShipSkin(Storage.get().selectedShip, c.value, ac.value);
        renderHangar();
        break;
      }
      case 'resetSkin':
        Storage.resetShipSkin(Storage.get().selectedShip);
        renderHangar();
        break;
      case 'buyUpgrade': {
        const stat = btn && btn.dataset.stat;
        if (stat) Storage.buyUpgrade(stat);
        renderHangar();
        break;
      }
      case 'selectCosmetic': {
        if (btn) Storage.setCosmetic(btn.dataset.type, btn.dataset.value);
        renderHangar();
        break;
      }
      case 'buyCosmetic': {
        if (btn) Storage.buyCosmetic(btn.dataset.type, btn.dataset.value);
        renderHangar();
        break;
      }
      case 'saveName': {
        const n = document.getElementById('lb-name');
        if (n) Storage.setPlayerName(n.value);
        if (typeof Cloud !== 'undefined') Cloud.syncProfile(Storage.getProfile());
        renderLeaderboard();
        break;
      }
      case 'home':
        Game.stop(); show('screen-home'); refreshRecords(); if (updateApply) setUpdateAvailable(updateApply);
        break;
      case 'applyUpdate': if (updateApply) updateApply(); break;
      case 'reset':
        if (confirm(I18n.t('settings.resetConfirm'))) { Storage.reset(); renderSettings(); refreshRecords(); }
        break;
      case 'resume':
        Game.resume();
        break;
    }
  }

  function showPause() { show('screen-pause'); }
  function hidePause() { show(null); }
  function showReady() { const e = document.getElementById('ready-overlay'); if (e) e.classList.remove('hidden'); }
  function hideReady() { const e = document.getElementById('ready-overlay'); if (e) e.classList.add('hidden'); }

  function setUpdateAvailable(apply) {
    updateApply = apply;
    const notice = document.getElementById('update-notice');
    if (!notice) return;
    const text = notice.querySelector('span');
    const button = notice.querySelector('button');
    if (text) text.textContent = I18n.t('pwa.update');
    if (button) button.textContent = I18n.t('pwa.apply');
    const safe = Game.state === 'idle' || document.getElementById('screen-gameover') && !document.getElementById('screen-gameover').classList.contains('hidden');
    notice.classList.toggle('hidden', !safe);
  }

  return { init, show, showGameOver, showPause, hidePause, showReady, hideReady, setUpdateAvailable,
           refreshRecords, applyAccessibility, showMilestone, showAchievement, importSharedToken: readSharedToken };
})();
