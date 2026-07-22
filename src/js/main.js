/* Bootstrap do jogo, HUD, música e registro do PWA */
(function () {
  const canvas = document.getElementById('game-canvas');
  const hud = document.getElementById('hud');
  const hudDistance = document.getElementById('hud-distance');
  const hudSpeed = document.getElementById('hud-speed');
  const hudCrystals = document.getElementById('hud-crystals');
  const hudCombo = document.getElementById('hud-combo');
  const hudAbility = document.getElementById('hud-ability');
  const hudPause = document.getElementById('hud-pause');
  const abilityBtn = document.getElementById('ability-btn');

  let hudActive = false;

  function startGame(mode) {
    Audio2.setEnabled(Storage.getSettings().sound);
    Game.start(mode);   // entra em estado "ready"
  }

  function hudLoop() {
    if (Game.state === 'playing' || Game.state === 'paused') {
      const h = Game.getHud();
      hudDistance.textContent = h.meters + ' m';
      hudSpeed.textContent = h.speed + ' km/s';
      if (hudCrystals) hudCrystals.textContent = '◆ ' + h.crystals;
      if (hudCombo) {
        const mult = 1 + Math.floor((Math.max(0, h.combo - 1)) / 5);
        hudCombo.textContent = h.combo > 1
          ? (mult > 1 ? ('x' + mult + ' · ' + h.combo) : (h.combo + ' combo'))
          : '';
      }
      if (hudAbility) {
        if (h.ability) {
          let txt = I18n.t('ability.' + h.ability);
          if (h.shield) txt += ' 🛡';
          else if (h.dash) txt += ' »';
          else if (h.slowmo) txt += ' ◷';
          if (h.abilityCd > 0) txt += ' · ' + I18n.t('hud.recharging');
          hudAbility.textContent = txt;
          hudAbility.className = 'hud-ability' + (h.abilityCd > 0 ? ' cd' : '');
        } else {
          hudAbility.textContent = '';
        }
      }
      if (abilityBtn) {
        if (h.ability) {
          const label = abilityBtn.querySelector('.ab-label');
          if (label) label.textContent = I18n.t('ability.' + h.ability);
          abilityBtn.classList.remove('hidden');
          abilityBtn.classList.toggle('ready', h.abilityCd <= 0);
        } else {
          abilityBtn.classList.add('hidden');
        }
      }
      requestAnimationFrame(hudLoop);
    } else {
      hudActive = false;
    }
  }

  /* ---------- Música (menu x gameplay) ---------- */
  function currentMusicType() {
    const st = Game.state;
    if (st === 'ready' || st === 'playing' || st === 'paused') return 'game';
    return 'menu';
  }

  function refreshMusic() {
    Audio2.setMusicEnabled(Storage.getSettings().music);
    Audio2.startMusic(currentMusicType());
  }

  // desbloqueia o áudio no primeiro gesto do usuário (política autoplay)
  function unlockAudioOnce() {
    Audio2.ensure();
    refreshMusic();
    window.removeEventListener('pointerdown', unlockAudioOnce);
    window.removeEventListener('keydown', unlockAudioOnce);
  }
  window.addEventListener('pointerdown', unlockAudioOnce);
  window.addEventListener('keydown', unlockAudioOnce);

  // botão de habilidade (toque): dispara a habilidade da nave selecionada
  if (abilityBtn) {
    abilityBtn.addEventListener('pointerdown', e => {
      e.preventDefault();
      Audio2.ensure();
      Input.triggerAbility();
    });
  }

  Game.init(canvas, result => {
    // game over
    hud.classList.add('hidden');
    UI.showGameOver(result);
    refreshMusic();   // volta para a música do menu
   }, s => {
    // mudança de estado
    if (s !== 'playing' && s !== 'paused' && abilityBtn) abilityBtn.classList.add('hidden');
    if (s === 'ready') {
      UI.showReady(); UI.hidePause();
      hud.classList.add('hidden');
    } else if (s === 'playing') {
      UI.hideReady(); UI.hidePause();
      hud.classList.remove('hidden');
      if (!hudActive) { hudActive = true; requestAnimationFrame(hudLoop); }
    } else if (s === 'paused') {
      UI.showPause();
    } else if (s === 'over') {
      hud.classList.add('hidden'); UI.hideReady();
    } else if (s === 'idle') {
      UI.hideReady(); UI.hidePause(); hud.classList.add('hidden');
    }
    refreshMusic();
  });

  UI.init(startGame);

  // botão de pausa
  hudPause.addEventListener('click', () => {
    Audio2.uiClick();
    if (Game.state === 'playing') Game.pause();
    else if (Game.state === 'paused') Game.resume();
  });

  // pausa ao sair da aba
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'playing') Game.pause();
  });

  // (re)aplica a música quando o usuário alterna a configuração
  window.addEventListener('musicchange', refreshMusic);

  // Atualizações PWA são adiadas até a Home/Game Over: nunca interrompem uma run.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      let reloading = false;
      let waitingWorker = null;
      const applyUpdate = () => {
        if (reloading) return;
        reloading = true;
        if (waitingWorker) waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        else window.location.reload();
      };
      const announce = worker => { waitingWorker = worker || waitingWorker; UI.setUpdateAvailable(applyUpdate); };
      navigator.serviceWorker.register('sw.js').then(registration => {
        if (registration.waiting) announce(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) announce(registration.waiting || installing);
          });
        });
      }).catch(() => {});
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) window.location.reload();
      });
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data && e.data.type === 'SW_UPDATED') announce(e.source || null);
      });
    });
  }
})();
