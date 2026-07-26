import { test, expect } from '@playwright/test';

const HOME = '#screen-home';

test.describe('SpaceRun — fluxo end-to-end', () => {
  test('Home carrega com menu e logo', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.logo')).toContainText('SPACERUN');
    await expect(page.locator(HOME)).toBeVisible();
    await expect(page.locator(`${HOME} [data-action="play"]`)).toBeVisible();
    await expect(page.locator(`${HOME} [data-action="customGame"]`)).toBeVisible();
    await expect(page.locator(`${HOME} [data-action="hangar"]`)).toBeVisible();
  });

  test('Novo Jogo: ready -> playing e distância aumenta', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="play"]`);
    // estado "ready"
    await expect(page.locator('#ready-overlay')).toBeVisible();
    // primeiro input inicia o jogo
    await page.keyboard.down('Space');
    await expect(page.locator('#ready-overlay')).toBeHidden();
    await expect(page.locator('#hud')).toBeVisible();
    // segura o empuxo um pouco para acumular metros
    await page.waitForTimeout(600);
    const dist = await page.locator('#hud-distance').textContent();
    const meters = parseInt(dist.replace(/\D/g, ''), 10);
    expect(meters).toBeGreaterThan(0);
    await page.keyboard.up('Space');
  });

  test('rotação mantém o buffer do canvas alinhado ao viewport', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="play"]`);
    await page.keyboard.press('Space');

    for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(350);
      const size = await page.locator('#game-canvas').evaluate(canvas => {
        const rect = canvas.getBoundingClientRect();
        return { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height, dpr: window.devicePixelRatio };
      });
      expect(size.width).toBe(Math.floor(size.cssWidth * Math.min(size.dpr, 2)));
      expect(size.height).toBe(Math.floor(size.cssHeight * Math.min(size.dpr, 2)));
    }
  });

  test('Custom Game desbloqueia Daily Run e inicia partida diária', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="customGame"]`);
    await expect(page.locator('#screen-custom-game')).toBeVisible();
    await expect(page.locator('[data-action="playMode"][data-mode="daily"]')).toBeDisabled();
    await page.evaluate(() => Storage.recordRun(10000, 0, 0));
    await page.click('#screen-custom-game [data-action="home"]');
    await page.click(`${HOME} [data-action="customGame"]`);
    await page.click('[data-action="playMode"][data-mode="daily"]');
    await expect(page.locator('#ready-overlay')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.locator('#hud')).toBeVisible();
  });

  test('Sprint é selecionável no Custom Game e mostra cronômetro no HUD', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => Storage.recordRun(50000, 0, 0));
    await page.click(`${HOME} [data-action="customGame"]`);
    await page.click('[data-action="playMode"][data-mode="sprint"]');
    await page.keyboard.press('Space');
    await expect(page.locator('#hud-objective')).toContainText('SPRINT');
  });

  test('Power-up coletado aparece no HUD da run', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="play"]`);
    await page.keyboard.press('Space');
    await page.evaluate(() => {
      const ship = Game._debug.ship;
      Game._debug.spawnPowerup('magnet', ship.x, ship.y);
    });
    await expect(page.locator('#hud-powerup')).not.toBeEmpty();
  });

  test('Hangar lista 20 naves e permite selecionar', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="hangar"]`);
    await expect(page.locator('#screen-hangar')).toBeVisible();
    await expect(page.locator('#ship-list .ship-card')).toHaveCount(20);
    // seleciona a primeira nave desbloqueada
    await page.locator('#ship-list .ship-card').first().click();
  });

  test('Hangar permite desbloquear uma assinatura de voo com cristais', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => Storage.recordRun(0, 0, 1000));
    await page.click(`${HOME} [data-action="hangar"]`);
    const wave = page.locator('[data-action="buyCosmetic"][data-type="trail"][data-value="wave"]');
    await expect(wave).toBeVisible();
    await wave.click();
    await expect(page.locator('[data-action="selectCosmetic"][data-type="trail"][data-value="wave"]')).toHaveClass(/selected/);
  });

  test('Conquistas lista 23 desafios', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="achievements"]`);
    await expect(page.locator('#screen-achievements')).toBeVisible();
    await expect(page.locator('#ach-list .ach-card')).toHaveCount(23);
  });

  test('Configurações: trocar o tema aplica data-theme', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="settings"]`);
    await page.selectOption('#set-theme', 'retro');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'retro');
    await page.selectOption('#set-theme', 'neon');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon');
  });

  test('Configurações: toggle de som persiste', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="settings"]`);
    const sound = page.locator('#set-sound');
    const before = await sound.isChecked();
    await sound.click();
    expect(await sound.isChecked()).toBe(!before);
  });

  test('Configurações expõem a vibração tátil opcional', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="settings"]`);
    const haptics = page.locator('#set-haptics');
    await expect(haptics).not.toBeChecked();
    await haptics.check();
    await expect(haptics).toBeChecked();
  });

  test('Footer traz ícones de compartilhamento com links corretos', async ({ page }) => {
    await page.goto('/');
    const row = page.locator('#share-row');
    await expect(row).toBeVisible();
    await expect(row.locator('.share-ic')).toHaveCount(7);

    const wa = row.locator('[data-share="whatsapp"]');
    await expect(wa).toHaveAttribute('href', /wa\.me\/\?text=/);
    await expect(wa).toHaveAttribute('aria-label', /WhatsApp/);

    await expect(row.locator('[data-share="telegram"]')).toHaveAttribute('href', /t\.me\/share\/url/);
    await expect(row.locator('[data-share="x"]')).toHaveAttribute('href', /twitter\.com\/intent\/tweet/);
    await expect(row.locator('[data-share="facebook"]')).toHaveAttribute('href', /facebook\.com\/sharer/);
    // TikTok/Instagram e copy não usam web-intent (sem href)
    await expect(row.locator('[data-share="tiktok"]')).not.toHaveAttribute('href', /\w/);
    await expect(row.locator('[data-share="instagram"]')).not.toHaveAttribute('href', /\w/);
  });

  test('Loop completo até Game Over e gravação', async ({ page }) => {
    await page.goto('/');
    await page.click(`${HOME} [data-action="play"]`);
    await page.keyboard.press('Space'); // inicia
    // sem input: a nave cai e colide -> Game Over
    await expect(page.locator('#screen-gameover')).toBeVisible({ timeout: 15000 });
    const goDist = await page.locator('#go-distance').textContent();
    expect(goDist).toMatch(/\d+\s*m/);
    // Compartilhar abre o score card
    await page.click('#screen-gameover [data-action="share"]');
    await expect(page.locator('#screen-share')).toBeVisible();
    await expect(page.locator('#share-canvas')).toBeVisible();
  });
});
