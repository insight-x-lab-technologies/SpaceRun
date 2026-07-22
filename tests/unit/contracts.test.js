import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

describe('v0.5 — contratos arquiteturais', () => {
  it('mantém a ordem de scripts e a paridade do helper', () => {
    const html = read('src/index.html');
    const scripts = [...html.matchAll(/js\/([\w-]+)\.js/g)].map(m => m[1]);
    const expected = ['storage', 'i18n', 'ships', 'achievements', 'audio', 'themes', 'input', 'game', 'ui', 'share', 'main'];
    expect(scripts).toEqual(expected);
    const helper = read('tests/helpers/loadApp.js');
    expect(helper).toContain("['storage', 'i18n', 'ships', 'achievements', 'audio', 'themes', 'input', 'game', 'ui', 'share']");
  });

  it('pré-cacheia cada recurso local servido pelo app', () => {
    const html = read('src/index.html'); const manifest = read('src/manifest.json'); const sw = read('src/sw.js');
    const paths = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]).filter(p => !/^https?:/.test(p) && !p.startsWith('#'));
    paths.push(...[...manifest.matchAll(/"src"\s*:\s*"([^"]+)"/g)].map(m => m[1]));
    paths.forEach(asset => expect(sw, asset).toContain("'" + asset + "'"));
  });

  it('mantém versões coerentes para a release', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.version).toBe('0.5.0');
    expect(read('src/sw.js')).toContain("const VERSION = '0.5'");
    expect(read('src/js/i18n.js')).toContain('v0.5');
  });

  it('não volta a interpolar o nome do ranking como HTML', () => {
    const ui = read('src/js/ui.js');
    const leaderboard = ui.slice(ui.indexOf('function renderLeaderboard'), ui.indexOf('/* Popup de conquista'));
    expect(leaderboard).not.toContain('innerHTML');
    expect(leaderboard).toContain('textContent');
  });

  it('não permite zoom bloqueado e mantém regras versionadas', () => {
    expect(read('src/index.html')).not.toContain('user-scalable=no');
    expect(read('src/js/game.js')).toContain("daily: 'daily-v1'");
    expect(read('src/js/storage.js')).toContain("const KEY = 'spacerun.save.v2'");
  });
});
