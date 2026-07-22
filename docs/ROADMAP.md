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
   carregado na ordem de dependências documentada; arte/áudio continuam
   procedurais; strings novas vão
   para os 3 dicionários de `i18n.js`; arquivos novos entram no `ASSETS` do
   `sw.js`.
4. **Factibilidade primeiro.** O roadmap sobe da complexidade baixa (polish) à
   alta (multiplayer assíncrono, campanha), para que haja sempre algo entregável.
5. **Qualidade antes de expansão.** Nenhuma fase futura deve aumentar a dívida
   de persistência, segurança, acessibilidade, PWA ou determinismo. O marco
   estrutural **v0.5** é bloqueador para novas features persistentes ou sociais.
6. **Hipótese antes de sistema.** Retenção, competição e monetização devem ser
   entregues em fatias pequenas e avaliadas antes da criação de mais camadas.

O número da fase representa o agrupamento histórico da ideia, não uma ordem
obrigatória de implementação. A ordem recomendada está explícita abaixo.

## Visão geral das fases

| Marco/Fase | Tema | Prioridade | Status/dependência | Objetivo de valor |
|------------|------|------------|--------------------|-------------------|
| 0 | Game Feel & Polish | P0 | ✅ entregue | Controle responsivo e feedback claro |
| 1 | Progressão & Colecionáveis | P1 | ✅ entregue | Recompensa durante a run |
| 2 | Naves & Customização | P1/P2 | ✅ entregue | Escolha, progressão e identidade |
| 3 | Meta & Social local | P2 | ✅ entregue | Conquistas, estatísticas e compartilhamento |
| **v0.5** | **Fundação estrutural** | **P0** | **próximo; bloqueia 4/5/9+** | Evoluir sem perder saves, segurança, paridade ou qualidade |
| 4A | Power-ups em run | P1 | após v0.5 | Mais decisões e variedade no loop principal |
| 8A | Acessibilidade e performance essenciais | P0 | incluída em v0.5 | Base inclusiva e estável em mobile |
| 7 | Customização & Expressão | P2 | após 4A/8A | Identidade visual sem alterar competição |
| 9 | Modos de Jogo | P2 | após regras de modo/ruleset | Rejogabilidade por objetivos |
| 4B | Retenção e perfil | P2 | só após validar 4A | Motivo saudável para retornar |
| 5 | Social & Ghost P2P | P3 | após ADRs, segurança e protocolo | Competição compartilhável não autoritativa |
| 6 | Doação & cosméticos | P4 | parcial/contínua | Sustento sem interromper o jogo |
| 8B | Qualidade de vida avançada | P3 | após 8A | Novos controles e conforto |
| 10 | Eventos & Comunidade | P4 | depende da fronteira serverless | Conteúdo temporário sem alegações globais falsas |
| 11 | Ultra Ambicioso | P4 | reavaliar após validação do produto | Expansão de longo prazo |

## Ordem recomendada de execução

1. Concluir integralmente o marco **v0.5 — Fundação estrutural**.
2. Entregar **F4A — Power-ups** sem login, missões ou XP.
3. Concluir o restante de **F8A**, se algum item essencial não couber na v0.5.
4. Entregar uma fatia cosmética pequena da **F7**.
5. Implementar 2–3 modos simples da **F9**, todos com `rulesetId` explícito.
6. Avaliar playtests e só então autorizar **F4B — Retenção e perfil**.
7. Implementar **F5 — Ghost/P2P** sobre o protocolo versionado definido nos ADRs.
8. Reavaliar F10/F11. Qualquer ranking global, entitlement pago ou meta global
   exige mudança explícita da premissa serverless.

---

## Marco v0.5 — Fundação estrutural  ·  P0  ·  bloqueador  ·  ⬜ pendente

Objetivo: tornar a base segura e verificável antes de adicionar mais estado,
regras de competição ou módulos. A v0.5 não é uma fase de conteúdo. Ela corrige
contratos existentes e cria portões automáticos para que futuras alterações
possam ser executadas com segurança por pessoas ou agentes.

As tarefas abaixo devem ser implementadas na ordem indicada. Cada item deve ter
commit focado, testes próprios e atualização documental quando alterar um
contrato.

