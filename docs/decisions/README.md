# Decisões arquiteturais (ADRs)

Este diretório registra decisões duráveis que afetam mais de uma feature ou que
limitam escolhas futuras. Comentários no código explicam implementação; ADRs
explicam por que um contrato existe.

## Status

- **Proposta:** recomendação ainda não adotada; não autoriza implementação que
  dependa dela.
- **Aceita:** contrato vigente para trabalho novo.
- **Substituída:** preservada como histórico e ligada à decisão sucessora.
- **Rejeitada:** alternativa avaliada e não adotada.

## Índice

| ADR | Status | Decisão |
|-----|--------|---------|
| [0001](0001-daily-determinism.md) | Aceita | Determinismo lógico e versionado do Daily |
| [0002](0002-serverless-trust-boundary.md) | Aceita | Limites de confiança sem backend |
| [0003](0003-versioned-share-replay-protocol.md) | Aceita | Envelope versionado para share/ghost |
| [0004](0004-progression-and-competition.md) | Aceita | Upgrades mecânicos e comparabilidade |

## Template

```markdown
# ADR NNNN — Título

- Status: Proposta | Aceita | Substituída | Rejeitada
- Data: YYYY-MM-DD
- Escopo: módulos/fases afetados

## Contexto
## Decisão
## Consequências
## Alternativas consideradas
## Verificação
```

Alterar uma decisão aceita exige novo ADR que a substitua; não editar a
conclusão antiga como se sempre tivesse sido diferente.
