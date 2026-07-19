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
| 4 | Modos de Jogo & Desafios | P3 | Média/Alta | Rejogabilidade por objetivos diferentes |
| 5 | Ultra Ambicioso | P4 | Alta | Ghosts multiplayer, campanha, geração de universos |
| 6 | Monetização (cosmética) | P4 | Baixa | Sustento via doação + cosméticos, sem quebrar o jogo |

---

## Fase 0 — Game Feel & Polish  ·  P0  ·  complexidade baixa

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
- **Estatísticas mínimas**: `totalRuns`, `bestTime` (tempo da melhor distância)
  em `Storage`, mostradas no Home/Hangar.

**Pronto quando:** o jogo responde a cada input com áudio/visual imediato, roda
bem em portrait e landscape, e tem ao menos um toggle de acessibilidade.

---

## Fase 1 — Progressão & Colecionáveis  ·  P1  ·  complexidade baixa/média

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
  joga no mesmo dia (base para ranking futuro em Fase 3).

**Pronto quando:** há cristais acumuláveis, pelo menos 2 obstáculos novos, e a
cor do espaço muda com a distância.

---

## Fase 2 — Variedade de Naves & Customização  ·  P1/P2  ·  complexidade média  ·  ✅ entregue

Identidade e escolha, mantendo o controle "segurar para subir".

- **Habilidades especiais por nave** (sem quebrar o `Input`): ativadas por um
  gesto derivado do thrust — ex.: *double-tap* (dois `start` rápidos) ou
  *segurar após soltar*. Habilidades: `dash` (boost horizontal), `shield`
  (blindagem de 1 hit), `slowmo` (desacelera o mundo 2 s). `ships.js` ganha
  `ability` e `Input` expõe um evento `ability` opcional.
- **+10 naves novas** com perfis distintos (já incluídas 10; estender `Ships.list`).
- **Customização de cor/accent** (skins procedurais): o jogador pinta a nave com
  cores escolhidas; salvo em `Storage`. O `draw` já recebe `color`/`accent`.
- **Upgrades leves com cristais**: +agilidade/+thrust como multiplicadores visuais
  (cosmético de sensação, não pay-to-win — só gasta cristais de gameplay).

**Pronto quando:** pelo menos 3 naves têm habilidade jogável e o jogador pode
  pintar sua nave. — **entregue** (habilidades `dash`/`shield`/`slowmo` via
  double-tap; +10 naves; skins procedurais; upgrades com cristais).

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
- **Desafio Diário com ranking local**: usa o seed da Fase 1; ranking local do
  dia.

**Pronto quando:** o jogador tem conquistas, um Top 10 local e consegue exportar
  um card de recorde como imagem. — **entregue** (13 conquistas; ranking Top 10
  com nome opcional; score card em canvas via `share.js` com download/Web Share).

---

## Fase 4 — Modos de Jogo & Desafios  ·  P3  ·  complexidade média/alta

Rejogabilidade por objetivos, não só "vá longe".

- **Zen Mode**: sem morte, terreno largo, música calma (`Audio2.startMusic('menu')`
  durante o jogo); foco em relaxar e colecionar.
- **Time Attack**: alcance X metros antes do tempo; HUD com cronômetro.
- **Hardcore**: 1 vida, sem power-ups, túnel mais apertado.
- **Power-ups temporários** (spawns procedurais): `shield`, `slowmo`, `magnet`
  (puxa cristais), `turbo` (velocidade + pontos). Respeitam o modelo de entidade
  de `game.js`.
- **Mini-bosses procedurais**: a cada N metros, uma "nave inimiga" ou "portão"
  com padrão de movimento gerado; colisão circle-vs-ship já existe.

**Pronto quando:** pelo menos 3 modos jogáveis e 2 power-ups funcionando.

---

## Fase 5 — Ultra Ambicioso  ·  P4  ·  complexidade alta

Ideias de longo prazo, viáveis mantendo serverless.

- **Multiplayer assíncrono (ghosts)**: gravar a sequência de inputs da run e
  reproduzi-la como "fantasma" de outro jogador. Sincronização via **link
  compartilhado** (base64) ou serviço serverless de terceiro (JSONBin/Supabase
  free) — **sem backend próprio**. Dois fantasmas correm lado a lado no canvas.
- **Campanha / Story mode**: capítulos com metas (ex.: "atravesse a Nebulosa X"),
  galáxias nomeadas e geração de universo por seed de capítulo.
- **Gerador de universos**: nebulosas e paletas totalmente paramétricas por
  "bioma", criando variedade visual quase infinita.
- **Áudio adaptativo**: a música reage a eventos (combo sobe o tempo, boss muda
  o padrão do sequenciador em `Audio2`).
- **Gravação de replay/clip**: reencenar a run em canvas e exportar como vídeo
  (MediaRecorder) ou URL de replay — tudo no cliente.
- **Torneios sazonais locais**: ranking de temporada com reset periódico.

**Pronto quando:** ghosts de outros jogadores aparecem na sua run e a campanha
  tem pelo menos 1 capítulo jogável.

---

## Fase 6 — Monetização (cosmética apenas)  ·  P4  ·  complexidade baixa

Só depois do jogo ser divertido e completo. Nunca pay-to-win.

- **Doações**: a tela Donate já existe; melhorar copy e talvez selo "apoie".
- **Cosméticos opcionais**: skins de nave, cores de rastro, "anthem" de menu —
  todos também desbloqueáveis por gameplay (cristais/metros), para não alienar
  quem não paga.
- **Sem servidor de pagamento próprio**: usa plataformas externas (Ko-Fi/BMC)
  como hoje; o app continua serverless.

**Pronto quando:** há pelo menos 3 cosméticos desbloqueáveis e a doação está
  visível sem atrapalhar o gameplay.

---

## Onde cada fase toca no código (referência rápida)

- **Game feel (F0):** `game.js` (`updateParticles`, `drawFlash`, `updateGameplay`,
  `terrain`), `audio.js` (`thrust`, `hit`), `ui.js` (Settings + acessibilidade).
- **Colecionáveis/obstáculos (F1):** `game.js` (`spawnObstacle`, novo `spawnPickup`),
  `storage.js` (`crystals`), `i18n.js` (novas chaves), `sw.js` (se novo módulo).
- **Naves/habilidades (F2):** `ships.js` (`ability`, `+10` entradas, `getSkin`),
  `input.js` (evento `ability` via double-tap), `storage.js` (skins, upgrades),
  `game.js` (aplicação de habilidades, upgrades, escudo/invuln, dash/slowmo).
- **Meta/social (F3):** `storage.js` (achievements, leaderboard, history,
  streak), `achievements.js` (defs + checagem), `ui.js` (telas Achievements/
  Stats/Leaderboard/Share), geração de imagem via canvas em `share.js`.
- **Modos/bosses (F4):** `game.js` (modos via flag em `buildWorld`), possível
  novo módulo `boss.js` (IIFE-global, adicionado à ordem de load antes de `main`).
- **Ultra (F5):** novos módulos IIFE (`ghosts.js`, `campaign.js`, `share.js`),
  todos respeitando a ordem de carga e o `ASSETS` do `sw.js`.

> Regra de ouro: a cada fase, **atualize `PRODUCT_FEATURES.md` e `ARCHITECTURE.md`**
> sempre que surgir tela, nave, setting ou mudança de arquitetura — mantenha a
> documentação sincronizada com o código.