| Item | Status | Dependências mínimas |
|------|--------|----------------------|
| FND-01 | ⬜ pendente | nenhuma |
| FND-02 | ⬜ pendente | FND-01 |
| FND-03 | ⬜ pendente | FND-02 |
| FND-04 | ⬜ pendente | FND-01 |
| FND-05 | ⬜ pendente | FND-01 |
| FND-06 | ⬜ pendente | suíte atual verde |
| FND-07 | ⬜ pendente | FND-02 e FND-06 |
| FND-08 | ⬜ pendente | FND-03 a FND-06 |
| FND-09 | ⬜ pendente | FND-03 e FND-08 |
| FND-10 | ⬜ pendente | FND-02, FND-06 e FND-07 |
| FND-11 | ⬜ pendente | FND-05, FND-08 e FND-09 |

### FND-01 — Segurança do DOM e dados não confiáveis

**Problema:** o nome do jogador é inserido no leaderboard com `innerHTML`. Hoje
o dado é local, mas na Fase 5 nomes, scores e payloads passarão a vir de URLs.

**Implementar:**

- Substituir toda renderização de dados controláveis pelo jogador por criação de
  elementos e `textContent`. Inclui nome, títulos futuros, dados importados,
  mensagens de desafio e campos de payload.
- Manter `innerHTML` apenas para templates 100% constantes/internos. Quando
  houver dúvida, usar DOM explícito.
- Criar funções pequenas de parsing e validação para número, enum, cor, nome,
  seed e timestamp. Escapar texto não substitui validação estrutural.
- Definir limites de tamanho para nomes e payloads antes de decodificá-los.
- Avaliar uma Content Security Policy compatível com canvas, WebAudio, Web Share
  e Service Worker; documentar qualquer diretiva que não possa ser aplicada no
  GitHub Pages.

**Arquivos prováveis:** `src/js/ui.js`, `src/js/storage.js`, `src/index.html`,
`tests/unit/ui.test.js`, `tests/unit/storage.test.js`.

**Aceite:** um nome contendo marcação HTML aparece literalmente como texto; não
cria elementos, atributos nem executa eventos. Testes cobrem entradas vazias,
longas, Unicode e malformadas.

### FND-02 — Schema, validação e migração do save

**Problema:** o save atual faz merge superficial, não possui `schemaVersion`
interno, expõe o objeto mutável por `Storage.get()` e silencia falhas. Novos
sistemas tornariam perda ou corrupção de progresso mais provável.

**Implementar:**

- Seguir o contrato de `DATA_MODEL.md`: envelope versionado, defaults, ranges,
  enums, limites de arrays e registros de run com modo/ruleset.
- Criar migração explícita do save legado `spacerun.save.v1`; nunca zerar um save
  válido apenas porque surgiu um campo novo.
- Manter backup recuperável antes da primeira migração e só promover o novo save
  depois que validação e serialização forem concluídas.
- Normalizar `NaN`, `Infinity`, números negativos, ids desconhecidos, arrays
  excessivos e objetos com formato inválido.
- Fazer `Storage.get()` retornar snapshot somente leitura ou cópia; toda mutação
  deve usar método nomeado que persista e valide.
- Tornar falhas de leitura/escrita diagnosticáveis sem interromper o jogo. Não
  registrar conteúdo pessoal do save no console.
- Adicionar exportação/importação local de backup somente após o parser seguro
  estar coberto por testes.

**Arquivos prováveis:** `src/js/storage.js`, `src/js/ui.js`, `src/js/i18n.js`,
`tests/unit/storage.test.js`, `tests/unit/ui.test.js`.

**Aceite:** fixture v1 migra preservando progresso; saves incompletos ou
corrompidos recuperam defaults campo a campo; mutação externa não altera o
estado; reset, export e import são testados.

### FND-03 — Contrato determinístico e competitivo do Daily Run

**Problema:** os testes atuais comprovam sequência sob um único viewport e
início imediato. O terreno/spawn depende de viewport e de `world.scroll`, que
continua avançando em `ready`. Além disso, nave e upgrades alteram a física.

**Implementar:**

- Aplicar `decisions/0001-daily-determinism.md`: tempo no overlay, frame pacing,
  rotação e tamanho de viewport não podem mudar a sequência lógica de spawns.
- Representar posições relevantes em coordenadas lógicas normalizadas; converter
  para pixels apenas no render/collision boundary.
- Não avançar o scroll de gameplay em `ready`, ou reiniciá-lo de forma canônica
  na transição para `playing`.
