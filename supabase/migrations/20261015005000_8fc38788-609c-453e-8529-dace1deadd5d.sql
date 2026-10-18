create table public.manuscripts (
  id uuid primary key default gen_random_uuid(),
  ref_no bigserial not null,
  submitter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  kind text not null,
  authors text not null,
  program text not null,
  completed_on date not null,
  keywords text not null default '',
  abstract text not null,
  file_path text not null,
  file_name text not null,
  status text not null default 'pending',
  reviewer_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.manuscripts to authenticated;
grant all on public.manuscripts to service_role;
grant usage on sequence public.manuscripts_ref_no_seq to authenticated;
alter table public.manuscripts enable row level security;

create or replace function public.is_approved_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id,_role) and exists(select 1 from public.profiles where id=_user_id and status='approved')
$$;

create or replace function public.validate_manuscript() returns trigger language plpgsql set search_path = public as $$
begin
  if new.kind not in ('Capstone','Research') then raise exception 'Invalid type'; end if;
  if new.status not in ('pending','approved','rejected') then raise exception 'Invalid status'; end if;
  if TG_OP='UPDATE' then new.updated_at=now(); new.submitter_id=old.submitter_id; new.file_path=old.file_path; end if;
  return new;
end $$;
create trigger manuscript_validation before insert or update on public.manuscripts for each row execute function public.validate_manuscript();

create policy manuscripts_own_read on public.manuscripts for select to authenticated using (submitter_id = auth.uid() or public.is_approved_role(auth.uid(),'faculty'));
create policy manuscripts_own_insert on public.manuscripts for insert to authenticated with check (submitter_id = auth.uid() and status='pending' and reviewer_notes='' and public.is_approved_role(auth.uid(),'graduated_student'));
create policy manuscripts_faculty_update on public.manuscripts for update to authenticated using (public.is_approved_role(auth.uid(),'faculty')) with check (public.is_approved_role(auth.uid(),'faculty'));
create policy manuscripts_faculty_delete on public.manuscripts for delete to authenticated using (public.is_approved_role(auth.uid(),'faculty'));

create policy manuscript_files_upload on storage.objects for insert to authenticated with check (bucket_id='manuscripts' and (storage.foldername(name))[1]=auth.uid()::text and public.is_approved_role(auth.uid(),'graduated_student'));
create policy manuscript_files_read on storage.objects for select to authenticated using (bucket_id='manuscripts' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_approved_role(auth.uid(),'faculty')));
create policy manuscript_files_delete on storage.objects for delete to authenticated using (bucket_id='manuscripts' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_approved_role(auth.uid(),'faculty')));