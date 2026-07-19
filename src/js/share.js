/* Compartilhamento serverless: gera um "score card" em <canvas> (Fase 3) */
const Share = (() => {
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function render(canvas, payload) {
    const W = 600, H = 800;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const p = payload || {};
    const meters = Math.floor(p.meters || 0);
    const time = (p.time || 0);
    const crystals = Math.floor(p.crystals || 0);
    const shipDef = Ships.get(p.shipId || 'scout');
    const skin = Ships.getSkin(p.shipId || 'scout');
    const shipName = shipDef.name;
    const t = performance.now();

    // fundo
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0526');
    bg.addColorStop(0.5, '#120a36');
    bg.addColorStop(1, '#05010f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // estrelas decorativas
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 60; i++) {
      const x = (i * 97 % W), y = (i * 53 % H);
      const r = (i % 3 === 0) ? 1.6 : 0.9;
      ctx.globalAlpha = 0.3 + (i % 5) * 0.12;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // borda neon
    ctx.strokeStyle = skin.accent;
    ctx.lineWidth = 3;
    ctx.shadowColor = skin.accent;
    ctx.shadowBlur = 18;
    roundRect(ctx, 16, 16, W - 32, H - 32, 22);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // título
    ctx.textAlign = 'center';
    const grad = ctx.createLinearGradient(80, 0, W - 80, 0);
    grad.addColorStop(0, skin.color);
    grad.addColorStop(1, skin.accent);
    ctx.fillStyle = grad;
    ctx.font = '900 64px Segoe UI, system-ui, sans-serif';
    ctx.fillText('SPACERUN', W / 2, 110);

    ctx.fillStyle = 'rgba(232,240,255,0.7)';
    ctx.font = '20px Segoe UI, system-ui, sans-serif';
    ctx.fillText(I18n.t('home.tagline'), W / 2, 146);

    // nave
    shipDef.draw(ctx, W / 2, 270, 200, 110, t, true, skin.color, skin.accent);

    // separador
    ctx.strokeStyle = 'rgba(74,240,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(60, 350); ctx.lineTo(W - 60, 350); ctx.stroke();

    // linhas de resultado
    const rows = [
      [I18n.t('go.distance'), meters + ' m'],
      [I18n.t('go.time'), time.toFixed(1) + 's'],
      [I18n.t('go.crystals'), '◆ ' + crystals],
      [I18n.t('share.ship'), shipName],
      [I18n.t('lb.title'), new Date().toLocaleDateString()]
    ];
    ctx.textAlign = 'left';
    let y = 410;
    rows.forEach(([label, val]) => {
      ctx.fillStyle = 'rgba(139,147,184,0.9)';
      ctx.font = '22px Segoe UI, system-ui, sans-serif';
      ctx.fillText(label, 70, y);
      ctx.fillStyle = '#4af0ff';
      ctx.font = '700 26px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val, W - 70, y);
      ctx.textAlign = 'left';
      y += 56;
    });

    // rodapé
    ctx.fillStyle = 'rgba(139,147,184,0.6)';
    ctx.font = '15px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('© 2025 Insight X Lab Technologies · v0.1', W / 2, H - 40);
  }

  return { render };
})();
