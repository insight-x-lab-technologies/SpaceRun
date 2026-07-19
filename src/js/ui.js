/* Gerenciamento de telas e UI */
const UI = (() => {
  const screens = {};
  let onPlay = null;

  function show(id) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    if (id) screens[id].classList.remove('hidden');
  }

  function refreshRecords() {
    const best = Storage.getBest();
    const b = best + ' m';
    const hb = document.getElementById('home-best');
    const ab = document.getElementById('hangar-best');
    if (hb) hb.textContent = b;
    if (ab) ab.textContent = b;

    const data = Storage.get();
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

  function renderHangar() {
    const list = document.getElementById('ship-list');
    list.innerHTML = '';
    const data = Storage.get();
    Ships.list.forEach(s => {
      const unlocked = Storage.isUnlocked(s.id);
      const selected = data.selectedShip === s.id;
      const card = document.createElement('div');
      card.className = 'ship-card' + (selected ? ' selected' : '') + (unlocked ? '' : ' locked');

      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const cctx = cv.getContext('2d');
      s.draw(cctx, 32, 32, 44, 24, performance.now(), false);

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
  }

  function renderSettings() {
    const s = Storage.getSettings();
    document.getElementById('set-sound').checked = s.sound;
    document.getElementById('set-music').checked = s.music;
    document.getElementById('set-particles').checked = s.particles;
    document.getElementById('set-reduce-motion').checked = s.reduceMotion;
    document.getElementById('set-high-contrast').checked = s.highContrast;
    document.getElementById('set-lang').value = I18n.lang;

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
    document.getElementById('set-lang').onchange = e => {
      Audio2.uiClick();
      I18n.setLang(e.target.value);
      I18n.apply();
      document.documentElement.lang = I18n.lang === 'pt' ? 'pt-BR' : I18n.lang;
      renderSettings();
      if (!screens['screen-hangar'].classList.contains('hidden')) renderHangar();
      refreshRecords();
    };
  }

  function showGameOver(payload) {
    const meters = (payload && typeof payload === 'object') ? payload.meters : payload;
    const time = (payload && typeof payload === 'object') ? payload.time : 0;
    const crystals = (payload && typeof payload === 'object') ? payload.crystals : 0;
    const seed = (payload && typeof payload === 'object') ? payload.seed : 0;
    const daily = (payload && typeof payload === 'object') ? payload.daily : false;
    const res = Storage.recordRun(meters, time, crystals);
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
    show('screen-gameover');
  }

  /* Popup de marco de distância */
  let milestoneEl = null;
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

  function init(playCb) {
    onPlay = playCb;
    ['screen-home', 'screen-hangar', 'screen-settings', 'screen-donate',
     'screen-gameover', 'screen-pause']
      .forEach(id => screens[id] = document.getElementById(id));

    I18n.init();
    I18n.apply();
    applyAccessibility();
    document.documentElement.lang = I18n.lang === 'pt' ? 'pt-BR' : I18n.lang;

    // delegação de cliques nos botões data-action
    document.getElementById('app').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const a = btn.dataset.action;
      handleAction(a);
    });

    renderSettings();
    refreshRecords();
  }

  function handleAction(a) {
    Audio2.uiClick();
    switch (a) {
      case 'play':
        show(null);
        onPlay();
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
      case 'home':
        Game.stop(); show('screen-home'); refreshRecords();
        break;
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

  return { init, show, showGameOver, showPause, hidePause, showReady, hideReady, refreshRecords, applyAccessibility, showMilestone };
})();
