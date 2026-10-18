import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

// Public registration: always creates a pending, non-admin account. Admin approval gates sign-in.
export const registerAccount = createServerFn({ method: 'POST' })
  .inputValidator(z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(8).max(72),
    role: z.enum(['Student', 'Graduated Student', 'Faculty']),
    studentNo: z.string().trim().max(40).optional(),
  }))
  .handler(async ({ data }) => {
    if (data.role !== 'Faculty' && !data.studentNo) return { ok: false, message: 'Student No. is required.' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email, password: data.password, email_confirm: true,
      user_metadata: { full_name: data.fullName, role: data.role, student_no: data.role === 'Faculty' ? null : data.studentNo },
    });
    if (error) return { ok: false, message: /already|registered|exists/i.test(error.message) ? 'An account with this email already exists.' : 'Unable to create the account. Please try again.' };
    return { ok: true, message: '' };
  });
