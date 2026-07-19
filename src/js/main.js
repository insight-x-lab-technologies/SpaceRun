/* Bootstrap do jogo, HUD, música e registro do PWA */
(function () {
  const canvas = document.getElementById('game-canvas');
  const hud = document.getElementById('hud');
  const hudDistance = document.getElementById('hud-distance');
  const hudSpeed = document.getElementById('hud-speed');
  const hudPause = document.getElementById('hud-pause');

  let hudActive = false;

  function startGame() {
    Audio2.setEnabled(Storage.getSettings().sound);
    Game.start();   // entra em estado "ready"
  }

  function hudLoop() {
    if (Game.state === 'playing' || Game.state === 'paused') {
      const h = Game.getHud();
      hudDistance.textContent = h.meters + ' m';
      hudSpeed.textContent = h.speed + ' km/s';
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

  Game.init(canvas, meters => {
    // game over
    hud.classList.add('hidden');
    UI.showGameOver(meters);
    refreshMusic();   // volta para a música do menu
  }, s => {
    // mudança de estado
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

  // registra Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
