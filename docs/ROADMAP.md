# Roadmap — SpaceRun

> Evolução do jogo, do núcleo divertido às ambições maiores.
> Mantém sempre as premissas de `ARCHITECTURE.md`: **serverless, vanilla
> (sem frameworks/bundler), asset-free (procedural), i18n pt/en/es**.

## Filosofia

1. **Diversão antes de monetização.** O objetivo das primeiras fases é tornar
   o SpaceRun viciante e satisfatório. Monetização só entra no fim, e apenas
   como doação ou cosméticos — nunca pay-to-win.
2. **Valor sobre volume.** Cada fase entrega algo que melhora a experiência de
   quem já joga, não apenas "mais conteúdo".
3. **Respeitar a arquitetura.** Todo novo arquivo continua sendo um IIFE-global
   carregado na ordem fixa; arte/áudio continuam procedurais; strings novas vão
   para os 3 dicionários de `i18n.js`; arquivos novos entram no `ASSETS` do
   `sw.js`.
4. **Factibilidade primeiro.** O roadmap sobe da complexidade baixa (polish) à
   alta (multiplayer assíncrono, campanha), para que haja sempre algo entregável.

## Visão geral das fases

| Fase | Tema | Prioridade | Complexidade | Objetivo de valor |
|------|------|-----------|--------------|-------------------|
| 0 | Game Feel & Polish | P0 | Baixa | O jogo "parece e sente" bem; controle responsivo e claro |
| 1 | Progressão & Colecionáveis | P1 | Baixa/Média | Razão para voltar; recompensa durante a run |
| 2 | Variedade de Naves & Customização | P1/P2 | Média | Escolha e identidade; habilidades procedurais |
| 3 | Meta & Social (offline-first) | P2 | Média | Conquistas, estatísticas, ranking local, compartilhar |
| 6 | Monetização (cosmética) | P4 | Baixa | Sustento via doação + cosméticos, sem quebrar o jogo |
| 4 | Power-ups & Retenção Diária | P1 | Baixa/Média | Poder durante a run + motivo para voltar todo dia |
| 5 | Social & Ghost (P2P) | P2 | Média | Competir com amigos via links, sem servidor |
| 7 | Customização & Expressão | P3 | Baixa/Média | Identidade visual completa do jogador |
| 8 | Acessibilidade & Qualidade de Vida | P3/P4 | Variada | Inclusão, controles e polimento final |
| 9 | Modos de Jogo | P3 | Média | Rejogabilidade por objetivos diferentes |
| 10 | Eventos Sazonais & Comunidade | P4 | Média | Conteúdo temporário e engajamento coletivo |
| 11 | Ultra Ambicioso | P4 | Alta | Campanha, geração de universos, prestígio |

---

## Fase 0 — Game Feel & Polish  ·  P0  ·  complexidade baixa  ·  ✅ entregue

Tornar o núcleo já existente **satisfatório**. É o trabalho de maior
retorno por esforço: não adiciona sistemas novos, só densidade de feedback.

- **Screen shake** no impacto e explosão (`game.js` `drawFlash`/`updateParticles`).
- **Hitstop** micro (congelar 40–80 ms na colisão) para peso.
- **Áudio responsivo**: ligar `Audio2.thrust()` ao empuxo e `Audio2.hit()` à
  colisão (funções já existem, só não são chamadas).
- **Partículas mais ricas**: rastro do thruster com gravidade/inércia já existe;
  adicionar *sparks* nas bordas do túnel e poeira cósmica ao raspar a parede.
- **Curva de dificuldade mais suave**: ajustar `terrain()` e `updateGameplay()`
  para o "easy start" durar um pouco mais (jogador novo precisa de ~15–20 s sem
  pressão antes de apertar).
- **Onboarding**: reforçar o `ready` overlay com um ícone de "segurar" animado e
  dica de toque/espaço; respeitar `data-i18n`.
- **Acessibilidade**: toggle "Reduzir movimento" (some shake/nebulosa forte) e
  "Alto contraste" nas Settings; persistido em `Storage`.
