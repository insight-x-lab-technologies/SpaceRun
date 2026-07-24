# SpaceRun — Guia de sessão para Codex

## Em 60 segundos

**SpaceRun** é um endless runner espacial, instalável e offline-first. É uma
PWA estática: não há backend, framework, bundler ou etapa de build para o jogo.
O jogador mantém `Space`/toque pressionado para subir e solta para cair; `Shift`
ou o botão flutuante ativa a habilidade da nave. O estado do jogo é
`idle → ready → playing → paused → over`.

O código de produção está em `src/` e é servido diretamente. O desenho é feito
em um único `<canvas>` e o áudio é sintetizado com WebAudio. Não use imagens ou
áudio binários para gameplay; os PNGs em `src/assets/` são apenas ícones
obrigatórios da PWA.

## Estado real do produto (v0.5; validação operacional da fundação em andamento)

- Jogo clássico e **Daily Run** estão ativos na Home. O Daily usa a data local
  como seed; a sequência de spawns é indexada por distância e tem testes de
  determinismo.
- Há 20 naves, desbloqueadas por metros acumulados, com skins, upgrades locais e
  habilidades `dash`, `shield` ou `slowmo`.
- Cristais, combo, marcos, biomas e obstáculos adicionais já existem.
- Conquistas, estatísticas, histórico, Top 10 local e score card para download/
  Web Share já existem. Não existe leaderboard diário separado, servidor,
  sincronização entre dispositivos, ghost ou missão diária.
- Settings: idioma `pt`/`en`/`es`, tema Neon/Retro/Aurora, som, música,
  partículas, reduzir movimento e alto contraste.
- A base estrutural v0.5 já está no código: save v2 com migração, renderização
  segura, paridade lógica do Daily, atualização PWA diferida, acessibilidade
  essencial, CI e testes de contrato. Ainda faltam os registros operacionais de
  baseline de performance e de playtest humano antes de liberar a F4A.

Leia, nesta ordem, antes de alterar funcionalidade:

1. `docs/PRODUCT_VISION.md`
2. `docs/PRODUCT_FEATURES.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATA_MODEL.md`
5. `docs/decisions/README.md` e os ADRs aplicáveis
6. `docs/ROADMAP.md`
7. `docs/QUALITY_GATES.md`
8. `docs/DEVELOPMENT_GUIDE.md`

## Mapa rápido do código

| Área | Arquivos principais |
|---|---|
| Página, telas e estilo | `src/index.html`, `src/css/style.css`, `src/js/ui.js` |
| Simulação e renderização | `src/js/game.js`, `src/js/ships.js`, `src/js/input.js` |
| Progresso e meta | `src/js/storage.js`, `src/js/achievements.js`, `src/js/share.js` |
| Texto, temas e som | `src/js/i18n.js`, `src/js/themes.js`, `src/js/audio.js` |
| Bootstrap/PWA | `src/js/main.js`, `src/sw.js`, `src/manifest.json` |
| Testes | `tests/unit/`, `tests/e2e/`, `tests/helpers/loadApp.js` |

## Regras inegociáveis

1. Mantenha o padrão de IIFEs globais e a ordem relativa exata dos scripts
   existentes em
   `src/index.html`: `storage → i18n → ships → achievements → audio → themes →
   input → game → ui → share → main`. Módulo novo exige posição/dependências
   documentadas e atualização do helper de testes e SW. Não introduza
   `import`/`export`.
2. Toda string visível precisa de chave em `src/js/i18n.js` para **pt, en e es**.
3. Toda persistência passa por `Storage`; não crie uma segunda fonte de progresso.
4. Respeite a máquina de estados do `Game` e use `setState` para novas transições.
5. Arquivo estático novo precisa entrar em `ASSETS` e requer bump de `CACHE` e
   `VERSION` em `src/sw.js`.
6. Atualize `PRODUCT_FEATURES.md`, `ARCHITECTURE.md` e, quando aplicável,
   `ROADMAP.md` junto com mudanças de comportamento.
7. Não use `innerHTML` com dados controláveis pelo jogador; construa o DOM ou use
   `textContent`.
8. Trate `localStorage`, URL, clipboard, arquivo e payload importado como dados
   não confiáveis. Valide formato, faixa e tamanho antes de usar.
9. Mudança persistente segue `DATA_MODEL.md`; não altere schema sem migração,
   backup e testes de fixture antiga.
10. Daily, score comparável ou replay seguem `rulesetId` e os ADRs em
    `docs/decisions/`.

## Verificação e entrega

```bash
npm test
npm run test:e2e
```

Os unitários usam Vitest/jsdom. Os e2e usam Playwright e um servidor em 4173;
antes de confiar no resultado, confirme que essa porta não está servindo outro
projeto — a configuração atual permite reutilizar um servidor existente. Não há
CI de testes: o workflow do GitHub Pages apenas publica `src/`.

Os contratos, unitários e a matriz E2E já rodam no CI. Siga
`docs/QUALITY_GATES.md` e registre na entrega os gates que continuam manuais
(offline real, contraste em aparelho, performance e playtest).

Mantenha mudanças focadas, revise `git status`/`git diff`, faça commit atômico e
nunca faça force-push.
