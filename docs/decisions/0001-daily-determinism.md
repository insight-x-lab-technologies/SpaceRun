# ADR 0001 — Determinismo lógico e versionado do Daily Run

- Status: **Aceita**
- Data: 2026-07-21
- Escopo: v0.5, F4A, F5, F9; `game.js`, `storage.js`, protocolos e testes

## Contexto

O Daily usa data local como seed e indexa spawns por distância. A implementação
atual ainda deriva geometria de pixels/viewport e avança `world.scroll` durante
`ready`. Os testes usam um viewport fixo e início imediato. A frase “mesmo
layout” fica mais forte do que a garantia demonstrada.

Replays e comparação de scores exigem distinguir lógica determinística de
renderização responsiva. Pixel idêntico entre telas diferentes não é necessário;
desafio lógico equivalente é.

## Decisão

1. Um Daily é identificado por `{dateSeed, rulesetId}`.
2. A data continua local enquanto o produto não adotar explicitamente UTC. A UI
   não promete simultaneidade global na virada do dia.
3. RNG de gameplay é separado de RNG visual. Partículas, estrelas, áudio e
   efeitos nunca consomem a sequência usada por terreno, obstáculos ou pickups.
4. Spawn e geometria relevante usam coordenadas lógicas normalizadas. Pixels são
   calculados somente para renderização e colisão no viewport atual.
5. Tempo em `ready`, frame pacing, DPR, resize e orientação não alteram a
   assinatura lógica. O scroll lógico inicia em valor canônico ao entrar em
   `playing`.
6. Dash/slowmo podem mudar o tempo para alcançar uma distância, mas não a ordem
   de eventos indexados por distância.
7. Mudança em física, colisão, dificuldade, geração, intervalo ou efeito que
   altera resultado cria novo `rulesetId`.
8. Run e score persistem seed, ruleset, modo, nave e snapshot de upgrades.
9. Builds sem suporte ao ruleset de um replay recusam reprodução com mensagem
   localizada; não tentam aproximar silenciosamente.

## Assinatura lógica mínima

Para teste, cada evento contém apenas dados canônicos:

```text
distanceIndex | entityType | normalizedY | normalizedSize | variant | rulesetId
```

Não incluir pixel X/Y, tempo de frame, partículas ou valor arredondado dependente
do viewport.

## Consequências

- Daily continua visualmente responsivo, mas preserva desafio equivalente.
- Testes precisam de múltiplos viewports, espera em `ready` e resize.
- Rebalanceamento explícito cria nova categoria histórica.
- Um score antigo pode permanecer visível sem ser comparável ao ruleset atual.
- A decisão não fornece anti-cheat nem torna loadouts diferentes equivalentes.

## Alternativas consideradas

- **Pixels idênticos em toda tela:** rejeitada; conflita com responsividade.
- **Gravar apenas a seed:** rejeitada; seed sem versão de regras não reproduz
  comportamento depois de balanceamentos.
- **Usar RNG único para gameplay e visual:** rejeitada; settings/efeitos mudariam
  o universo.
- **UTC obrigatório agora:** adiado; mudaria a experiência local existente sem
  necessidade para a fundação.

## Verificação

- Mesma assinatura com início imediato e após espera em `ready`.
- Mesma assinatura em 320×568, landscape, 800×600 e DPR 2.
- Mesma assinatura com frames regulares/irregulares e Performance Mode.
- Mesmo prefixo lógico com e sem dash/slowmo.
- Ruleset incompatível é recusado de forma segura.