- **Responsividade**: validar portrait muito estreito e telas dobradas (foldables);
  `resize()` já é DPR-aware — ajustar posição da nave (`ship.x`) por proporção.
- **Estatísticas mínimas**: `totalRuns`, `bestTime` (maior tempo de voo,
  independente da distância)
  em `Storage`, mostradas no Home/Hangar.

**Pronto quando:** o jogo responde a cada input com áudio/visual imediato, roda
bem em portrait e landscape, e tem ao menos um toggle de acessibilidade.

---

## Fase 1 — Progressão & Colecionáveis  ·  P1  ·  complexidade baixa/média  ·  ✅ entregue

Dar **motivo para a próxima run** e recompensar ações durante o voo.

- **Cristais/estrelas coletáveis**: spawns procedurais no espaço livre; ao
  pegar, som + partícula dourada; contabiliza em `Storage` (`crystals`). É moeda
  virtual — **não** compra vantagem, só desbloqueia cosmetic/skins no fim.
- **Marcos de distância**: popups de "1.000 m!", "5.000 m!" com jingle leve
  (`Audio2.unlock()` reutilizável) — dá senso de progresso imediato.
- **Multiplicador/combo**: encadear cristais sem bater aumenta o multiplicador
  (feed de pontos, não apenas metros). Placa de combo no HUD.
- **Mais tipos de obstáculos** (procedurais, em `spawnObstacle`):
  - *Campo de detritos* (vários asteroides pequenos em leque).
  - *Micro-buraco negro* que puxa a nave (gravidade local) — perigoso e visual.
  - *Laser/raio* que atravessa parte do túnel por tempo limitado.
- **Biomas por distância**: troca de paleta de estrelas/nebulosa a cada faixa de
  metros (ex.: nebulosa roxa → ciano → âmbar), mantendo tudo procedural.
- **Daily Run / Seed**: um seed reproduzível por dia; mesmo "universo" para quem
  joga no mesmo dia (base para ranking futuro em Fase 3). A paridade está
  **garantida**: spawns indexados por distância, não por `dt`/framerate (ver
  `game.js` — `world.nextSpawnDist`/`nextPickupDist`).

**Pronto quando:** há cristais acumuláveis, pelo menos 2 obstáculos novos, e a
cor do espaço muda com a distância.

---

## Fase 2 — Variedade de Naves & Customização  ·  P1/P2  ·  complexidade média  ·  ✅ entregue

Identidade e escolha, mantendo o controle "segurar para subir".

- **Habilidades especiais por nave** (sem quebrar o `Input`): ativadas por um
  **controle dedicado** — `Shift` no desktop ou um botão de toque flutuante
  (`#ability-btn`) no mobile/tablet (não mais double-tap, que confundia o
  gameplay). Habilidades: `dash` (boost horizontal), `shield`
  (blindagem de 1 hit), `slowmo` (desacelera o mundo 2 s). `ships.js` ganha
  `ability` e `Input` expõe um evento `ability` opcional.
- **+10 naves novas** com perfis distintos (já incluídas 10; estender `Ships.list`).
- **Customização de cor/accent** (skins procedurais): o jogador pinta a nave com
  cores escolhidas; salvo em `Storage`. O `draw` já recebe `color`/`accent`.
- **Upgrades leves com cristais**: +agilidade/+thrust como multiplicadores visuais
  (cosmético de sensação, não pay-to-win — só gasta cristais de gameplay).

**Pronto quando:** pelo menos 3 naves têm habilidade jogável e o jogador pode
  pintar sua nave. — **entregue** (habilidades `dash`/`shield`/`slowmo` via
  botão dedicado `Shift`/toque; +10 naves; skins procedurais; upgrades com cristais).

---

## Fase 3 — Meta & Social (offline-first)  ·  P2  ·  complexidade média  ·  ✅ entregue

Camada de "ficar no jogo" sem servidor. Tudo local + compartilhamento.

