-- smart10-v2 initial schema

-- Users (mirrors auth.users — admin access only)
create table public.users (
	id uuid primary key references auth.users (id) on delete cascade,
	email text unique not null,
	name text not null,
	is_admin boolean not null default false,
	created_at timestamptz not null default now()
);

-- Auto-create a user row when someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
	insert into public.users (id, email, name)
	values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();

-- Decks
create table public.decks (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	description text,
	image_url text,
	icon text, -- Lucide icon name; fallback to 'Layers' in UI when null
	created_at timestamptz not null default now()
);

-- Questions
create table public.questions (
	id uuid primary key default gen_random_uuid(),
	deck_id uuid not null references public.decks (id) on delete cascade,
	type text not null check (type in ('standard', 'boolean', 'rank', 'chooseBetween', 'colors', 'numbers', 'centuryDecade')),
	question_text text not null,
	question_number integer,
	-- Array of strings: what's displayed on each blob
	options_json jsonb not null default '[]',
	-- One correct answer per blob. Type-dependent:
	--   standard:       string
	--   boolean:        true | false
	--   rank:           integer (1–10)
	--   chooseBetween:  string (the correct option value)
	--   colors:         { primary: {h,s,l}, secondary?: {h,s,l} }
	--   numbers:        number
	--   centuryDecade:  string
	correct_answers_json jsonb not null default '[]',
	-- Optional media per blob, shown on round review screen (standard type primarily)
	-- [{ url?: string, spotify_url?: string, youtube_url?: string }, ...]
	answer_media_json jsonb not null default '[]',
	created_at timestamptz not null default now()
);

create index idx_questions_deck_id on public.questions (deck_id);
create index idx_questions_type on public.questions (type);

-- Games (anonymous — no host/user link)
create table public.games (
	id uuid primary key default gen_random_uuid(),
	code text unique not null,
	status text not null default 'setup' check (status in ('setup', 'playing', 'round_review', 'finished')),
	selected_decks jsonb not null default '[]', -- array of deck UUIDs
	used_question_ids jsonb not null default '[]', -- avoid repeating questions
	current_round integer not null default 0,
	win_score integer not null default 50, -- first to this total wins
	-- Populated once game starts; FKs added below after dependent tables exist
	current_player_id uuid,
	current_round_id uuid,
	created_at timestamptz not null default now()
);

create index idx_games_code on public.games (code);

-- Game players
create table public.game_players (
	id uuid primary key default gen_random_uuid(),
	game_id uuid not null references public.games (id) on delete cascade,
	name text not null,
	icon text not null, -- Lucide icon name
	-- 0–7 clockwise from top of screen (45° increments)
	seat_position integer not null check (seat_position >= 0 and seat_position <= 7),
	total_score integer not null default 0,
	round_score integer not null default 0,
	-- Reset to 'active' at the start of each round
	status text not null default 'active' check (status in ('active', 'passed', 'out')),
	turn_order integer not null, -- determines clockwise play order
	created_at timestamptz not null default now()
);

create index idx_game_players_game_id on public.game_players (game_id);

-- Deferred FKs from games back to game_players
alter table public.games
	add constraint fk_games_current_player
	foreign key (current_player_id) references public.game_players (id) deferrable initially deferred;

-- Game rounds (one per question played)
create table public.game_rounds (
	id uuid primary key default gen_random_uuid(),
	game_id uuid not null references public.games (id) on delete cascade,
	question_id uuid references public.questions (id),
	round_number integer not null,
	starting_player_id uuid references public.game_players (id),
	-- Last player to make a move — used to set rotation on review screen
	last_player_id uuid references public.game_players (id),
	-- Indices of blobs already answered this round
	answered_blobs jsonb not null default '[]',
	started_at timestamptz not null default now(),
	ended_at timestamptz
);

create index idx_game_rounds_game_id on public.game_rounds (game_id);

-- Deferred FK from games back to game_rounds
alter table public.games
	add constraint fk_games_current_round
	foreign key (current_round_id) references public.game_rounds (id) deferrable initially deferred;

-- Player answers (one row per blob reveal)
create table public.player_answers (
	id uuid primary key default gen_random_uuid(),
	round_id uuid not null references public.game_rounds (id) on delete cascade,
	player_id uuid not null references public.game_players (id) on delete cascade,
	blob_index integer not null,
	is_correct boolean not null,
	answered_at timestamptz not null default now()
);

create index idx_player_answers_round_id on public.player_answers (round_id);
create index idx_player_answers_player_id on public.player_answers (player_id);

-- -------------------------
-- Row Level Security
-- -------------------------

alter table public.users enable row level security;
alter table public.decks enable row level security;
alter table public.questions enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_rounds enable row level security;
alter table public.player_answers enable row level security;

-- users: anyone can read; only admins can write
create policy "users_select" on public.users for select using (true);
create policy "users_insert" on public.users for insert with check (auth.uid() = id);
create policy "users_update" on public.users for update using (
	exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);

-- decks: public read; admin write
create policy "decks_select" on public.decks for select using (true);
create policy "decks_insert" on public.decks for insert with check (
	exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);
create policy "decks_update" on public.decks for update using (
	exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);
create policy "decks_delete" on public.decks for delete using (
	exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);

-- questions: public read; admin write
create policy "questions_select" on public.questions for select using (true);
create policy "questions_insert" on public.questions for insert with check (
	exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);
create policy "questions_update" on public.questions for update using (
	exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);
create policy "questions_delete" on public.questions for delete using (
	exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
);

-- games, game_players, game_rounds, player_answers: fully public (no player auth)
create policy "games_select" on public.games for select using (true);
create policy "games_insert" on public.games for insert with check (true);
create policy "games_update" on public.games for update using (true);

create policy "game_players_select" on public.game_players for select using (true);
create policy "game_players_insert" on public.game_players for insert with check (true);
create policy "game_players_update" on public.game_players for update using (true);

create policy "game_rounds_select" on public.game_rounds for select using (true);
create policy "game_rounds_insert" on public.game_rounds for insert with check (true);
create policy "game_rounds_update" on public.game_rounds for update using (true);

create policy "player_answers_select" on public.player_answers for select using (true);
create policy "player_answers_insert" on public.player_answers for insert with check (true);
