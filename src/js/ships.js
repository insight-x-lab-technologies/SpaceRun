/* Definição das aeronaves (desenho 100% procedural, sem imagens) */
const Ships = (() => {
  /*
    Cada nave tem:
    - id, name, desc
    - unlockAt: metros totais acumulados para desbloquear (0 = já liberta)
    - color / accent: cores base
    - stats: agility (sobe/desce mais rápido), size (hitbox), thrust (empuxo)
    - ability: 'dash' | 'shield' | 'slowmo' | null  (Fase 2)
    - draw(ctx, x, y, w, h, t, flame, color, accent): desenha centralizada em (x,y)
      color/accent permitem sobrescrever com a skin do jogador.
  */
  function drawBody(ctx, x, y, w, h, color, accent, t, flame) {
    const half = w / 2, q = h / 2;
    // chama de propulsão
    if (flame) {
      const fl = q * (0.6 + 0.4 * Math.sin(t * 0.02));
      const grad = ctx.createLinearGradient(x - half, 0, x - half - fl, 0);
      grad.addColorStop(0, accent);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - half, y - q * 0.5);
      ctx.lineTo(x - half - fl, y);
      ctx.lineTo(x - half, y + q * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    // corpo
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + half, y);
    ctx.lineTo(x - half * 0.6, y - q);
    ctx.lineTo(x - half, y - q * 0.3);
    ctx.lineTo(x - half, y + q * 0.3);
    ctx.lineTo(x - half * 0.6, y + q);
    ctx.closePath();
    ctx.fill();
    // detalhe
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(x + half * 0.2, y, w * 0.16, q * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // cockpit
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x + half * 0.35, y, q * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // fábrica de draw que aceita cores de skin (color/accent opcionais)
  function makeDraw(defColor, defAccent) {
    return (c, x, y, w, h, t, flame, color, accent) =>
      drawBody(c, x, y, w, h, color || defColor, accent || defAccent, t, flame);
  }

  const list = [
    {
      id: 'scout', name: 'Scout', ability: null,
      unlockAt: 0, color: '#4af0ff', accent: '#ff4ad8',
      stats: { agility: 1.0, size: 1.0, thrust: 1.0 },
      draw: makeDraw('#4af0ff', '#ff4ad8')
    },
    {
      id: 'falcon', name: 'Falcon', ability: 'dash',
      unlockAt: 500, color: '#7CFF6B', accent: '#ffd84a',
      stats: { agility: 1.25, size: 0.95, thrust: 1.1 },
      draw: makeDraw('#7CFF6B', '#ffd84a')
    },
    {
      id: 'tank', name: 'Tank', ability: 'shield',
      unlockAt: 1500, color: '#ff9a4a', accent: '#ff5570',
      stats: { agility: 0.85, size: 1.25, thrust: 0.95 },
      draw: makeDraw('#ff9a4a', '#ff5570')
    },
    {
      id: 'phantom', name: 'Phantom', ability: 'slowmo',
      unlockAt: 3500, color: '#b06bff', accent: '#4af0ff',
      stats: { agility: 1.4, size: 0.85, thrust: 1.25 },
      draw: makeDraw('#b06bff', '#4af0ff')
    },
    {
      id: 'nova', name: 'Nova', ability: 'dash',
      unlockAt: 8000, color: '#ffe04a', accent: '#ff4ad8',
      stats: { agility: 1.3, size: 0.9, thrust: 1.3 },
      draw: makeDraw('#ffe04a', '#ff4ad8')
    },
    /* --- Naves avançadas (desbloqueio mais difícil) --- */
    {
      id: 'vortex', name: 'Vortex', ability: 'shield',
      unlockAt: 15000, color: '#00ffd0', accent: '#ff00aa',
      stats: { agility: 1.35, size: 0.85, thrust: 1.35 },
      draw: makeDraw('#00ffd0', '#ff00aa')
    },
    {
      id: 'quasar', name: 'Quasar', ability: 'slowmo',
      unlockAt: 30000, color: '#ff5edb', accent: '#5effd0',
      stats: { agility: 1.45, size: 0.8, thrust: 1.45 },
      draw: makeDraw('#ff5edb', '#5effd0')
    },
    {
      id: 'pulsar', name: 'Pulsar', ability: 'dash',
      unlockAt: 60000, color: '#a0ff5e', accent: '#ffd84a',
      stats: { agility: 1.5, size: 0.8, thrust: 1.5 },
      draw: makeDraw('#a0ff5e', '#ffd84a')
    },
    {
      id: 'nebula', name: 'Nebula', ability: 'shield',
      unlockAt: 120000, color: '#5e9bff', accent: '#ff5e9b',
      stats: { agility: 1.55, size: 0.78, thrust: 1.55 },
      draw: makeDraw('#5e9bff', '#ff5e9b')
    },
    {
      id: 'singularity', name: 'Singularity', ability: 'slowmo',
      unlockAt: 250000, color: '#ffffff', accent: '#ff4ad8',
      stats: { agility: 1.6, size: 0.75, thrust: 1.6 },
      draw: makeDraw('#ffffff', '#ff4ad8')
    },

    /* --- Fase 2: +10 naves com perfis distintos --- */
    {
      id: 'comet', name: 'Comet', ability: 'dash',
      unlockAt: 300000, color: '#9affff', accent: '#ff7ae6',
      stats: { agility: 1.5, size: 0.82, thrust: 1.4 },
      draw: makeDraw('#9affff', '#ff7ae6')
    },
    {
      id: 'aurora', name: 'Aurora', ability: 'slowmo',
      unlockAt: 400000, color: '#7affc0', accent: '#5e9bff',
      stats: { agility: 1.42, size: 0.84, thrust: 1.35 },
      draw: makeDraw('#7affc0', '#5e9bff')
    },
    {
      id: 'raptor', name: 'Raptor', ability: 'dash',
      unlockAt: 550000, color: '#ffd24a', accent: '#ff5570',
      stats: { agility: 1.62, size: 0.8, thrust: 1.5 },
      draw: makeDraw('#ffd24a', '#ff5570')
    },
    {
      id: 'helix', name: 'Helix', ability: 'shield',
      unlockAt: 700000, color: '#c08bff', accent: '#4af0ff',
      stats: { agility: 1.48, size: 0.86, thrust: 1.42 },
      draw: makeDraw('#c08bff', '#4af0ff')
    },
    {
      id: 'titan', name: 'Titan', ability: 'shield',
      unlockAt: 900000, color: '#ff8a4a', accent: '#ffd24a',
      stats: { agility: 0.95, size: 1.18, thrust: 1.05 },
      draw: makeDraw('#ff8a4a', '#ffd24a')
    },
    {
      id: 'spectre', name: 'Spectre', ability: 'slowmo',
      unlockAt: 1200000, color: '#b06bff', accent: '#5effd0',
      stats: { agility: 1.7, size: 0.76, thrust: 1.6 },
      draw: makeDraw('#b06bff', '#5effd0')
    },
    {
      id: 'ember', name: 'Ember', ability: 'dash',
      unlockAt: 1600000, color: '#ff6b4a', accent: '#ffd84a',
      stats: { agility: 1.55, size: 0.82, thrust: 1.55 },
      draw: makeDraw('#ff6b4a', '#ffd84a')
    },
    {
      id: 'zephyr', name: 'Zephyr', ability: 'slowmo',
      unlockAt: 2200000, color: '#a0f0ff', accent: '#ff4ad8',
      stats: { agility: 1.72, size: 0.74, thrust: 1.62 },
      draw: makeDraw('#a0f0ff', '#ff4ad8')
    },
    {
      id: 'cosmos', name: 'Cosmos', ability: 'shield',
      unlockAt: 3000000, color: '#8a7bff', accent: '#ff7ae6',
      stats: { agility: 1.6, size: 0.8, thrust: 1.58 },
      draw: makeDraw('#8a7bff', '#ff7ae6')
    },
    {
      id: 'eclipse', name: 'Eclipse', ability: 'dash',
      unlockAt: 5000000, color: '#ffffff', accent: '#9a4aff',
      stats: { agility: 1.78, size: 0.72, thrust: 1.7 },
      draw: makeDraw('#ffffff', '#9a4aff')
    }
  ];

  const byId = {};
  list.forEach(s => byId[s.id] = s);

  /* Cor/accent efetiva (skin do jogador ou padrão da nave) */
  function getSkin(id) {
    const def = byId[id] || list[0];
    const skin = Storage.getShipSkin(id);
    return {
      color: (skin && skin.color) ? skin.color : def.color,
      accent: (skin && skin.accent) ? skin.accent : def.accent
    };
  }

  return { list, get: id => byId[id] || list[0], getSkin };
})();