- Introduzir `rulesetId` versionado. Mudanças de física, dificuldade, spawn ou
  colisão que alterem replay/paridade geram um novo ruleset.
- Registrar em cada run: modo, seed, ruleset, nave e snapshot de upgrades.
- Não chamar scores de loadouts diferentes de diretamente comparáveis. A
  política de progressão está em `decisions/0004-progression-and-competition.md`.

**Arquivos prováveis:** `src/js/game.js`, `src/js/storage.js`, `src/js/ui.js`,
`tests/unit/game.test.js`, `tests/e2e/features.spec.js`.

**Aceite:** assinaturas do mesmo Daily são iguais com espera diferente em
`ready`, frame timings diferentes, dash/slowmo, resize e portrait/landscape. O
teste deve comparar coordenadas lógicas, não pixels arredondados.

### FND-04 — Atualização PWA sem interromper partidas

**Problema:** o Service Worker pode assumir controle e provocar reload enquanto
uma partida está ativa.

**Implementar:**

- Ao detectar atualização, guardar `updateAvailable`; não recarregar em
  `ready`, `playing`, `paused` ou `over` antes do resultado ser persistido.
- Exibir aviso localizado no menu/Game Over com ação "Atualizar agora".
- Aplicar automaticamente apenas na Home quando não houver run pendente, ou por
  confirmação explícita.
- Testar primeira instalação, atualização com controller anterior, atualização
  durante a run e inicialização offline.
- Garantir que falha de rede ou cache não deixe a aplicação sem shell utilizável.

**Arquivos prováveis:** `src/js/main.js`, `src/js/ui.js`, `src/index.html`,
`src/sw.js`, `src/js/i18n.js`, testes `main`, `sw` e E2E/PWA.

**Aceite:** nenhuma atualização recarrega uma run; ao voltar à Home o jogador
consegue aplicar a versão nova; primeira instalação não entra em loop de reload.

### FND-05 — Acessibilidade essencial (F8A)

**Problema:** recursos avançados de acessibilidade estão tarde no roadmap, mas
há lacunas básicas hoje: zoom bloqueado, labels assistivos não localizados,
toasts sem anúncio e ausência de gestão de foco entre telas.

**Implementar:**

- Permitir zoom do navegador; preservar `viewport-fit=cover` e safe areas.
- Internacionalizar `aria-label`, `title`, mensagens de status e instruções.
- Usar `aria-live` adequado para marco, conquista, erro e atualização disponível.
- Ao trocar de tela, mover foco para o heading ou ação principal; ao fechar
  overlay, restaurar foco. Elementos ocultos não podem permanecer navegáveis.
- Garantir uso completo por teclado dos menus e foco visível.
- Respeitar `prefers-reduced-motion` como default quando não houver preferência
  salva e manter o toggle explícito como override.
- Verificar contraste e não depender apenas de cor para locked/selected/ready.

**Arquivos prováveis:** `src/index.html`, `src/css/style.css`, `src/js/ui.js`,
`src/js/i18n.js`, testes de UI e E2E.

**Aceite:** checklist de `QUALITY_GATES.md` passa em pt/en/es, teclado e viewport
mobile; axe/Lighthouse não reporta violação crítica conhecida no fluxo principal.

### FND-06 — CI obrigatório antes do deploy

**Problema:** o workflow publica `src/` sem executar testes.

**Implementar:**

- Criar job de validação com Node fixado, `npm ci`, testes unitários e smoke E2E.
- Fazer o deploy depender do job de validação; falha deve impedir publicação.
- Em CI, não reutilizar servidor desconhecido na porta 4173.
- Preservar artefatos do Playwright em falha, sem publicar dados locais.
- Adicionar verificação estática/lint para erros comuns, sem introduzir bundler
  ou alterar o runtime vanilla.

**Arquivos prováveis:** `.github/workflows/static.yml`, `package.json`, configs
de Vitest/Playwright/lint.

**Aceite:** um teste deliberadamente vermelho bloqueia o job de deploy; pipeline
verde executa unitários e E2E antes de publicar.

### FND-07 — Testes de contrato arquitetural

**Problema:** regras essenciais estão apenas na documentação e podem divergir
silenciosamente quando um agente adiciona arquivo, módulo, tradução ou versão.

**Implementar testes que validem:**

