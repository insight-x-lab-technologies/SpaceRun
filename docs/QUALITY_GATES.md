# SpaceRun — Portões de qualidade

Status: **baseline v0.5**. Contratos, unitários e matriz E2E são automatizados;
offline real, contraste em aparelho e playtest humano continuam sendo registros
manuais de release.

Este documento define o mínimo necessário para alterar e publicar o SpaceRun.
Ferramentas de desenvolvimento são permitidas; o app em produção continua
vanilla, sem bundler, backend ou etapa de build.

## Severidade

- **P0 bloqueante:** segurança, perda de progresso, estado/determinismo,
  publicação quebrada, offline básico e acessibilidade crítica.
- **P1 bloqueante para release:** regressão funcional, i18n, viewport suportado,
  performance acima do orçamento e documentação incompatível.
- **P2 melhoria planejável:** cobertura adicional, ergonomia interna e dívida sem
  impacto imediato comprovado.

Não reduzir severidade apenas porque o problema aparece em navegador, idioma ou
dispositivo específico suportado.

## Gate 1 — Escopo e contrato da tarefa

Antes de editar, a tarefa deve registrar:

```text
ID/título:
Objetivo observável:
Não objetivos:
Dependências/ADRs:
Arquivos ou módulos esperados:
Mudança de dados/migração:
Mudança de i18n/acessibilidade:
Impacto no Daily/ruleset/replay:
Impacto PWA/cache/versão:
Critérios de aceite:
Testes previstos:
Documentação a atualizar:
```

Para um bug, incluir reprodução, resultado atual e resultado esperado. Para
feature, preferir uma fatia vertical pequena que possa ser ativada e testada
independentemente.

## Gate 2 — Regras arquiteturais automáticas

Um teste de contrato deve falhar quando houver divergência em qualquer item:

- Ordem de scripts: `storage → i18n → ships → achievements → audio → themes →
  input → game → ui → share → main`, com posições novas explicitamente
  documentadas.
- `tests/helpers/loadApp.js` carrega os mesmos módulos, na mesma ordem, exceto
  `main.js`, testado separadamente.
- Todo arquivo local referenciado por HTML/manifest/scripts está em `ASSETS`.
- Arquivo estático novo implica bump coerente de `CACHE` e `VERSION`.
- Versões de `package.json`, SW, footer e documentos oficiais não divergem.
- Chaves i18n têm paridade entre pt/en/es; todo `data-i18n` resolve.
- Ids de nave, achievement, tema, modo, power-up e ruleset são únicos.
- Produção não contém `import`/`export`, dependência de bundler ou acesso de
  persistência fora de `Storage`.

## Gate 3 — Segurança e dados não confiáveis

Obrigatório em toda tela ou protocolo:

- Dados do jogador, localStorage, URL, clipboard, arquivo ou payload importado
  são não confiáveis.
- Renderizar texto com `textContent`; não interpolar esses dados em `innerHTML`.
- Validar formato, enum, faixa e tamanho antes de usar.
- Limitar bytes antes de decodificar base64/descompactar/parsear JSON.
- URLs externas devem usar protocolos permitidos e `noopener noreferrer` quando
  abrirem nova aba.
- Nenhum segredo, token ou save completo pode aparecer em log/erro.
- Avaliar CSP ao alterar fontes de script, estilo, áudio, imagem ou conexão.

Testes mínimos: markup no nome, Unicode, payload truncado, versão desconhecida,
campos extras, números não finitos e payload acima do limite.

## Gate 4 — Persistência e migração

Aplicar `DATA_MODEL.md` quando qualquer campo persistido mudar:

- default e validação definidos;
- migração idempotente;
- backup antes de substituir formato anterior;
- escrita transacional;
- erro comunicável sem perder estado em memória;
- round-trip e fixtures antigas testados;
- arrays/counters limitados;
- reset/export/import testados quando afetados.

Uma feature persistente não pode ser publicada apenas porque funciona em save
novo. Save legado é parte do contrato público do jogo.

## Gate 5 — Unitários e testes de componente

Comandos mínimos:

```bash
npm test
```

Regras:

- Todo comportamento novo tem teste positivo e pelo menos um limite/erro.
- Bug corrigido ganha teste que falhava antes da correção.
- Determinismo compara estado lógico, não apenas pixels ou snapshots frágeis.
- Temporizadores, data e RNG são controlados quando fazem parte do contrato.
- Não usar `skip`, retries ou tolerâncias largas para esconder flakiness.
- O número de cobertura de linhas não é gate enquanto o harness usar `eval`;
  cobertura comportamental e matriz de casos são revisadas explicitamente.

## Gate 6 — E2E e matriz suportada

Comando mínimo local:

```bash
npm run test:e2e
```

Antes de executar localmente, confirmar que a porta 4173 está livre ou serve o
`src/` deste repositório. Em CI, `reuseExistingServer` deve ser falso.

Matriz mínima da v0.5:

| Projeto | Viewport/contexto | Fluxo mínimo |
|---------|-------------------|--------------|
| desktop | Chromium desktop | Home → ready → playing → pause → over |
| mobile-small | 320×568, touch | Home, thrust, habilidade, Game Over |
| mobile-landscape | landscape, touch | rotação durante menu e run |
| tablet-dpr2 | tablet, DPR 2 | Hangar, Settings, Daily e share |

Fluxos transversais:

- pt/en/es;
- persistência após reload;
- Daily sob espera/resize distintos;
- teclado e foco;
- update PWA durante run;
- primeira visita online seguida de execução offline;
- fallback quando Web Share/clipboard/install não existem.

WebKit/Firefox podem ser adicionados como matriz informativa inicialmente; bugs
críticos em navegadores declarados suportados continuam bloqueantes.

## Gate 7 — PWA e atualização

