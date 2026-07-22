# Development Guide — SpaceRun

> **Como desenvolver novas funcionalidades para o SpaceRun** sem quebrar as
> premissas do projeto e mantendo a documentação e os testes sempre sincronizados.

Este guia é o contrato de trabalho para qualquer mudança de código neste repo.
Ele complementa (e tem menor autoridade que) os documentos de produto/arquitetura:

- `docs/PRODUCT_VISION.md` — visão macro e pilares de design.
- `docs/PRODUCT_FEATURES.md` — lista oficial do que já existe.
- `docs/ARCHITECTURE.md` — layout de módulos, padrões e regras **obrigatórias**.
- `docs/DATA_MODEL.md` — schema, validação, backup e migrações da persistência.
- `docs/QUALITY_GATES.md` — critérios verificáveis para mudança e publicação.
- `docs/decisions/` — ADRs vigentes para Daily, serverless, protocolos e
  competição.
- `docs/ROADMAP.md` — fases de evolução (do núcleo às ambições maiores).

Leia os documentos aplicáveis antes de começar. Este guia diz *como* evoluir o
jogo; eles dizem *o quê*, *por quê* e quais contratos precisam permanecer.

---

## 0. Premissas não-negociáveis (leia antes de tudo)

Estas regras vêm de `ARCHITECTURE.md` e **não podem ser violadas**:

1. **Serverless PWA**, 100% vanilla HTML/JavaScript — **sem frameworks, sem
   bundler, sem backend**.
2. **Asset-free**: nada de imagens/áudio binários. Tudo é procedural
   (canvas 2D + WebAudio).
3. **i18n em 3 idiomas** (`pt`/`en`/`es`): toda string visível vai para
   `src/js/i18n.js` e para o atributo `data-i18n` no HTML.
4. **Um único `<canvas>`** com 3 camadas de parallax + terreno/obstáculos/naves
   procedurais.
5. **Máquina de estados**: `idle → ready → playing → paused → over`. Nunca
   contorne as transições em `game.js`.
6. **Service Worker** faz cache offline. Ao alterar qualquer arquivo servido,
   **bump** `CACHE` e `VERSION` em `src/sw.js` e adicione o arquivo ao array
   `ASSETS`.
7. **Documentação sincronizada**: a cada mudança de tela/nave/setting/módulo,
   atualize `PRODUCT_FEATURES.md` e `ARCHITECTURE.md`.
8. **Persistência versionada**: dados seguem `DATA_MODEL.md`; migração, backup,
   validação e fixture antiga são parte da feature.
9. **Entrada não confiável**: localStorage, URL, clipboard, arquivo e texto do
   jogador são validados e nunca interpolados em `innerHTML`.
10. **Regras versionadas**: Daily, score comparável e replay carregam
    `rulesetId` e seguem os ADRs aceitos.

---

## 1. Antes de codar — entenda o escopo

1. Leia na ordem: `PRODUCT_VISION.md` → `PRODUCT_FEATURES.md` →
   `ARCHITECTURE.md` → `DATA_MODEL.md` → ADRs aplicáveis → `ROADMAP.md` →
   `QUALITY_GATES.md`.
2. Identifique a qual **marco/fase do Roadmap** a tarefa pertence (`FND-*`,
   F0–F11 e suas fatias A/B). Isso define prioridade, dependências, complexidade
   e onde a mudança toca no código (ver "Onde cada fase toca no código").
3. Confirme que a ideia respeita as premissas do item 0. Se não respeitar,
   repense ou discuta antes de implementar.
4. Preencha o contrato curto de tarefa de `QUALITY_GATES.md` antes de editar.
   Para mudança persistente, descreva a migração; para Daily/replay/social,
   indique `rulesetId` e ADR aplicável.

---

## 2. Respeite a arquitetura

- **Módulos são IIFE-globals** em `src/js/*.js`, carregados na **ordem fixa**
  declarada em `src/index.html` (scripts de `storage` até `main`).
  **Não reordene.** Um novo módulo entra **antes de `main.js`**.
