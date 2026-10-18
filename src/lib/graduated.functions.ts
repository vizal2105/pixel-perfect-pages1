import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getGraduatedAccount = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile, error }, { data: allowed, error: roleError }] = await Promise.all([
      context.supabase.from('profiles').select('status').eq('id', context.userId).maybeSingle(),
      context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'graduated_student' }),
    ]);
    if (error || roleError || !allowed || profile?.status !== 'approved') {
      throw new Error('An approved Graduated Student account is required.');
    }
    return { approved: true };
  });