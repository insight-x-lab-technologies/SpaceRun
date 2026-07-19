/* Bootstrap do jogo, HUD e registro do PWA */
(function () {
  const canvas = document.getElementById('game-canvas');
  const hud = document.getElementById('hud');
  const hudDistance = document.getElementById('hud-distance');
  const hudSpeed = document.getElementById('hud-speed');
  const hudPause = document.getElementById('hud-pause');

  function startGame() {
    Audio2.setEnabled(Storage.getSettings().sound);
    hud.classList.remove('hidden');
    Game.start();
    if (Storage.getSettings().music) Audio2.startMusic();
    requestAnimationFrame(hudLoop);
  }

  function hudLoop() {
    if (Game.state === 'playing' || Game.state === 'paused') {
      const h = Game.getHud();
      hudDistance.textContent = h.meters + ' m';
      hudSpeed.textContent = h.speed + ' km/s';
      requestAnimationFrame(hudLoop);
    }
  }

  Game.init(canvas, meters => {
    hud.classList.add('hidden');
    UI.showGameOver(meters);
  });

  UI.init(startGame);

  // botão de pausa
  hudPause.addEventListener('click', () => {
    if (Game.state === 'playing') { Game.pause(); UI.showPause(); }
    else if (Game.state === 'paused') { Game.resume(); UI.hidePause(); }
  });

  // pausa ao sair da aba
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && Game.state === 'playing') { Game.pause(); UI.showPause(); }
  });

  // registra Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
