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
    document.getElementById('set-lang').value = I18n.lang;

    document.getElementById('set-sound').onchange = e => {
      Storage.setSetting('sound', e.target.checked);
      Audio2.setEnabled(e.target.checked);
    };
    document.getElementById('set-music').onchange = e => {
      Storage.setSetting('music', e.target.checked);
    };
    document.getElementById('set-particles').onchange = e => {
      Storage.setSetting('particles', e.target.checked);
    };
    document.getElementById('set-lang').onchange = e => {
      I18n.setLang(e.target.value);
      I18n.apply();
      document.documentElement.lang = I18n.lang === 'pt' ? 'pt-BR' : I18n.lang;
      renderSettings();
      if (!screens['screen-hangar'].classList.contains('hidden')) renderHangar();
      refreshRecords();
    };
  }

  function showGameOver(meters) {
    const res = Storage.recordRun(meters);
    document.getElementById('go-distance').textContent = meters + ' m';
    document.getElementById('go-best').textContent = Storage.getBest() + ' m';
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

  function init(playCb) {
    onPlay = playCb;
    ['screen-home', 'screen-hangar', 'screen-settings', 'screen-donate',
     'screen-gameover', 'screen-pause']
      .forEach(id => screens[id] = document.getElementById(id));

    I18n.init();
    I18n.apply();
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
        Game.resume(); show(null);
        break;
    }
  }

  function showPause() { show('screen-pause'); }
  function hidePause() { show(null); }

  return { init, show, showGameOver, showPause, hidePause, refreshRecords };
})();