- ordem dos scripts em `index.html` e paridade com `tests/helpers/loadApp.js`;
- todo recurso local referenciado pelo app presente em `sw.js#ASSETS`;
- `CACHE`, `VERSION`, `package.json`, footer e documentação coerentes;
- mesmas chaves de i18n em pt/en/es e todo `data-i18n` resolvível;
- ids de nave, achievement, tema, modo e ruleset únicos/conhecidos;
- ausência de handlers inline e de renderização insegura de dados importados.

**Arquivos prováveis:** novo `tests/unit/contracts.test.js`, helper de carga,
`src/index.html`, `src/sw.js`.

**Aceite:** quebrar intencionalmente cada contrato faz um teste falhar com
mensagem que indique exatamente o arquivo e a regra violada.

### FND-08 — Matriz E2E, offline e regressão visual funcional

**Implementar:**

- Projetos Playwright: desktop, mobile 320×568, mobile landscape e tablet/DPR 2.
- Fluxos: Home, Classic, Daily, pause/resume, habilidade touch, rotação, idioma,
  reset, persistência após reload, share fallback e atualização PWA.
- Teste offline real após uma visita online; não limitar a validação do SW a
  mocks unitários.
- Capturas apenas para investigar falhas; não usar screenshot frágil como única
  prova de comportamento.

**Arquivos prováveis:** `playwright.config.mjs`, `tests/e2e/`, novos testes
`tests/pwa/` se a separação reduzir flakiness, scripts do `package.json`.

**Aceite:** a matriz mínima passa em CI e o servidor iniciado pelo teste é
confirmadamente o `src/` deste repositório.

### FND-09 — Baseline de performance e limites de crescimento

**Implementar:**

- Medir frame time, long tasks, quantidade máxima de obstáculos/pickups/
  partículas e crescimento de memória em uma run automatizada de 3–5 minutos.
- Adotar orçamento inicial: pacote estático total abaixo de 600 KiB, nenhum
  array de entidade crescendo sem limite e regressão de frame time p95 menor que
  15% contra o baseline salvo no mesmo ambiente de CI.
- Criar `Performance Mode`: reduzir partículas, remover nebulosas e aumentar o
  passo visual do terreno, sem alterar física, colisão, seed ou score.
- Separar medição de desktop CI da validação manual em aparelho mobile modesto;
  não apresentar FPS headless como FPS real de dispositivo.

**Arquivos prováveis:** novo harness em `tests/performance/`, config Playwright
dedicada, `package.json`, `src/js/game.js`, `src/js/ui.js`, `src/js/storage.js` e
`src/js/i18n.js` para o toggle de Performance Mode.

**Aceite:** harness reproduzível gera relatório curto; modo de desempenho não
altera assinatura determinística nem resultado lógico da simulação.

### FND-10 — Fronteiras de módulo, release e documentação

**Implementar:**

- Não reescrever o projeto nem introduzir framework. Extrair responsabilidade
  apenas quando uma nova feature exigiria ampliar ainda mais `game.js`/`ui.js`.
- Novos domínios devem ter IIFE-global pequeno e API documentada. Candidatos:
  `powerups.js`, `missions.js`, `ghost.js`, `protocol.js`.
- Para cada módulo novo, declarar dependências, posição na ordem de scripts,
  inclusão no helper de testes e no cache offline.
- Centralizar o processo de bump de versão e verificá-lo por teste de contrato.
- Usar o template de tarefa definido em `QUALITY_GATES.md`: objetivo, não
  objetivos, dependências, aceite, testes, dados/migração, i18n, PWA e docs.
- Registrar decisões duráveis em `docs/decisions/`; não esconder decisões de
  produto em comentários de implementação.

**Arquivos prováveis:** `AGENTS.md`, documentos em `docs/`, teste de contratos,
`src/index.html`, `src/sw.js` e `tests/helpers/loadApp.js` quando houver módulo.

**Aceite:** documentação e testes descrevem a mesma ordem de módulos; uma nova
feature pode ser implementada sem editar simultaneamente grandes blocos de
`game.js`, `ui.js` e `storage.js` quando houver domínio próprio.

### FND-11 — Baseline de produto e playtest

**Problema:** quantidade de features não demonstra clareza, diversão ou vontade
de jogar novamente. A próxima fase não deve ser escolhida apenas por estar
numerada no roadmap.

**Implementar:**