- Os módulos se referenciam **pelo nome global** (lexical), não por
  `import`/`export`. O `loadApp()` dos testes depende exatamente dessa ordem.
- **Loop de jogo**: timestep fixo (`FIXED_DT = 1/60`) em `game.js`. Mantenha a
  simulação desacoplada do frame rate (garante determinismo para o Daily Run).
- **Render**: `render(t)` consome um `ctx` 2D stubável — nunca acople lógica de
  jogo à parte de desenho.
- **SW**: qualquer arquivo estático novo deve entrar no `ASSETS` de `sw.js` e
  receber um bump de `CACHE`/`VERSION`, senão não funcionará offline.

---

## 3. Implementação

- Prefira **editar arquivos existentes**. Crie um novo módulo IIFE-global apenas
  se a separação for claramente melhor — e registre-o na ordem de load.
- **i18n**: adicione a chave em `pt`, `en` **e** `es` (em `src/js/i18n.js`);
  use `data-i18n` no HTML. Nunca deixe uma tradução faltando.
- **Persistência**: via `Storage` (localStorage). Desbloqueios progridem por
  metros acumulados (`Storage.recordRun`). Não introduza outro mecanismo de
  storage sem motivo forte. Siga `DATA_MODEL.md`: validação, migração, backup e
  API de mutação explícita são obrigatórios.
- **Acessibilidade/responsividade**: respeite os toggles de Settings e o
  `resize()` DPR-aware já existente.
- **Commits atômicos de código**: mantenha a mudança focada na feature.

---

## 4. Mantenha a documentação sincronizada (OBRIGATÓRIO)

- **`PRODUCT_FEATURES.md`**: adicione a feature à lista (nova tela/nave/setting/
  módulo) e à seção da Fase correspondente. Inclua o que era esperado vs. o que
  foi entregue.
- **`ARCHITECTURE.md`**: atualize "Module layout", regras ou a seção "Testing"
  **se** a arquitetura ou o padrão de teste mudarem.
- **`ROADMAP.md`**: se a feature faz parte de uma Fase do roadmap, atualize o
  progresso (marque `✅ entregue` quando concluída, ou detalhe o que ficou
  pendente). Se for uma ambição nova e não estiver listada, adicione como item
  à Fase apropriada. A regra de ouro do próprio Roadmap: *a cada fase, atualize
  `PRODUCT_FEATURES.md` e `ARCHITECTURE.md`.*
- **`DATA_MODEL.md`**: atualize quando houver campo, validação, migração, limite
  ou comportamento de backup/import/export.
- **`QUALITY_GATES.md`**: atualize quando comandos, matriz suportada, orçamento
  ou portão de publicação mudar.
- **`decisions/`**: crie um ADR quando a mudança altera uma premissa durável;
  substitua decisões aceitas com novo ADR em vez de reescrever o histórico.

---

## 5. Testes (OBRIGATÓRIO)

Toda feature precisa de testes. O projeto usa ferramentas **só em
desenvolvimento**; o app em produção continua vanilla/asset-free.

### 5.1 Unitários / por componente — Vitest + jsdom

- **Local**: `tests/unit/*.test.js`.
- **Helper** `tests/helpers/loadApp.js`:
  - `loadDOM()` injeta o `<body>` do `index.html` (sem `<script>`) no jsdom.
  - `loadApp()` carrega os módulos IIFE num escopo isolado e expõe os globais
    (`Storage`, `I18n`, `Ships`, `Achievements`, `Audio2`, `Input`, `Game`,
    `UI`, `Share`) em `globalThis`.
- **Setup** `tests/setup.js`: `requestAnimationFrame` controlável
  (`globalThis.stepFrames(n)` avança o loop), stub de canvas 2D, e
  `AudioContext` intencionalmente ausente (modo silencioso do `Audio2`).