- **Conquistas (achievements)**: ex.: "Voou 10.000 m", "Pegou 50 cristais numa
  run", "Sobreviveu 2 min". Desbloqueios com i18n e tela de conquistas.
- **Estatísticas detalhadas**: histórico de runs, tempo médio, melhor streak.
- **Leaderboard local**: Top 10 em `Storage`, com nome opcional do jogador.
- **Compartilhar recorde (serverless)**: gerar uma imagem de "score card" via
  `<canvas>` (sem asset externo) para o jogador postar; link opcional codificado
  em base64 com seed+score (abre na mesma run como ghost — ver Fase 5).
- **Desafio Diário:** usa o seed da Fase 1 e está acessível pela Home. A seed é
  exibida no Game Over e há uma conquista pela primeira partida diária. Seus
  resultados ainda entram no Top 10 local geral; um ranking separado por dia
  permanece pendente.

**Pronto quando:** o jogador tem conquistas, um Top 10 local e consegue exportar
um card de recorde como imagem. — **entregue** (23 conquistas; ranking Top 10
com nome opcional; score card em canvas via `share.js` com download/Web Share).

---

## Fase 4 — Power-ups & Retenção Diária  ·  P1  ·  complexidade baixa/média

Maior retorno por esforço: power-ups tornam cada run mais dinâmica e imprevisível;
sistemas diários fazem o jogador querer abrir o jogo todo dia.

- **Power-ups durante a run** (spawns procedurais, flutuam como os cristais):
  - `Magnet`: atrai cristais num raio por 5 s.
  - `2x Crystals`: dobra cristais coletados por 8 s.
  - `Turbo`: acelera o jogo por 2 s (mais velocidade = mais pontos por metro).
  - `Shield pickup`: absorve 1 batida (não cumulativo com o escudo da nave).
  - `Slowmo pickup`: bullet-time por 2 s (não cumulativo com habilidade da nave).
- **Bônus de login diário:** modal ao iniciar o jogo (24 h desde o último login)
  premia com cristais em sequência crescente (dia 1: 50 → dia 7: 500, reseta).
  Persistido em `Storage`.
