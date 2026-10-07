-- =============================================================
-- GAMETOGENESIS CHALLENGE - Supabase schema
-- Run this in the Supabase SQL Editor (or any Postgres).
-- RLS is intentionally left disabled so the anon key can be used
-- directly by this simple classroom game.
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- games : one row per classroom round
-- -------------------------------------------------------------
create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  status      text not null default 'waiting'
              check (status in ('waiting', 'playing', 'finished')),
  max_players integer not null default 27,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);

-- -------------------------------------------------------------
-- players : one row per participant per game
-- -------------------------------------------------------------
create table if not exists public.players (
  id                  uuid primary key default gen_random_uuid(),
  game_id             uuid not null references public.games(id) on delete cascade,
  name                text not null check (char_length(name) between 1 and 24),
  status              text not null default 'waiting'
                      check (status in ('waiting', 'playing', 'finished')),
  total_score         integer not null default 0,
  correct_count       integer not null default 0,
  incorrect_count     integer not null default 0,
  unanswered_count    integer not null default 0,
  total_response_time_ms integer not null default 0,
  final_position      integer,
  created_at          timestamptz not null default now(),
  constraint players_game_name_unique unique (game_id, name)
);

-- case-insensitive uniqueness (Alice vs alice) enforced at the DB too
create unique index if not exists players_game_name_ci_idx
  on public.players (game_id, lower(name));

create index if not exists players_game_idx on public.players (game_id);

-- -------------------------------------------------------------
-- answers : one row per answered question per player
-- -------------------------------------------------------------
create table if not exists public.answers (
  id             uuid primary key default gen_random_uuid(),
  game_id        uuid not null references public.games(id) on delete cascade,
  player_id      uuid not null references public.players(id) on delete cascade,
  player_name    text not null,
  question_id    integer not null,
  question_text  text not null,
  selected_index integer,
  correct        boolean not null default false,
  response_time_ms integer not null default 0,
  points         integer not null default 0,
  answered_at    timestamptz not null default now(),
  constraint answers_player_question_unique unique (player_id, question_id)
);

create index if not exists answers_player_idx on public.answers (player_id);
create index if not exists answers_game_idx on public.answers (game_id);

-- -------------------------------------------------------------
-- Realtime publication (MODE B)
-- Run these so browsers receive live updates for lobby counts,
-- game start and the final leaderboard.
-- -------------------------------------------------------------
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.answers;

-- -------------------------------------------------------------
-- Permissions for the anon key (used directly by this app).
-- Kept explicit so it works even on brand-new Supabase projects.
-- -------------------------------------------------------------
alter table public.games disable row level security;
alter table public.players disable row level security;
alter table public.answers disable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.games to anon;
grant select, insert, update on public.players to anon;
grant select, insert, update on public.answers to anon;