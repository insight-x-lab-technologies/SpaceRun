# ADR 0006 — Desafios por ghost são referências não verificadas

- Status: **Aceita**
- Data: 2026-07-30
- Escopo: F5B; `protocol.js`, `storage.js`, `game.js`, `ui.js`

## Contexto

Um link de desafio pode compartilhar seed, regras, inputs, score declarado,
nave e upgrades. Isso não iguala as condições: a pessoa que recebe o link pode
usar outra nave ou loadout e o cliente não tem autoridade para provar autoria,
execução ou integridade do resultado.

## Decisão

`kind: "challenge"` tem schema próprio e exige uma meta declarada (`target`).
Nesta fase ele é uma **referência não verificada**, mesmo quando modo, seed e
ruleset coincidem. A UI mostra os dois resultados objetivamente e usa somente
linguagem de meta de referência; não chama o resultado de ranking, vitória
justa, competitivo ou verificado.

O jogador mantém a nave e upgrades atuais. Criar uma comparação competitiva
exigirá novo ruleset e ADR que escolha explicitamente loadout fixo ou categorias
de loadout. Ghosts simples continuam sendo referência visual/treino e não têm
meta competitiva.

## Consequências

- A reprodução não altera RNG, física, score ou assinatura lógica do jogador.
- A meta pode ser celebrada sem alegar paridade de condições.
- Links continuam úteis offline e sem backend, mas não são evidência de
  identidade ou legitimidade.
- O protocolo pode evoluir a uma modalidade justa somente sob novo `rulesetId`.

## Alternativas consideradas

- **Tratar seed igual como competição justa:** rejeitada; ignora nave e
  upgrades mecânicos.
- **Forçar Scout/upgrades zero nesta fase:** adiada; mudaria o produto e exige
  regras/testes próprios.
- **Não mostrar comparação:** rejeitada; elimina a utilidade explícita do
  desafio sem resolver o limite de confiança.

## Verificação

- Challenge sem `target` é recusado pelo `Protocol`.
- O Game Over mostra resultados lado a lado e aviso de referência não
  verificada.
- Testes confirmam que o ghost não altera a simulação do jogador.