- Usar o roteiro curto de `QUALITY_GATES.md` em pelo menos cinco sessões,
  incluindo desktop e mobile, sem orientar o primeiro input.
- Registrar apenas observações necessárias: compreensão do controle, tempo até
  iniciar, causa percebida da primeira morte, ação após Game Over, problemas de
  leitura/input e performance percebida.
- Não adicionar telemetria remota na v0.5. Dados de playtest são agregados e não
  incluem nome, save ou identificador do jogador.
- Transformar achados P0/P1 em tarefas antes de F4A. Preferências isoladas de
  conteúdo não bloqueiam a fundação.

**Arquivos prováveis:** `docs/ROADMAP.md` para decisões/status e um relatório
curto datado em `docs/playtests/`; nenhum código ou identificador de jogador é
necessário para concluir este item.

**Aceite:** existe um resumo datado com dispositivos, roteiro, observações e
decisão explícita de seguir para F4A ou corrigir o core loop primeiro.

### Critério de saída da v0.5

A v0.5 só está concluída quando FND-01 a FND-11 estiverem entregues, os gates de
`QUALITY_GATES.md` estiverem automatizados onde indicado, a migração de save for
validada com fixture realista e a matriz E2E estiver verde. Nenhuma mudança pode
apagar progresso existente silenciosamente.

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
  pegar, som + partícula dourada; contabiliza em `Storage` (`crystals`). Hoje a
  moeda compra skins e upgrades mecânicos locais. A classificação e os limites
  competitivos são formalizados na v0.5 e em
  `decisions/0004-progression-and-competition.md`.
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
  joga no mesmo dia (base para ranking futuro em Fase 3). A v0.4 testa a
  sequência de spawns por distância contra variações de frame e habilidade (ver
  `game.js` — `world.nextSpawnDist`/`nextPickupDist`). Paridade entre viewports,
  orientação e espera em `ready` é trabalho da v0.5.

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
- **Upgrades leves com cristais**: +agilidade/+thrust são progressão mecânica
  obtida apenas por gameplay. Não são cosméticos e precisam constar no snapshot
  de loadout de qualquer resultado comparável.

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
- **Compartilhar recorde (serverless)**: gera uma imagem de "score card" via
  `<canvas>` (sem asset externo) para o jogador postar. Link com seed/score/ghost
  não faz parte da entrega atual e foi movido para a Fase 5.
- **Desafio Diário:** usa o seed da Fase 1 e está acessível pela Home. A seed é
  exibida no Game Over e há uma conquista pela primeira partida diária. Seus
  resultados ainda entram no Top 10 local geral; um ranking separado por dia
  permanece pendente.

**Pronto quando:** o jogador tem conquistas, um Top 10 local e consegue exportar
um card de recorde como imagem. — **entregue** (23 conquistas; ranking Top 10
com nome opcional; score card em canvas via `share.js` com download/Web Share).

---

## Fase 4A — Power-ups durante a run  ·  P1  ·  complexidade média

Primeira fatia após a v0.5. Power-ups tornam cada run mais dinâmica sem criar de
imediato perfil, calendário, missões e uma nova economia.

- **Power-ups durante a run** (spawns procedurais, flutuam como os cristais):
  - `Magnet`: atrai cristais num raio por 5 s.
  - `2x Crystals`: dobra cristais coletados por 8 s.
  - `Turbo`: acelera o jogo por 2 s (mais velocidade = mais pontos por metro).
  - `Shield pickup`: absorve 1 batida (não cumulativo com o escudo da nave).
  - `Slowmo pickup`: bullet-time por 2 s (não cumulativo com habilidade da nave).

Regras obrigatórias:

- Implementar em módulo `powerups.js` IIFE-global, com tipos e durações
  declarativos; `game.js` apenas integra spawn, update, collision e render.
- Spawn usa RNG/índice por distância do ruleset. Efeito visual nunca consome o
  RNG lógico do Daily.
- Definir precedência e não acumulação com habilidades de nave.
- Turbo pode alterar velocidade de travessia, mas não a ordem lógica de spawns.
- Registrar no resultado os power-ups usados para depuração/replay, sem tornar o
  histórico ilimitado.
- Medir se power-ups aumentam variedade e decisões em playtests antes de criar
  sistemas de retenção.

