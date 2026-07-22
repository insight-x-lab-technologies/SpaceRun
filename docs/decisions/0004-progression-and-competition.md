# ADR 0004 — Progressão mecânica e comparabilidade de scores

- Status: **Aceita**
- Data: 2026-07-21
- Escopo: F2, Daily, leaderboards, F4, F5 e F9

## Contexto

Cristais compram upgrades permanentes de agilidade e thrust. Eles alteram a
física, portanto a classificação anterior como “cosmético de sensação” é
incorreta. Naves também possuem stats e habilidades diferentes. Scores não são
automaticamente comparáveis apenas porque usam a mesma seed.

## Decisão

1. Upgrades de agilidade/thrust são **progressão mecânica obtida por gameplay**.
   Não usar o termo cosmético para eles.
2. Não vender progressão mecânica nem associá-la a doação. Pay-to-win permanece
   proibido.
3. Classic permite qualquer nave e upgrade desbloqueado.
4. Toda run registra nave e snapshot de upgrades.
5. Leaderboard local pode mostrar todos os resultados, mas filtros/categorias
   deixam claras diferenças de modo, ruleset e loadout.
6. Comparação competitiva exige o mesmo `mode`, `rulesetId` e política de
   loadout.
7. O Daily v0.5 continua **open loadout** para preservar comportamento existente.
   Portanto ele oferece universo compartilhado, não igualdade completa de
   condições. A UI/documentação não promete ranking justo entre loadouts.
8. Antes de leaderboard diário compartilhado, criar novo ADR escolhendo uma das
   políticas: loadout fixo, categorias de loadout ou modo aberto assumidamente
   não competitivo.
9. Ghost incompatível pode ser exibido apenas como referência visual quando a
   reprodução lógica exata não for possível; não comparar score automaticamente.

## Consequências

- A documentação passa a refletir o comportamento real.
- Progressão continua relevante no Classic e no Daily atual.
- Rankings futuros precisam armazenar mais contexto.
- Uma modalidade competitiva justa poderá desativar upgrades sem remover a
  progressão dos demais modos.
- Balanceamento de upgrades deve considerar acessibilidade e dificuldade, não
  apenas economia de cristais.

## Alternativas consideradas

- **Chamar upgrades de cosméticos:** rejeitada; contradiz a física.
- **Remover upgrades imediatamente:** rejeitada; quebraria progressão já entregue
  sem evidência de necessidade.
- **Normalizar Daily para Scout agora:** adiada; é mudança de produto e deve ser
  testada como modalidade/ruleset próprio.
- **Misturar todos os scores sem contexto:** rejeitada; induz comparação falsa.

## Verificação

- Resultado persistido inclui ship/loadout.
- UI não descreve upgrade como puramente cosmético.
- Rankings filtram ou identificam contexto incompatível.
- Testes confirmam que política competitiva não é alterada implicitamente por
  mudança em settings ou nave selecionada.
