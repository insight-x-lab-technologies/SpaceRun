# ADR 0003 — Protocolo versionado para compartilhamento e replay

- Status: **Aceita**
- Data: 2026-07-21
- Escopo: F5 e compartilhamentos futuros; `protocol.js`, `ghost.js`, `share.js`

## Contexto

Embalar inputs e scores diretamente em base64 na URL cria riscos de tamanho,
incompatibilidade, parsing hostil e acoplamento a uma versão específica da
física. É necessário definir o envelope antes de implementar ghost, desafio ou
leaderboard importável.

## Decisão

Criar um módulo IIFE-global `Protocol`, sem dependência de DOM, responsável por
codificar, decodificar e validar payloads. UI não chama `JSON.parse` em parâmetros
de compartilhamento.

Envelope conceitual:

```js
{
  protocolVersion: 1,
  kind: "ghost",              // ghost | challenge | scores
  createdAt: 1784600000000,
  gameVersion: "0.5",
  rulesetId: "daily-v1",
  payload: { /* schema específico por kind */ },
  checksum: "..."             // integridade acidental, não autenticidade
}
```

Regras:

1. Aplicar limite ao texto codificado antes de base64/decompressão e limite ao
   resultado antes de JSON parse. Limites exatos ficam como constantes testadas
   do módulo; começar pequeno e aumentar apenas com medição.
2. Aceitar somente versões e `kind` conhecidos.
3. Copiar campos permitidos para objeto novo; ignorar protótipos/campos extras.
4. Validar cada número, enum, string, array e quantidade de eventos.
5. Replays armazenam eventos por tick/distância lógica, nunca timestamps de
   `requestAnimationFrame` nem pixels.
6. Compactação, se adotada, é determinística e possui proteção contra expansão
   excessiva.
7. Checksum detecta link truncado/corrompido, mas UI continua marcando conteúdo
   como não verificado.
8. Versão/ruleset incompatível produz resultado tipado (`unsupported`), não
   exceção não tratada nem tentativa silenciosa.
9. Parâmetro de URL é removido/normalizado após importação para evitar reprocessar
   a cada reload.
10. Nenhum dado importado é renderizado com `innerHTML`.

## Payload de ghost mínimo

```js
{
  seed: 20260721,
  mode: "daily",
  shipId: "scout",
  loadout: { agility: 0, thrust: 0 },
  durationTicks: 3600,
  inputs: [[0, "thrustOn"], [18, "thrustOff"]],
  claimedScore: { m: 1234, t: 60.0 }
}
```

O replay pode reproduzir e calcular um resultado local. `claimedScore` nunca é
tomado como verdade sem essa reprodução e, mesmo reproduzido, continua sem prova
de autoria.

## Consequências

- Existe um ponto único para validação e evolução do protocolo.
- Links antigos podem ser recusados com clareza ou migrados por decoder próprio.
- URLs permanecem limitadas; replay longo pode exigir download de arquivo em vez
  de link.
- `protocol.js` deve entrar na ordem de scripts, helper de testes e `ASSETS`.
- F5 passa de complexidade média para alta.

## Alternativas consideradas

- **JSON/base64 ad hoc em cada tela:** rejeitada por duplicação e insegurança.
- **Checksum como assinatura:** rejeitada; não há segredo confiável no cliente.
- **Aceitar qualquer versão e tentar rodar:** rejeitada por resultados incorretos.
- **Salvar replay em serviço externo:** fora do escopo serverless atual.

## Verificação

- Round-trip por `kind` e versão.
- Payload truncado, enorme, comprimido hostil, campos extras e protótipos.
- Eventos fora de ordem, ticks negativos, ids/rulesets desconhecidos.
- Replay reproduzível com frame pacing e viewport diferentes.
- Mensagem localizada para inválido, incompatível e grande demais.