**Pronto quando:** pelo menos 3 power-ups funcionam, têm feedback/i18n/testes,
mantêm determinismo e performance, e a integração não adiciona regras de
power-up diretamente ao monólito de UI.

---

## Fase 4B — Retenção diária e perfil  ·  P2  ·  complexidade alta  ·  condicional

Esta fase não começa automaticamente após 4A. Ela exige evidência de playtests
de que o loop principal sustenta retorno e de que as recompensas não pressionam
o jogador de forma artificial.

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

Regras obrigatórias:

- Separar `missions.js` da simulação e armazenar apenas progresso validado por
  `Storage`.
- Usar calendário local de forma explícita; mudança de fuso/relógio não pode
  apagar recompensas já recebidas nem duplicá-las indefinidamente.
- Não bloquear gameplay com modal obrigatório. Recompensa pode ser coletada na
  Home e deve respeitar reduzir movimento.
- Missões não podem exigir pagamento, spam social ou configuração inacessível.
- XP, recompensas e economia precisam de tabela documentada e testes de limite.

**Pronto quando:** bônus, missões e perfil são fatias independentes, possuem
migração de save e podem ser desativados sem quebrar o core game. Entregar todos
os três na mesma mudança não é recomendado.

---

## Fase 5 — Social & Ghost (P2P)  ·  P3  ·  complexidade alta

Camada social sem backend — tudo via links compartilháveis e dados locais.

**Pré-requisitos:** v0.5 concluída, `rulesetId` ativo, parser seguro e
`decisions/0002-serverless-trust-boundary.md` +
`decisions/0003-versioned-share-replay-protocol.md` respeitados.

- **Código de amigo:** identificador aleatório local, não hash previsível de
  nome+seed. Ele identifica uma origem importada, mas não prova identidade.
  Leaderboard local ganha aba "Importados".
- **Fantasma assíncrono (Ghost):** sequência de inputs da melhor run é
  compactada em base64 e embutida numa URL. Ao abrir o link, o fantasma do
  amigo corre lado a lado no canvas. Sem backend — o replay está na URL.
- **Leaderboard compartilhável:** Top 10 local exportado em envelope versionado,
  validado e limitado. Quem abre importa para uma aba "Importados". Não chamar
  esse conjunto de global, verificado ou anti-cheat.
- **Desafiar amigo:** link com seed específica + score a ser batido. Quem abre
  joga na mesma seed e vê se supera a marca.
- **Notificações de superação:** ao bater recorde de um amigo importado, toast
  celebra ("Você superou {nome}!") com jingle.

**Pronto quando:** um payload válido reproduz o ghost no mesmo ruleset; payload
inválido, excessivo ou incompatível falha com mensagem segura; dados importados
são visualmente identificados como não verificados.

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

## Fase 8 — Acessibilidade & Qualidade de Vida avançada  ·  P2/P3  ·  complexidade variada

Polimento que torna o jogo mais inclusivo, confortável e profissional.

Os fundamentos de zoom, foco, texto assistivo, contraste, reduzir movimento e
Performance Mode pertencem à **F8A**, antecipada para a v0.5. Esta seção contém
o trabalho avançado restante (**F8B**).

- **Modo daltônico (colorblind):** 3 modos (protanopia, deuteranopia, tritanopia)
  que ajustam as cores do jogo (terreno, cristais, HUD). Toggle em Settings.
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

**Pronto quando:** modo daltônico, gamepad e remapeamento têm fallback seguro,
testes de input e instruções localizadas. Gráficos/jukebox não bloqueiam esse
marco e podem ser entregues separadamente.

---

## Fase 9 — Modos de Jogo  ·  P2  ·  complexidade média

Rejogabilidade por objetivos, não só "vá longe".

Cada modo precisa de `modeId` e `rulesetId`; resultados de regras diferentes
não ocupam o mesmo ranking sem filtro explícito. Começar por Zen, Sprint e
Hardcore. Boss Rush só entra após os modos simples validarem a abstração.

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

**Limite arquitetural:** enquanto o projeto permanecer sem backend, eventos são
locais/determinísticos e a comunidade funciona por catálogo estático ou links.
Não existe autoridade global, identidade verificada nem agregação confiável.

- **Eventos temáticos sazonais:** em períodos específicos (Natal, Halloween, Ano
  Novo, Aniversário), o jogo aplica automaticamente (via `new Date()`):
  - Paleta de cores especial.
  - Obstáculos temáticos (abóboras, presentes, fogos) — desenhos procedurais.
  - Faixa musical especial gerada proceduralmente.
  - Conquistas limitadas do evento (persistidas em `Storage`).
