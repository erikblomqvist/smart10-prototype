-- Public bucket for low-size per-option question images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'question-option-images',
	'question-option-images',
	true,
	524288,
	array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

create policy "question_option_images_select"
	on storage.objects for select
	using (bucket_id = 'question-option-images');

create policy "question_option_images_insert_admin"
	on storage.objects for insert
	with check (
		bucket_id = 'question-option-images'
		and exists (
			select 1
			from public.users u
			where u.id = auth.uid()
				and u.is_admin = true
		)
	);

create policy "question_option_images_update_admin"
	on storage.objects for update
	using (
		bucket_id = 'question-option-images'
		and exists (
			select 1
			from public.users u
			where u.id = auth.uid()
				and u.is_admin = true
		)
	)
	with check (bucket_id = 'question-option-images');

create policy "question_option_images_delete_admin"
	on storage.objects for delete
	using (
		bucket_id = 'question-option-images'
		and exists (
			select 1
			from public.users u
			where u.id = auth.uid()
				and u.is_admin = true
		)
	);
