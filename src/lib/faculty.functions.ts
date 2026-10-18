import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getFacultyAccount = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile, error }, { data: allowed, error: roleError }] = await Promise.all([
      context.supabase.from('profiles').select('full_name,status').eq('id', context.userId).maybeSingle(),
      context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'faculty' }),
    ]);
    if (error || roleError || !allowed || profile?.status !== 'approved') {
      throw new Error('An approved Faculty account is required.');
    }
    return { name: profile.full_name || 'Faculty' };
  });
