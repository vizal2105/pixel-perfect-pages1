import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';

export const getAdminDirectory = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (roleError || !allowed) throw new Error('Administrator access required.');
    const profiles = [];
    const roles: Pick<Database['public']['Tables']['user_roles']['Row'], 'user_id' | 'role'>[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await context.supabase.from('profiles').select('id,full_name,username,email,student_no,department,status,created_at').order('created_at').range(offset, offset + 999);
      if (error) throw new Error('Unable to load the user directory.');
      profiles.push(...data);
      if (data.length < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await context.supabase.from('user_roles').select('user_id,role').order('id').range(offset, offset + 999);
      if (error) throw new Error('Unable to load account roles.');
      roles.push(...data);
      if (data.length < 1000) break;
    }
    return { userId: context.userId, profiles: profiles.map(profile => ({ ...profile, role: roles.find(role => role.user_id === profile.id)?.role ?? 'student' })) };
  });

export const manageAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), action: z.enum(['approve', 'delete']) }))
  .handler(async ({ data, context }) => {
    const { data: allowed, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (error || !allowed) throw new Error('Administrator access required.');
    const { data: targetIsAdmin, error: targetError } = await context.supabase.rpc('has_role', { _user_id: data.id, _role: 'admin' });
    if (targetError || targetIsAdmin || data.id === context.userId) throw new Error('Administrator accounts cannot be changed here.');
    if (data.action === 'approve') {
      const { error: updateError } = await context.supabase.from('profiles').update({ status: 'approved' }).eq('id', data.id);
      if (updateError) throw new Error('Unable to approve this account.');
    } else {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.id);
      if (deleteError) throw new Error('Unable to delete this account.');
    }
    return { ok: true };
  });