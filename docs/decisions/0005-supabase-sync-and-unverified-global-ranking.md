# ADR 0005 — Sincronização Supabase e ranking global não verificado

**Status:** accepted · 2026-07-25

## Contexto

A F4B precisa de perfil e retenção locais, e o produto agora autoriza um banco
Supabase compartilhado entre jogos. O jogo continua uma PWA vanilla e deve abrir
offline; uma falha de rede não pode impedir uma run nem apagar progresso local.

## Decisão

- Usar o schema PostgreSQL isolado `spacerun`, RLS e usuários anônimos do
  Supabase Auth. A chave publishable pode estar no cliente; nunca usar chave
  secreta/service-role no app.
- `Storage` continua ser a fonte de verdade durante a run. Perfil/XP e scores
  são sincronizados em segundo plano pelo módulo `cloud.js`.
- O ranking remoto é **global, mas não verificado**. Nenhum score do navegador
  é evidência de identidade, anti-cheat ou comparabilidade competitiva.
- O SQL idempotente em `docs/supabase/spacerun.sql` deve ser executado pelo
  operador e requer expor o schema `spacerun` na Data API e habilitar anonymous
  sign-ins.

## Consequências

Limpar os dados do navegador perde a conta anônima; uma conta recuperável fica
fora desta fatia. Um ranking verificado exigirá replay validado no servidor e
um ADR novo. O app permanece utilizável sem Supabase configurado ou sem rede.
