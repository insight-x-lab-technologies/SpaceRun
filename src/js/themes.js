/* Temas (cores + fonte + áudio) — IIFE-global, procedural por padrão.
   Cada tema define:
     - vars:  variáveis CSS (cores) aplicadas inline no <html>, permitindo que
              os toggles de acessibilidade (ex.: alto contraste no <body>)
              continuem sobrescrevendo por especificidade de cascata.
     - font:  font-family de fontes do sistema (offline-first, sem web fonts).
     - audio: configuração passada para Audio2 (clique + música). Suporta MP3
              opcional via menuMp3/gameMp3 (null = síntese procedural). */
const Themes = (() => {
  const list = [
    {
      id: 'neon',
      nameKey: 'theme.neon',
      font: '"Segoe UI", system-ui, sans-serif',
      vars: {
        '--bg': '#05010f', '--bg2': '#0c0524',
        '--accent': '#4af0ff', '--accent2': '#ff4ad8',
        '--text': '#e8f0ff', '--muted': '#8b93b8',
        '--panel': 'rgba(14, 8, 38, 0.92)', '--danger': '#ff5570'
      },
      audio: {
        click: { freq: 660, dur: 0.05, type: 'square', vol: 0.08 },
        menuWave: 'triangle', gameWave: 'square',
        menuSeq: [220.00, 261.63, 329.63, 293.66, 261.63, 220.00, 329.63, 392.00],
        gameSeq: [440.00, 523.25, 659.25, 523.25, 587.33, 659.25, 523.25, 440.00],
        menuMp3: null, gameMp3: null
      }
    },
    {
      id: 'retro',
      nameKey: 'theme.retro',
      font: '"Courier New", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace',
      vars: {
        '--bg': '#0a0f00', '--bg2': '#0f1400',
        '--accent': '#ffb000', '--accent2': '#33ff66',
        '--text': '#ffd789', '--muted': '#9a8a4a',
        '--panel': 'rgba(8, 12, 0, 0.94)', '--danger': '#ff5533'
      },
      audio: {
        click: { freq: 880, dur: 0.04, type: 'square', vol: 0.07 },
        menuWave: 'square', gameWave: 'square',
        menuSeq: [196.00, 246.94, 293.66, 246.94, 220.00, 196.00, 293.66, 329.63],
        gameSeq: [329.63, 415.30, 493.88, 415.30, 440.00, 493.88, 415.30, 329.63],
        menuMp3: null, gameMp3: null
      }
    },
    {
      id: 'aurora',
      nameKey: 'theme.aurora',
      font: 'Georgia, "Times New Roman", "Iowan Old Style", serif',
      vars: {
        '--bg': '#0b0620', '--bg2': '#140a30',
        '--accent': '#b58cff', '--accent2': '#ff9ad5',
        '--text': '#eee6ff', '--muted': '#9a8fc0',
        '--panel': 'rgba(20, 10, 48, 0.92)', '--danger': '#ff6d8a'
      },
      audio: {
        click: { freq: 720, dur: 0.06, type: 'sine', vol: 0.06 },
        menuWave: 'sine', gameWave: 'triangle',
        menuSeq: [261.63, 329.63, 392.00, 349.23, 329.63, 261.63, 392.00, 440.00],
        gameSeq: [349.23, 440.00, 523.25, 440.00, 466.16, 523.25, 440.00, 349.23],
        menuMp3: null, gameMp3: null
      }
    }
  ];

  const byId = {};
  list.forEach(t => byId[t.id] = t);

  function get(id) { return byId[id] || byId.neon; }

  function currentId() {
    const s = Storage.getSettings();
    return byId[s.theme] ? s.theme : 'neon';
  }

  /* Aplica cores/fonte no DOM e configura o áudio do tema. */
  function apply(id) {
    const t = get(id);
    if (typeof document !== 'undefined' && document.documentElement) {
      const root = document.documentElement.style;
      for (const k in t.vars) root.setProperty(k, t.vars[k]);
      root.setProperty('--font', t.font);
      document.documentElement.setAttribute('data-theme', t.id);
    }
    if (typeof Audio2 !== 'undefined' && Audio2.setTheme) Audio2.setTheme(t.audio);
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new Event('musicchange'));
    }
    return t.id;
  }

  /* Salva a escolha e aplica. */
  function set(id) {
    const chosen = byId[id] ? id : 'neon';
    Storage.setSetting('theme', chosen);
    return apply(chosen);
  }

  /* Aplica o tema salvo (chamado no boot da UI). */
  function init() { return apply(currentId()); }

  return { list, get, currentId, apply, set, init };
})();