- **Padrão mínimo**:

  ```js
  import { describe, it, expect, beforeEach } from 'vitest';
  import { loadApp } from '../helpers/loadApp.js';

  loadApp();
  const { Storage, Ships } = globalThis;

  describe('MeuMódulo — comportamento', () => {
    beforeEach(() => {
      Storage.reset();
      localStorage.clear();
    });
    it('faz X', () => {
      expect(Ships.list.length).toBe(20);
    });
  });
  ```

  Para módulos que dependem do DOM (`Game`, `UI`, `Share`, `main`), chame
  `loadDOM()` **antes** de `loadApp()`.

- **Seams de teste** (inofensivos em produção):
  - `Game._debug` expõe `world`, `obstacles`, `pickups`, `ship`, `tick(dt)` e
    `hit()` para dirigir/inspecionar a simulação de forma determinística.
  - `Input._reset()` limpa o estado de empuxo; `Input.init()` é idempotente.
  - `main.js` aceita um `navigator.serviceWorker` falso (com `controller`,
    `register` e `addEventListener`) para validar o reload em nova versão.
- **Drivers de simulação**:
  - `globalThis.stepFrames(n)` avança `n` frames do loop (chama `render`).
  - `window.dispatchEvent(new KeyboardEvent('keydown'/'keyup', { code: 'Space' }))`
    simula input de empuxo/habilidade.
  - `performance.now` e `Date` podem ser falsificados para obter determinismo
    (ex.: testar a semente do Daily Run por dia).
- **Cobertura de linhas**: o harness carrega módulos via `eval`, então o provider
  de cobertura do Vite **não** consegue mapear o código-fonte (reporta 0%). Não
  use `% coverage` como métrica — confie em **testes comportamentais** que
  exercitam o comportamento real de cada módulo.

### 5.2 End-to-end — Playwright

- **Local**: `tests/e2e/*.spec.js`.
- **Servidor estático**: `tests/e2e/server.mjs` (porta `4173`, serve `src/`).
- Exercite o fluxo real do app: Home → Novo Jogo/Daily → `ready` → `playing` →
  Game Over → Share, além de Hangar (20 naves), Conquistas (23), Temas e Settings.
- **Seletores**: prefira escopo por tela para evitar ambiguidade — vários
  botões compartilham `data-action` (ex.: `[data-action="play"]` existe no Home
  **e** no Game Over). Use `#screen-home [data-action="play"]`.

### 5.3 Regras de teste

- Toda nova feature **precisa** de testes (unitários e/ou e2e conforme
  aplicável).
- Se a mudança alterar o comportamento de um teste **pré-existente**, **atualize
  o teste** para refletir o novo comportamento correto. Nunca faça `skip` ou
  ignore para esconder uma falha.

---

## 6. Executar os testes (portão de qualidade)

Antes de commitar, tudo deve estar verde:

```bash
# 1) Unitários / componentes
npm test                # equivale a `vitest run` (tests/unit)

# 2) e2e (1ª vez, instale o Chromium do Playwright)
npx playwright install chromium
npm run test:e2e        # sobe o server.mjs e roda tests/e2e
```

> Limitação conhecida: o Playwright está configurado para reutilizar a porta
> 4173. Antes de aceitar um resultado e2e, confirme que ela não está servindo
> outro projeto; o workflow de GitHub Pages atual também não executa testes.

- `npm run test:watch` roda o Vitest em modo watch durante o desenvolvimento.
- Opcional: `npx vitest run --coverage` (lembre-se de que o número de linhas não
  é confiável neste harness — use para inspeção manual, não como critério).

**Tudo em 0 falhas antes do commit.** Se algo falhar, corrija o código **ou** o
teste, conforme a causa real — não deixe vermelho.

---

## 7. Commit e push (branch `main`)

1. **Revisão**: `git status` e `git diff` para inspecionar o que mudou. Não
   commitar segredos nem artefatos gerados.
2. **`.gitignore`**: `node_modules/`, `coverage/`, `test-results/` já estão
   (ou devem estar) ignorados. Nunca comite essas pastas.
