/* Internacionalização (pt-BR, en, es) com detecção automática */
const I18n = (() => {
  const dict = {
    pt: {
      'home.tagline': 'Sobreviva ao vazio infinito',
      'menu.play': 'Novo Jogo',
      'menu.hangar': 'Hangar',
      'menu.settings': 'Configurações',
      'menu.donate': 'Doar',
      'home.best': 'Recorde:',
      'home.footer': '© 2025 Insight X Lab Technologies · v0.1',

      'hangar.title': 'Hangar',
      'hangar.subtitle': 'Escolha sua aeronave',
      'hangar.best': 'Melhor distância:',
      'hangar.back': 'Voltar',
      'ship.locked': '🔒 {n} m acumulados',
      'ship.stat': 'Agilidade {a} • Tamanho {s}',

      'settings.title': 'Configurações',
      'settings.sound': 'Som',
      'settings.music': 'Música',
      'settings.particles': 'Partículas',
      'settings.lang': 'Idioma',
      'settings.reset': 'Apagar progresso',
      'settings.resetConfirm': 'Apagar todo o progresso?',
      'settings.off': 'Desligado',

      'donate.title': 'Apoie o projeto',
      'donate.subtitle': 'Escolha uma plataforma:',
      'donate.kofi': 'Ko-Fi',
      'donate.bmc': 'Buy Me a Coffee',
      'donate.back': 'Voltar',

      'go.title': 'FIM DE JOGO',
      'go.distance': 'Distância',
      'go.best': 'Recorde',
      'go.unlock': '🚀 Nova nave desbloqueada: {names}!',
      'go.again': 'Jogar de novo',
      'go.menu': 'Menu',

      'pause.title': 'Pausado',
      'pause.resume': 'Continuar',
      'pause.menu': 'Menu',

      'ship.scout.desc': 'Equilibrada e confiável.',
      'ship.falcon.desc': 'Ágil, sobe e desce rápido.',
      'ship.tank.desc': 'Robusta, hitbox maior mas estável.',
      'ship.phantom.desc': 'Leve e veloz, difícil de dominar.',
      'ship.nova.desc': 'Nave lendária dos recordistas.',
      'ship.vortex.desc': 'Motor de dobra estável e preciso.',
      'ship.quasar.desc': 'Propulsão de plasma de alta eficiência.',
      'ship.pulsar.desc': 'Manobrabilidade extrema em combate.',
      'ship.nebula.desc': 'Blindagem avançada e scopo amplo.',
      'ship.singularity.desc': 'A obra-prima absoluta do hangar.'
    },
    en: {
      'home.tagline': 'Survive the infinite void',
      'menu.play': 'New Game',
      'menu.hangar': 'Hangar',
      'menu.settings': 'Settings',
      'menu.donate': 'Donate',
      'home.best': 'Best:',
      'home.footer': '© 2025 Insight X Lab Technologies · v0.1',

      'hangar.title': 'Hangar',
      'hangar.subtitle': 'Choose your ship',
      'hangar.best': 'Best distance:',
      'hangar.back': 'Back',
      'ship.locked': '🔒 {n} m total',
      'ship.stat': 'Agility {a} • Size {s}',

      'settings.title': 'Settings',
      'settings.sound': 'Sound',
      'settings.music': 'Music',
      'settings.particles': 'Particles',
      'settings.lang': 'Language',
      'settings.reset': 'Erase progress',
      'settings.resetConfirm': 'Erase all progress?',
      'settings.off': 'Off',

      'donate.title': 'Support the project',
      'donate.subtitle': 'Choose a platform:',
      'donate.kofi': 'Ko-Fi',
      'donate.bmc': 'Buy Me a Coffee',
      'donate.back': 'Back',

      'go.title': 'GAME OVER',
      'go.distance': 'Distance',
      'go.best': 'Best',
      'go.unlock': '🚀 New ship unlocked: {names}!',
      'go.again': 'Play again',
      'go.menu': 'Menu',

      'pause.title': 'Paused',
      'pause.resume': 'Resume',
      'pause.menu': 'Menu',

      'ship.scout.desc': 'Balanced and reliable.',
      'ship.falcon.desc': 'Agile, rises and falls fast.',
      'ship.tank.desc': 'Sturdy, bigger hitbox but stable.',
      'ship.phantom.desc': 'Light and fast, hard to master.',
      'ship.nova.desc': 'Legendary ship of record holders.',
      'ship.vortex.desc': 'Stable and precise warp drive.',
      'ship.quasar.desc': 'High-efficiency plasma propulsion.',
      'ship.pulsar.desc': 'Extreme combat maneuverability.',
      'ship.nebula.desc': 'Advanced armor and wide scope.',
      'ship.singularity.desc': 'The absolute masterpiece of the hangar.'
    },
    es: {
      'home.tagline': 'Sobrevive al vacío infinito',
      'menu.play': 'Nuevo Juego',
      'menu.hangar': 'Hangar',
      'menu.settings': 'Ajustes',
      'menu.donate': 'Donar',
      'home.best': 'Récord:',
      'home.footer': '© 2025 Insight X Lab Technologies · v0.1',

      'hangar.title': 'Hangar',
      'hangar.subtitle': 'Elige tu nave',
      'hangar.best': 'Mejor distancia:',
      'hangar.back': 'Volver',
      'ship.locked': '🔒 {n} m acumulados',
      'ship.stat': 'Agilidad {a} • Tamaño {s}',

      'settings.title': 'Ajustes',
      'settings.sound': 'Sonido',
      'settings.music': 'Música',
      'settings.particles': 'Partículas',
      'settings.lang': 'Idioma',
      'settings.reset': 'Borrar progreso',
      'settings.resetConfirm': '¿Borrar todo el progreso?',
      'settings.off': 'Apagado',

      'donate.title': 'Apoya el proyecto',
      'donate.subtitle': 'Elige una plataforma:',
      'donate.kofi': 'Ko-Fi',
      'donate.bmc': 'Buy Me a Coffee',
      'donate.back': 'Volver',

      'go.title': 'FIN DEL JUEGO',
      'go.distance': 'Distancia',
      'go.best': 'Récord',
      'go.unlock': '🚀 Nueva nave desbloqueada: {names}!',
      'go.again': 'Jugar de nuevo',
      'go.menu': 'Menú',

      'pause.title': 'Pausado',
      'pause.resume': 'Continuar',
      'pause.menu': 'Menú',

      'ship.scout.desc': 'Equilibrada y confiable.',
      'ship.falcon.desc': 'Ágil, sube y baja rápido.',
      'ship.tank.desc': 'Robusta, hitbox mayor pero estable.',
      'ship.phantom.desc': 'Ligera y veloz, difícil de dominar.',
      'ship.nova.desc': 'Nave legendaria de los récords.',
      'ship.vortex.desc': 'Motor de plegado estable y preciso.',
      'ship.quasar.desc': 'Propulsión de plasma de alta eficiencia.',
      'ship.pulsar.desc': 'Manobrabilidad extrema en combate.',
      'ship.nebula.desc': 'Blindaje avanzado y amplio alcance.',
      'ship.singularity.desc': 'La obra maestra absoluta del hangar.'
    }
  };

  const supported = ['pt', 'en', 'es'];
  let lang = 'en';

  function detect() {
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (nav === 'pt' || nav === 'es') return nav;
    return 'en'; // inglês como padrão para qualquer outro idioma
  }

  function init() {
    const saved = Storage.getSettings().lang;
    lang = (saved && dict[saved]) ? saved : detect();
  }

  function setLang(l) {
    if (dict[l]) { lang = l; Storage.setSetting('lang', l); }
  }

  function t(key, vars) {
    let s = (dict[lang] && dict[lang][key] != null) ? dict[lang][key]
          : (dict.en[key] != null) ? dict.en[key] : key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  // aplica textos estáticos marcados com data-i18n
  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
  }

  return {
    init, setLang, t, apply,
    get lang() { return lang; },
    supported
  };
})();
