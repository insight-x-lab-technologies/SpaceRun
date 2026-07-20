// Carrega o DOM do index.html e os módulos do app (IIFE-globals) num escopo
// isolado, expondo-os em globalThis para os testes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '../../src');

// Injeta o corpo do index.html (sem <script>) para termos o DOM das telas.
export function loadDOM() {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyInner = m ? m[1] : html;
  bodyInner = bodyInner.replace(/<script[\s\S]*?<\/script>/g, '');
  document.body.innerHTML = bodyInner;
}

// Carrega os módulos do app (ordem fixa) num único escopo e expõe os globais.
export function loadApp() {
  const order = ['storage', 'i18n', 'ships', 'achievements', 'audio', 'themes', 'input', 'game', 'ui', 'share'];
  const code = order
    .map((n) => fs.readFileSync(path.join(SRC, 'js', n + '.js'), 'utf8'))
    .join('\n;\n');
  const epilogue = `
    globalThis.Storage = Storage;
    globalThis.I18n = I18n;
    globalThis.Ships = Ships;
    globalThis.Achievements = Achievements;
    globalThis.Audio2 = Audio2;
    globalThis.Themes = Themes;
    globalThis.Input = Input;
    globalThis.Game = Game;
    globalThis.UI = UI;
    globalThis.Share = Share;
  `;
  // Executa num escopo isolado; os IIFEs referenciam-se por nome (lexical).
  // eslint-disable-next-line no-new-func
  const fn = new Function(code + epilogue);
  fn();
}