- Manifest válido, ícones acessíveis e scope/start_url corretos no hosting real.
- App shell inicia offline depois de uma visita online.
- Falha de um asset não deixa cache inconsistente sem diagnóstico.
- Atualização nunca recarrega `ready`, `playing` ou `paused`.
- Resultado de uma run em `over` é persistido antes de oferecer reload.
- Cache antigo é removido somente quando o novo cache instalou com sucesso.
- O teste deve exercitar Service Worker real em navegador, além dos mocks.

## Gate 8 — Acessibilidade

Checklist mínimo:

- zoom permitido;
- headings e labels localizados;
- foco visível e ordem lógica;
- foco movido/restaurado ao abrir/fechar tela ou overlay;
- ações disponíveis por teclado, sem armadilha de foco;
- status importantes anunciados com `aria-live` sem repetição excessiva;
- contraste suficiente nos três temas;
- selected/locked/ready não dependem apenas de cor;
- reduzir movimento respeita preferência do sistema e setting salvo;
- touch targets adequados e safe areas preservadas;
- canvas possui instrução textual equivalente para controles/objetivo.

Executar análise automatizada no fluxo principal e uma verificação manual curta.
Zero violações críticas conhecidas é requisito; exceções precisam de issue e
justificativa explícita.

## Gate 9 — Performance

Baseline inicial:

- `src/` completo abaixo de 600 KiB até decisão documentada;
- nenhum array de entidade cresce sem limite;
- run automatizada de 3–5 minutos sem crescimento contínuo de memória;
- frame time p95 não regride mais de 15% no mesmo ambiente de CI;
- nenhuma feature cosmética altera física, RNG lógico ou score;
- Performance Mode reduz custo visual sem mudar resultado determinístico.

O relatório deve guardar ambiente, commit, duração, p50/p95 de frame e picos de
entidades. Métricas de headless servem para regressão relativa, não para alegar
FPS real em aparelho. Antes de release relevante, testar manualmente em um
mobile modesto definido no relatório de baseline.

## Gate 10 — CI e publicação

O workflow deve executar nesta ordem:

1. checkout;
2. Node em versão fixada e cache de npm;
3. `npm ci`;
4. lint/contratos;
5. unitários;
6. E2E mínimo;
7. upload de artefatos de falha;
8. deploy de `src/`, somente se tudo anterior passar.

Branch protection é recomendada quando disponível. Dependências e actions devem
ser atualizadas conscientemente; runtime de produção não pode passar a depender
de pacote npm.

## Gate 11 — Documentação e release

Atualizar conforme o impacto:

- `PRODUCT_FEATURES.md`: comportamento entregue, não intenção.
- `ARCHITECTURE.md`: módulo, dependência ou contrato novo.
- `ROADMAP.md`: status e pendências reais.
- `DATA_MODEL.md`: campo, migração ou regra persistente.
- `QUALITY_GATES.md`: gate/comando/matriz alterado.
- `decisions/`: decisão durável ou mudança de premissa.
- `DEVELOPMENT_GUIDE.md` e `AGENTS.md`: fluxo de trabalho alterado.

Versão, cache e footer devem ser atualizados juntos quando houver release. Não
marcar fase como entregue com subtarefas silenciosamente pendentes.

## Gate 12 — Revisão final

Antes de commit/push:

```bash
git status --short
git diff --check
git diff
npm test
npm run test:e2e
```

Confirmar também:

- nenhuma alteração não relacionada foi incluída;
- nenhum segredo/artefato temporário foi criado;
- migrations e dados antigos foram preservados;
- strings novas existem em pt/en/es;
- arquivos estáticos novos estão no cache;
- critérios de aceite da tarefa estão demonstrados.

## Gate 13 — Validação de produto

Antes de iniciar uma nova camada de retenção, competição ou monetização, executar
um playtest curto sem explicar previamente os controles.

Roteiro mínimo:

1. O jogador encontra e inicia uma partida?
2. Entende segurar/soltar e descobre a habilidade?
3. Consegue explicar por que morreu?
4. No Game Over, qual ação escolhe e por quê?
5. Texto, contraste, som, toque e frame pacing causaram dificuldade?
6. O que o faria jogar outra run: domínio do controle, progresso, conteúdo ou
   recompensa externa?

Registrar data, classe de dispositivo/viewport e observações agregadas. Não
registrar nome, save, URL pessoal ou identificador. Cinco sessões diversas são o
mínimo para o baseline v0.5; isso revela problemas grosseiros, não constitui
pesquisa estatística.

Achado P0/P1 vira tarefa antes da próxima fase. F4B só é autorizada se houver
evidência de que o core loop é compreendido e sustenta repetição sem depender de
pressão artificial de calendário.

## Definition of Done por tipo

### Correção pequena

- reprodução documentada;
- teste de regressão;
- unitários verdes;
- E2E quando houver fluxo real afetado;
- sem mudança de contrato não documentada.

### Feature de gameplay

- regras e não objetivos explícitos;
- determinismo/ruleset avaliados;
- unitários + E2E;
- performance medida;
- pt/en/es e acessibilidade;
- features/arquitetura/roadmap atualizados.

### Mudança persistente

- todos os gates de gameplay aplicáveis;
- schema, migração, backup, round-trip e corrupção;
- fixture da versão anterior;
- export/import revisados.

### Novo módulo/arquivo

- responsabilidade e API documentadas;
- dependências e posição de carga explícitas;
- helper de testes atualizado;
- `ASSETS` e versão atualizados;
- teste de contrato verde.

### Protocolo social/importação

- ADR aceito;
- envelope versionado e limitado;
- parser hostil testado;
- incompatibilidade tratada;
- origem importada identificada como não verificada;
- nenhuma alegação de identidade, ranking global ou anti-cheat.
