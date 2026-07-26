-- SpaceRun / Supabase bootstrap (idempotent)
-- Execute no SQL Editor como owner. Em Settings > API, adicione `spacerun`
-- em "Exposed schemas" antes de publicar o cliente.
-- Também habilite Authentication > Providers > Anonymous sign-ins.

create schema if not exists spacerun;
grant usage on schema spacerun to anon, authenticated;

create table if not exists spacerun.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 16),
  xp bigint not null default 0 check (xp >= 0 and xp <= 9000000000000000),
  level integer not null default 1 check (level between 1 and 100000000),
  updated_at timestamptz not null default now()
);

create table if not exists spacerun.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  distance integer not null check (distance between 0 and 1000000000),
  duration numeric(12,1) not null check (duration between 0 and 1000000000),
  mode text not null check (mode in ('classic', 'daily', 'zen', 'sprint', 'hardcore', 'marathon', 'timeattack', 'bossrush')),
  ruleset_id text not null check (char_length(ruleset_id) between 1 and 32),
  ship_id text not null check (char_length(ship_id) between 1 and 32),
  created_at timestamptz not null default now()
);
create index if not exists scores_global_order on spacerun.scores (distance desc, duration asc, created_at asc);
create index if not exists scores_mode_ruleset_order on spacerun.scores (mode, ruleset_id, distance desc, duration asc, created_at asc);

-- Bancos já provisionados pela v0.6.0 possuem a restrição antiga (classic /
-- daily). A alteração é idempotente e preserva os scores existentes.
alter table spacerun.scores drop constraint if exists scores_mode_check;
alter table spacerun.scores add constraint scores_mode_check check (mode in ('classic', 'daily', 'zen', 'sprint', 'hardcore', 'marathon', 'timeattack', 'bossrush'));

alter table spacerun.profiles enable row level security;
alter table spacerun.scores enable row level security;

drop policy if exists "SpaceRun profile owner reads" on spacerun.profiles;
create policy "SpaceRun profile owner reads" on spacerun.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "SpaceRun profile owner writes" on spacerun.profiles;
create policy "SpaceRun profile owner writes" on spacerun.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "SpaceRun profile owner updates" on spacerun.profiles;
create policy "SpaceRun profile owner updates" on spacerun.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- O cliente só chama a RPC; não recebe acesso direto à tabela de scores.
drop policy if exists "SpaceRun no direct score reads" on spacerun.scores;
create policy "SpaceRun no direct score reads" on spacerun.scores for select to authenticated using (false);

create or replace function spacerun.submit_score(p_distance integer, p_duration numeric, p_mode text, p_ruleset text, p_ship text)
returns void language plpgsql security definer set search_path = spacerun, public as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  insert into spacerun.scores (user_id, distance, duration, mode, ruleset_id, ship_id)
  values (auth.uid(), p_distance, p_duration, p_mode, p_ruleset, p_ship);
end;
$$;
grant execute on function spacerun.submit_score(integer, numeric, text, text, text) to authenticated;

-- A view é a única leitura pública de scores: ela expõe só campos de placar.
-- Não use `security_invoker` aqui, pois a tabela deliberadamente não concede
-- SELECT direto a usuários autenticados.
create or replace view spacerun.global_leaderboard as
select coalesce(nullif(p.display_name, ''), 'Pilot') as display_name, s.distance, s.duration, s.mode, s.ruleset_id, s.ship_id
from spacerun.scores s left join spacerun.profiles p on p.user_id = s.user_id
order by s.mode, s.ruleset_id, s.distance desc, s.duration asc, s.created_at asc;
grant select on spacerun.global_leaderboard to authenticated;

-- IMPORTANTE: este ranking é global mas não verificado. Sem replay assinado e
-- validação no servidor, qualquer cliente alterado pode enviar uma pontuação falsa.
