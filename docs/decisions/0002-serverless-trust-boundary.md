# ADR 0002 — Fronteira de confiança da arquitetura serverless

- Status: **Aceita**
- Data: 2026-07-21
- Escopo: F5, F6, F10, F11; importação, ranking, doação e eventos

## Contexto

O SpaceRun não possui servidor, conta ou autoridade central. Dados locais e
payloads em links podem ser editados livremente. Alguns itens antigos do roadmap
usavam termos como leaderboard global, meta global, temporada competitiva e
premium por doação, que não podem ser implementados de forma confiável apenas no
cliente.

## Decisão

Enquanto a premissa serverless estiver vigente:

1. Dados locais são convenientes, não autoritativos.
2. Dados recebidos por URL, arquivo, clipboard ou Web Share são não confiáveis.
3. Base64, hash e checksum detectam formato/corrupção; não provam identidade,
   autoria, pagamento ou legitimidade de score.
4. Scores compartilhados aparecem como **Importados / não verificados**.
5. “Amigo” é um rótulo local escolhido pelo jogador, não identidade autenticada.
6. Não usar “global”, “oficial”, “verificado”, “Top mundial” ou “anti-cheat” para
   agregados P2P.
7. Eventos podem usar calendário local e catálogo estático. Metas são pessoais
   ou de grupo compartilhado, sem total global confiável.
8. Doações externas não desbloqueiam entitlement automático. Cosméticos pagos
   exigem integração autorizada ou código resgatável assumidamente copiável.
9. Toda importação passa pelo protocolo versionado, limites e DOM seguro.

## Mudança futura de premissa

Backend não é proibido para sempre, mas não pode surgir incidentalmente dentro de
uma feature. Exige novo ADR cobrindo:

- operação/custo e disponibilidade;
- conta/autenticação e recuperação;
- privacidade, consentimento, retenção e exclusão;
- abuso, moderação e anti-cheat;
- migração offline e comportamento sem rede;
- termos aplicáveis a pagamentos e menores;
- fallback se o serviço for encerrado.

Até esse ADR existir, tarefas que exigem autoridade remota ficam bloqueadas.

## Consequências

- F5 pode oferecer ghosts e desafios divertidos, mas não competição oficial.
- F10 troca metas/temporadas globais por versões locais ou compartilhadas.
- F11 não associa passe premium a Ko-Fi/BMC automaticamente.
- UI e copy precisam revelar origem e limitações sem linguagem enganosa.
- Segurança continua necessária: não haver servidor não elimina XSS ou payload
  malicioso.

## Alternativas consideradas

- **Confiar em hash no cliente:** rejeitada; o emissor controla dados e hash.
- **Ofuscar formato:** rejeitada; ofuscação não cria autoridade.
- **Backend gratuito improvisado:** rejeitada; muda arquitetura e obrigações
  operacionais sem decisão de produto.
- **Remover compartilhamento:** rejeitada; P2P não autoritativo ainda tem valor.

## Verificação

- Toda tela de importação mostra origem não verificada.
- Não há copy de ranking/meta global no modo serverless.
- Testes alteram score/assinatura e confirmam rejeição estrutural ou marcação de
  não verificado, nunca confiança implícita.
