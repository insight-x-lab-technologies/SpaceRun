/* Grava e reproduz uma silhueta de voo; não autoriza scores nem altera a simulação. */
const Ghost = (() => {
  const DT = 1 / 60;
  function recorder() {
    let tick = 0; let thrusting = false; const inputs = [];
    return {
      tick(active) {
        const next = !!active;
        if (next !== thrusting) { inputs.push([tick, next ? 'thrustOn' : 'thrustOff']); thrusting = next; }
        tick++;
      },
      finish(context) { return Object.assign({}, context, { durationTicks: tick, inputs: inputs.slice() }); }
    };
  }
  function replay(payload, height) {
    if (!payload) return null;
    const ship = Ships.get(payload.shipId); const scale = height / 600;
    return { payload, tick: 0, event: 0, thrusting: false, y: height * 0.5, vy: 0, w: 46 * ship.stats.size * scale, h: 26 * ship.stats.size * scale, ship };
  }
  function update(state, height) {
    if (!state || state.tick >= state.payload.durationTicks) return;
    while (state.event < state.payload.inputs.length && state.payload.inputs[state.event][0] === state.tick) {
      state.thrusting = state.payload.inputs[state.event][1] === 'thrustOn'; state.event++;
    }
    const up = state.payload.loadout;
    if (state.thrusting) state.vy -= 2300 * state.ship.stats.agility * (1 + up.agility * 0.02) * state.ship.stats.thrust * (1 + up.thrust * 0.02) * DT;
    state.vy = Math.max(-520, Math.min(520, state.vy + 1150 * DT));
    state.y = Math.max(state.h / 2, Math.min(height - state.h / 2, state.y + state.vy * DT));
    state.tick++;
  }
  function draw(ctx, state, x, t) {
    if (!state || state.tick >= state.payload.durationTicks) return;
    ctx.save(); ctx.globalAlpha = 0.38; ctx.setLineDash([5, 5]); ctx.strokeStyle = '#e5f7ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, state.y, state.w * 0.68, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    state.ship.draw(ctx, x, state.y, state.w, state.h, t, state.thrusting, '#d7f6ff', '#70e9ff');
    ctx.restore();
  }
  return { recorder, replay, update, draw };
})();
