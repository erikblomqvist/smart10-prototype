-- Monitoring events for admin AI card imports.
create table public.ai_import_events (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now(),
	request_id text not null,
	user_id uuid references public.users (id) on delete set null,
	deck_id uuid references public.decks (id) on delete set null,
	file_name text,
	model text not null,
	status text not null check (status in ('success', 'error')),
	duration_ms integer,
	gemini_duration_ms integer,
	crop_duration_ms integer,
	image_mime text,
	image_bytes integer,
	question_type text,
	question_number integer,
	confidence jsonb,
	warnings jsonb not null default '[]',
	option_image_warnings jsonb not null default '[]',
	error_message text
);

create index idx_ai_import_events_created_at on public.ai_import_events (created_at desc);
create index idx_ai_import_events_request_id on public.ai_import_events (request_id);
create index idx_ai_import_events_status on public.ai_import_events (status);
create index idx_ai_import_events_user_id on public.ai_import_events (user_id);
create index idx_ai_import_events_deck_id on public.ai_import_events (deck_id);

alter table public.ai_import_events enable row level security;

create policy "ai_import_events_select_admin"
	on public.ai_import_events for select
	using (
		exists (
			select 1
			from public.users u
			where u.id = auth.uid()
				and u.is_admin = true
		)
	);