- **Galeria de seeds comunitários:** tela com seeds "curados" pela comunidade.
  O jogador insere um seed manualmente ou abre link compartilhado.
- **Desafios comunitários locais/compartilhados:** metas pessoais ou de grupo
  pequeno, importadas/exportadas por payload e sempre marcadas como não
  verificadas. Meta global real fica fora do escopo serverless.
- **Temporadas locais:** ciclos de objetivos e cosméticos locais. Top global e
  badges por posição ficam bloqueados até uma decisão arquitetural que autorize
  backend, autenticação e mecanismo anti-cheat.
- **Compartilhamento aprimorado:** score card (`share.js`) com variações de
  layout por evento; texto inclui hashtags e link direto para o jogo.

**Pronto quando:** pelo menos 1 evento sazonal funcional e a galeria de seeds
comunitários está acessível.

---

## Fase 11 — Ultra Ambicioso  ·  P4  ·  complexidade alta

Ideias de longo prazo para quando o jogo já tiver uma base sólida de conteúdo.

Itens desta fase são hipóteses, não compromissos. Antes de iniciá-los, revisar
visão, dados de playtest, custo de manutenção e a decisão serverless.

- **Prestígio / New Game+:** ao acumular 10.000.000 m, o jogador pode
  "prestigiar" — zera metros e nível, mas ganha selo permanente + cosmético
  exclusivo. Incentivo para jogadores hardcore.
- **Passe de Temporada:** trilha local de recompensas cosméticas. Uma trilha
  premium vinculada a Ko-Fi/BMC não é verificável no cliente e permanece fora
  do escopo até existir integração autorizada; doação não concede entitlement
  implícito.
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

- **Fundação v0.5:** `storage.js` (schema/migração/API segura), `game.js`
  (Daily/ruleset/coordenadas lógicas), `ui.js` + `index.html` (DOM seguro,
  acessibilidade, update UX), `main.js` + `sw.js` (update diferido), configs e
  workflow (CI/matriz/gates), testes de contrato e documentação/ADRs.
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
- **Power-ups (F4A):** novo `powerups.js` (definições, duração e aplicação),
  `game.js` (integração com spawn/update/collision/render), `storage.js` apenas
  para resultados resumidos, `i18n.js` e testes determinísticos.
- **Retenção/perfil (F4B):** novo `missions.js`, `storage.js` (calendário, missões,
  XP, level e migração), `ui.js` (Home/perfil/missões), `i18n.js`. Não colocar a
  avaliação de missões diretamente em `game.js`; consumir eventos resumidos.
- **Social/ghost (F5):** novos módulos `protocol.js` (envelope/validação) e
  `ghost.js` (input recording/replay), `game.js` (ghost draw), `storage.js`
  (origens/scores importados), `ui.js` (aba Importados), `sw.js` e testes hostis.
- **Temas/áudio por tema (F6):** `themes.js` (defs + apply/set/init de CSS vars
  + `--font` + `data-theme`), `audio.js` (`setTheme`/`setMusicTracks`,
  sequências procedurais por tema + MP3 opcional), `storage.js` (`theme` em
  `settings`), `ui.js` (seletor em Settings), `i18n.js` (nomes de tema pt/en/es).
- **Customização (F7):** `storage.js` (trail, explosion, title, banner, hud theme),
  `game.js` (drawTrail, drawExplosion por estilo), `ui.js` (tela de
  personalização no Hangar), `input.js` (vibração tátil via `navigator.vibrate`).
- **Acessibilidade essencial (F8A/v0.5):** `index.html`, `style.css`, `ui.js`,
  `i18n.js`, `game.js` (Performance Mode sem mudar simulação) e matriz E2E.
- **Acessibilidade/QoL avançada (F8B):** `input.js` (Gamepad API, custom key
  mapping, one-handed mode), `game.js` (colorblind palette), `ui.js` (Settings e
  splash), `storage.js` (preferências), `main.js` (boot), `audio.js` (jukebox).
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

Para qualquer item ainda não iniciado, use também `DATA_MODEL.md`,
`QUALITY_GATES.md` e os ADRs em `docs/decisions/` como critérios obrigatórios.
