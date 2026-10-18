revoke execute on function public.is_approved_role(uuid, public.app_role) from public, anon;
grant execute on function public.is_approved_role(uuid, public.app_role) to authenticated;