3. **Stage seletivo**: adicione apenas os arquivos intencionais (`src/`, `docs/`,
   `tests/`, configs e `package.json`/`package-lock.json`).
4. **Mensagem**: concisa e descritiva, no estilo do repo (ex.:
   `feat: deterministic Daily Run + v0.4`, `test: unit and e2e suites`,
   `docs: add DEVELOPMENT_GUIDE.md`). Use português ou inglês de forma
   consistente com o histórico.
5. **Commit**: `git commit`.
6. **Push**: `git push origin main` (ou `git push` se já houver upstream).
   - **Não force push.** Não empurre trabalho incompleto/quebrado.
   - Se o fluxo do time exigir PR, abra o PR contra `main` em vez de push direto.

---

## 8. Checklist — Definition of Done

- [ ] Li `PRODUCT_VISION`, `PRODUCT_FEATURES`, `ARCHITECTURE` e `ROADMAP`.
- [ ] Li `DATA_MODEL`, `QUALITY_GATES` e os ADRs aplicáveis.
- [ ] Registrei objetivo, não objetivos, aceite, impacto de dados/ruleset/PWA e
      testes previstos.
- [ ] A mudança respeita as 10 premissas do item 0 (runtime, i18n, canvas,
      estado, cache, docs, dados, segurança e ruleset).
- [ ] `i18n.js` atualizado em `pt`/`en`/`es` (se houver strings novas).
- [ ] Persistência via `Storage`, se aplicável.
- [ ] `PRODUCT_FEATURES.md` atualizado.
- [ ] `ARCHITECTURE.md` atualizado (se a arquitetura mudou).
- [ ] `ROADMAP.md` atualizado (se é feature de uma Fase do roadmap).
- [ ] Schema/migração/fixture atualizados, se houver persistência.
- [ ] ADR criado ou substituído, se a mudança altera uma decisão durável.
- [ ] Gates de segurança, acessibilidade, PWA e performance aplicáveis passaram.
- [ ] Testes unitários/componentes escritos (e e2e, se houver fluxo de UI).
- [ ] Testes pré-existentes atualizados, se afetados.
- [ ] `npm test` **e** `npm run test:e2e` passam (0 falhas).
- [ ] Commit criado e push feito em `main`.

---

## 9. Exemplos mínimos

### 9.1 Adicionar um novo módulo IIFE-global

```js
// src/js/powerups.js  (IIFE-global, sem import/export)
var PowerUps = (function () {
  function spawn(kind, x, y) { /* ...procedural... */ }
  function update(dt) { /* ... */ }
  return { spawn, update };
})();
```

Registre na **ordem fixa** de `src/index.html`, antes de `main.js`:

```html
<script src="js/powerups.js"></script>
<script src="js/main.js"></script>
```

Se ele gera um arquivo novo que deva ser servido offline, adicione ao `ASSETS`
de `src/sw.js` e bump `CACHE`/`VERSION`.

### 9.2 Teste unitário de um módulo que precisa do DOM

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadDOM, loadApp } from '../helpers/loadApp.js';

loadDOM();
loadApp();
const { UI, Storage } = globalThis;

describe('UI — telas', () => {
  beforeEach(() => { Storage.reset(); localStorage.clear(); });
  it('abre o Hangar e lista 20 naves', () => {
    UI.init(() => {});
    UI.showHangar();
    expect(document.getElementById('screen-hangar')).not.toBeNull();
    expect(document.querySelectorAll('#ship-list .ship-card').length).toBe(20);
  });
});
```

### 9.3 Teste do bootstrap / reload do SW (`main.js`)

`navigator.serviceWorker` é substituído por um fake com `controller`,
`register` e `addEventListener`; `window.location.reload` é mockado; o
bootstrap é avaliado e o listener `load` da window é disparado para registrar
os ouvintes do SW. Veja `tests/unit/main.test.js` para o padrão completo.
