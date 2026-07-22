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

  /* Aplica classes de acessibilidade no <body> conforme as configurações */
  function applyAccessibility() {
    const s = Storage.getSettings();
    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
    document.body.classList.toggle('high-contrast', !!s.highContrast);
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

    const upBtn = (stat, cost) => {
      if (cost == null) return `<span class="maxed">${I18n.t('hangar.maxed')}</span>`;
      const dis = crystals < cost ? 'disabled' : '';
      return `<button class="btn small" data-action="buyUpgrade" data-stat="${stat}" ${dis}>${I18n.t('hangar.cost', { n: cost })}</button>`;
    };

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
    const lb = Storage.getLeaderboard();
    const me = Storage.getPlayerName();
    if (!lb.length) {
      wrap.replaceChildren(); const empty = document.createElement('div'); empty.className = 'stats-empty'; empty.textContent = I18n.t('lb.empty'); wrap.appendChild(empty);
    } else {
      wrap.replaceChildren(); lb.forEach((e, i) => {
        const isMe = me && e.name === me;
        const row = document.createElement('div'); row.className = 'lb-row' + (isMe ? ' me' : '');
        const values = ['#' + (i + 1), (e.name || '—') + (isMe ? ' (' + I18n.t('lb.you') + ')' : ''), e.m + ' m', e.t + 's'];
        ['lb-rank', 'lb-name', 'lb-m', 'lb-t'].forEach((className, index) => { const cell = document.createElement('span'); cell.className = className; cell.textContent = values[index]; row.appendChild(cell); });
        wrap.appendChild(row);
      });
    }
    const nameInput = document.getElementById('lb-name');
    if (nameInput) nameInput.value = me;
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
    lastResult = payload;

    // registra a partida (atualiza recordes, desbloqueios, história, streak)
    const context = { mode: daily ? 'daily' : 'classic', seed, rulesetId: (payload && payload.rulesetId) || (daily ? 'daily-v1' : 'classic-v1'), shipId: (payload && payload.shipId) || Storage.getSnapshot().selectedShip, loadout: (payload && payload.loadout) || undefined, maxCombo: (payload && payload.maxCombo) || 0 };
    const res = Storage.recordRun({ m: meters, t: time, c: crystals, ...context });

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
    refreshRecords();
    show('screen-gameover');
    if (updateApply) setUpdateAvailable(updateApply);
  }

  function renderSettings() {
    const s = Storage.getSettings();
    document.getElementById('set-sound').checked = s.sound;
    document.getElementById('set-music').checked = s.music;
    document.getElementById('set-particles').checked = s.particles;
    document.getElementById('set-reduce-motion').checked = s.reduceMotion;
    document.getElementById('set-high-contrast').checked = s.highContrast;
    const perf = document.getElementById('set-performance-mode'); if (perf) perf.checked = s.performanceMode;
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
      ['screen-hangar', 'screen-achievements', 'screen-stats', 'screen-leaderboard']
        .forEach(id => { if (!screens[id].classList.contains('hidden')) rerenderScreen(id); });
      refreshRecords();
    };
  }

  function rerenderScreen(id) {
    if (id === 'screen-hangar') renderHangar();
    else if (id === 'screen-achievements') renderAchievements();
    else if (id === 'screen-stats') renderStats();
    else if (id === 'screen-leaderboard') renderLeaderboard();
  }

  function init(playCb) {
    onPlay = playCb;
    ['screen-home', 'screen-hangar', 'screen-settings', 'screen-donate',
      'screen-gameover', 'screen-pause', 'screen-achievements',
      'screen-stats', 'screen-leaderboard', 'screen-share']
      .forEach(id => screens[id] = document.getElementById(id));

    I18n.init();
    I18n.apply();
    document.getElementById('hud-pause').setAttribute('aria-label', I18n.t('aria.pause'));
    document.getElementById('ability-btn').setAttribute('aria-label', I18n.t('aria.ability'));
    Themes.init();
    applyAccessibility();
    wireShare();
    updateShare();
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
  }

  function handleAction(a, btn) {
    Audio2.uiClick();
    switch (a) {
      case 'play':
        show(null);
        onPlay();
        break;
      case 'playDaily':
        show(null);
        onPlay('daily');
        break;
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
      case 'saveName': {
        const n = document.getElementById('lb-name');
        if (n) Storage.setPlayerName(n.value);
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
           refreshRecords, applyAccessibility, showMilestone, showAchievement };
})();
