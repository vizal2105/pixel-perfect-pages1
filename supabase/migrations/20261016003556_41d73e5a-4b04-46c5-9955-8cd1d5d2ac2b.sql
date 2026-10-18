create policy manuscripts_student_read_approved on public.manuscripts for select to authenticated using (status = 'approved' and public.is_approved_role(auth.uid(),'student'));

create policy manuscript_files_student_read_approved on storage.objects for select to authenticated using (
  bucket_id = 'manuscripts'
  and public.is_approved_role(auth.uid(),'student')
  and exists (
    select 1 from public.manuscripts m
    where m.file_path = storage.objects.name and m.status = 'approved'
  )
);