- **Missões / Desafios diários:** 3 missões por dia (ex.: "sobreviva 30 s sem
  habilidade", "colete 20 cristais numa run", "passe por 3 laser gates").
  Completar = cristais + XP.
- **Missões semanais:** 5 missões mais difíceis (ex.: "percorra 50.000 m no
  total", "jogue 10 runs"). Recompensa maior (cristais + cosmético).
- **Perfil do jogador / XP:** nível global que sobe com XP (distância, cristais,
  missões). Cada nível dá bônus cosmético (título, cor de nome).

**Pronto quando:** power-ups coletáveis funcionam na run, bônus de login diário
é exibido e missões diárias/semanais são completáveis.

---

## Fase 5 — Social & Ghost (P2P)  ·  P2  ·  complexidade média

Camada social sem backend — tudo via links compartilháveis e dados locais.

- **Código de amigo (Friend Code):** hash do `playerName` + seed permite
  compartilhar recordes via link. Leaderboard local ganha aba "Amigos".
- **Fantasma assíncrono (Ghost):** sequência de inputs da melhor run é
  compactada em base64 e embutida numa URL. Ao abrir o link, o fantasma do
  amigo corre lado a lado no canvas. Sem backend — o replay está na URL.
- **Leaderboard compartilhável:** Top 10 local exportado como string codificada
  (base64) e compartilhada via link. Quem abre importa os scores para uma aba
  "Importados" — leaderboard "global" construído organicamente por P2P.
- **Desafiar amigo:** link com seed específica + score a ser batido. Quem abre
  joga na mesma seed e vê se supera a marca.
- **Notificações de superação:** ao bater recorde de um amigo importado, toast
  celebra ("Você superou {nome}!") com jingle.

**Pronto quando:** é possível ver o fantasma de uma run competindo lado a lado
e trocar scores com amigos via link.

---

## Fase 6 — Monetização (cosmética apenas)  ·  P4  ·  complexidade baixa

Só depois do jogo ser divertido e completo. Nunca pay-to-win.

- **Doações**: a tela Donate já existe; melhorar copy e talvez selo "apoie".
- **Cosméticos opcionais**: skins de nave, cores de rastro, "anthem" de menu —
  todos também desbloqueáveis por gameplay (cristais/metros), para não alienar
  quem não paga.
- **Temas visuais** (cosméticos, entregues): o app é governado por CSS custom
  properties e já traz 3 temas selecionáveis em Configurações — **Neon**
  (padrão), **Retro** e **Aurora** — com fonte do sistema e paleta própria; o
  tema também escolhe a paleta musical procedural e pode apontar para um `.mp3`
  opcional (`menuMp3`/`gameMp3`). Ver `themes.js` + seção "Themes" em
  `PRODUCT_FEATURES.md`.
- **Sem servidor de pagamento próprio**: usa plataformas externas (Ko-Fi/BMC)
  como hoje; o app continua serverless.

**Pronto quando:** há pelo menos 3 cosméticos desbloqueáveis e a doação está
visível sem atrapalhar o gameplay. — **temas entregues** (3 temas + seletor;
MP3 opcional por tema; áudio do menu/gameplay procedural por tema).

---

## Fase 7 — Customização & Expressão  ·  P3  ·  complexidade baixa/média

Dá ao jogador identidade visual além da nave — cada run pode ter uma "assinatura".

- **Trilha / rastro do thruster:** cor e padrão (linha, ondulado, estrelas, chamas)
  selecionáveis por nave. Desbloqueável por cristais ou conquistas.
- **Efeito de explosão:** ao colidir, a explosão pode ser "padrão", "neon",
  "partículas" ou "onda". Cosméticos desbloqueáveis.
- **Títulos & Name Tags:** o nome do jogador no leaderboard e perfil pode exibir
  um título (ex.: "⭐ Novato", "🔥 Vortex", "💀 Lendário") conquistado por marcos
  de distância.
- **Banner de perfil:** imagem procedural gerada no canvas (combinação de cor de
  fundo + padrão + nave favorita) na tela de perfil.
- **Temas de HUD:** o HUD durante a run pode ter estilos visuais alternativos
  (minimalista, retro, neon expandido). Desbloqueáveis por cristais.
- **Vibração tátil (haptic feedback):** em dispositivos móveis com suporte,
  vibrar ao colidir, near-miss, coletar cristal e usar habilidade. Toggle em
  Settings.

**Pronto quando:** o jogador pode personalizar rastro, explosão e título, e
sente vibração tátil no mobile.

---

## Fase 8 — Acessibilidade & Qualidade de Vida  ·  P3/P4  ·  complexidade variada

Polimento que torna o jogo mais inclusivo, confortável e profissional.

- **Modo daltônico (colorblind):** 3 modos (protanopia, deuteranopia, tritanopia)
  que ajustam as cores do jogo (terreno, cristais, HUD). Toggle em Settings.
- **Modo de desempenho (Performance Mode):** reduz partículas, desativa nebulosa
  e diminui qualidade do terreno para dispositivos fracos. Toggle em Settings.
- **Suporte a controles (Gamepad API):** mapear botão A/Space para thrust, bumper
  direito para habilidade. `Input.js` ganha listener de `gamepadconnected`.
- **Mapeamento de controle customizável:** reatribuir teclas (desktop) e escolher
  entre hold-to-thrust ou toggle-to-thrust.
- **Modo uma mão (one-handed):** em mobile, todos os elementos de UI (ability
  button, pause) ficam no lado direito para operação com uma mão.
- **Splash screen / tela de boot:** tela procedural de carregamento enquanto o
  Service Worker e o AudioContext são iniciados. Logo do jogo gerado em canvas.
- **Auto-play / Ghost tutorial:** na primeira vez, uma run "fantasma"
  pré-gravada (inputs hardcoded) demonstra o gameplay por 10 s antes do `ready`.
- **Painel de estatísticas avançado:** gráficos gerados em canvas (distância por
  run, progressão de recorde, cristais por dia). Visualização de tendências.
- **Jukebox / Trilhas sonoras:** músicas desbloqueáveis (procedurais, via
  `Audio2`) selecionáveis para tocar durante o jogo. Cada faixa é desbloqueada
  por distância ou cristais.

**Pronto quando:** modo daltônico, gamepad e gráficos de estatísticas estão
implementados.

---

## Fase 9 — Modos de Jogo  ·  P3  ·  complexidade média

Rejogabilidade por objetivos, não só "vá longe".

- **Seleção de modo na Home:** um seletor antes de "Novo Jogo" expande as
  opções; o seed do Daily Run só se aplica ao modo Normal.
- **Zen / Treino:** sem colisão, terreno sempre largo, música calma. Apenas para
  explorar e coletar cristais.
- **Sprint:** 60 segundos. Máxima distância possível. Cronômetro regressivo.
- **Marathon:** distância fixa de 10.000 m. HUD conta regressivamente.
- **Time Attack:** alcance X metros antes do tempo; HUD com cronômetro.
- **Hardcore:** 1 vida, sem power-ups, túnel mais apertado.
- **Boss Rush:** a cada 2.000 m um mini-boss procedural surge (padrão de
  colisão/esquiva). Derrotar = bônus de cristais.

**Pronto quando:** pelo menos 3 modos jogáveis e seletor de modo na Home.

---

## Fase 10 — Eventos Sazonais & Comunidade  ·  P4  ·  complexidade média

Conteúdo temporário que renova o interesse e cria momentos de comunidade.

- **Eventos temáticos sazonais:** em períodos específicos (Natal, Halloween, Ano
  Novo, Aniversário), o jogo aplica automaticamente (via `new Date()`):
  - Paleta de cores especial.
  - Obstáculos temáticos (abóboras, presentes, fogos) — desenhos procedurais.
  - Faixa musical especial gerada proceduralmente.
  - Conquistas limitadas do evento (persistidas em `Storage`).
- **Galeria de seeds comunitários:** tela com seeds "curados" pela comunidade.
  O jogador insere um seed manualmente ou abre link compartilhado.
- **Desafios comunitários:** meta global (ex.: "10.000.000 m em 1 semana").
  Progresso compartilhado via link. Ao atingir a meta, contribuidores ganham
  cosmético exclusivo.
- **Temporadas competitivas:** a cada 3 meses, novo ciclo de leaderboard.
  Badge cosmético baseado na posição final (Top 1, Top 10, Top 100, Participante).
- **Compartilhamento aprimorado:** score card (`share.js`) com variações de
  layout por evento; texto inclui hashtags e link direto para o jogo.

**Pronto quando:** pelo menos 1 evento sazonal funcional e a galeria de seeds
comunitários está acessível.

---

## Fase 11 — Ultra Ambicioso  ·  P4  ·  complexidade alta

Ideias de longo prazo para quando o jogo já tiver uma base sólida de conteúdo.

- **Prestígio / New Game+:** ao acumular 10.000.000 m, o jogador pode
  "prestigiar" — zera metros e nível, mas ganha selo permanente + cosmético
  exclusivo. Incentivo para jogadores hardcore.
- **Passe de Temporada (Season Pass):** trilha de ~30 recompensas cosméticas
  (skins, efeitos, títulos) desbloqueadas por XP da temporada. Trilha gratuita
  para todos; trilha premium opcional via doação (Ko-Fi/BMC). Cada temporada
  dura 2–3 meses. Tudo cosmético — nunca pay-to-win.
- **Campanha / Story mode:** capítulos com metas (ex.: "atravesse a Nebulosa X"),
  galáxias nomeadas e geração de universo por seed de capítulo.
- **Gerador de universos:** nebulosas e paletas totalmente paramétricas por
  "bioma", criando variedade visual quase infinita.
- **Áudio adaptativo:** a música reage a eventos (combo acelera o BPM, boss
  muda o padrão do sequenciador em `Audio2`).

**Pronto quando:** prestígio funcional e campanha com pelo menos 1 capítulo
jogável.

---

## Onde cada fase toca no código (referência rápida)

- **Game feel (F0):** `game.js` (`updateParticles`, `drawFlash`, `updateGameplay`,
  `terrain`), `audio.js` (`thrust`, `hit`), `ui.js` (Settings + acessibilidade).
- **Colecionáveis/obstáculos (F1):** `game.js` (`spawnObstacle`, novo `spawnPickup`),
  `storage.js` (`crystals`), `i18n.js` (novas chaves), `sw.js` (se novo módulo).
- **Naves/habilidades (F2):** `ships.js` (`ability`, `+10` entradas, `getSkin`),
  `input.js` (evento `ability` via `Shift`/botão de toque), `storage.js` (skins, upgrades),
  `game.js` (aplicação de habilidades, upgrades, escudo/invuln, dash/slowmo).
- **Meta/social (F3):** `storage.js` (achievements, leaderboard, history,
  streak), `achievements.js` (defs + checagem), `ui.js` (telas Achievements/
  Stats/Leaderboard/Share), geração de imagem via canvas em `share.js`.
- **Power-ups & retenção (F4):** `game.js` (spawnPickup expandido com power-ups,
  checagem de missões durante a run), `storage.js` (daily login streak, missões,
  XP, level), `ui.js` (modal login diário, tela de perfil, tela de missões),
  `i18n.js` (strings de missões/recompensas).
- **Social/ghost (F5):** novos módulos `ghost.js` (input recording/replay),
  `social.js` (friend codes, leaderboard compartilhável via encoded string),
  `game.js` (ghost draw no canvas), `storage.js` (friend leaderboard),
  `ui.js` (aba Amigos), `sw.js` (novos assets).
- **Temas/áudio por tema (F6):** `themes.js` (defs + apply/set/init de CSS vars
  + `--font` + `data-theme`), `audio.js` (`setTheme`/`setMusicTracks`,
  sequências procedurais por tema + MP3 opcional), `storage.js` (`theme` em
  `settings`), `ui.js` (seletor em Settings), `i18n.js` (nomes de tema pt/en/es).
- **Customização (F7):** `storage.js` (trail, explosion, title, banner, hud theme),
  `game.js` (drawTrail, drawExplosion por estilo), `ui.js` (tela de
  personalização no Hangar), `input.js` (vibração tátil via `navigator.vibrate`).
- **Acessibilidade/QoL (F8):** `input.js` (Gamepad API, custom key mapping,
  one-handed mode flag), `game.js` (colorblind palette swap, performance mode),
  `ui.js` (Settings expandido, splash screen), `storage.js` (prefs de
  acessibilidade), `main.js` (boot sequence), `audio.js` (jukebox, seleção de
  faixa), `canvas` rendering (colorblind filter application).
- **Modos de jogo (F9):** `game.js` (modos via flag em `buildWorld`),
  `ui.js` (seletor de modo na Home), `storage.js` (progresso por modo),
  possível novo módulo `boss.js` (mini-boss procedural, IIFE-global antes de
  `main.js`).
- **Eventos/comunidade (F10):** `themes.js` (paletas sazonais detectadas por
  data), `game.js` (obstáculos temáticos condicionais), `achievements.js`
  (conquistas de evento), `storage.js` (flags de evento), `share.js` (layout
  sazonal), `ui.js` (galeria de seeds), `i18n.js` (strings sazonais pt/en/es).
- **Ultra (F11):** `storage.js` (prestígio, season pass), `ui.js` (tela do
  season pass), novos módulos IIFE (`campaign.js`), `themes.js` (gerador de
  universos paramétrico), `audio.js` (áudio adaptativo, BPM reativo),
  todos respeitando a ordem de carga e o `ASSETS` do `sw.js`.

> Regra de ouro: a cada fase, **atualize `PRODUCT_FEATURES.md` e `ARCHITECTURE.md`**
> sempre que surgir tela, nave, setting ou mudança de arquitetura — mantenha a
> documentação sincronizada com o código.
