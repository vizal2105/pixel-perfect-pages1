import { supabase } from '@/integrations/supabase/client';

export type Manuscript = {
  id: string; ref_no: number; title: string; kind: string; authors: string; program: string;
  completed_on: string; keywords: string; abstract: string; file_path: string; file_name: string;
  status: 'pending' | 'approved' | 'rejected'; reviewer_notes: string; created_at: string;
};

// Data access goes through the browser client; row-level security limits students to their own rows and lets approved Faculty review all.
const table = () => (supabase as any).from('manuscripts');

export async function listManuscripts(): Promise<Manuscript[]> {
  const { data, error } = await table().select('*').order('created_at', { ascending: false });
  if (error) throw new Error('Unable to load manuscripts.');
  return data ?? [];
}

export async function listApprovedManuscripts(): Promise<Manuscript[]> {
  const { data, error } = await table().select('*').eq('status', 'approved').order('created_at', { ascending: false });
  if (error) throw new Error('Unable to load the archive.');
  return data ?? [];
}

export async function submitManuscript(form: FormData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Please sign in again.');
  const file = form.get('file') as File | null;
  if (!file || !file.size) throw new Error('Choose a manuscript file.');
  if (file.size > 50 * 1024 * 1024) throw new Error('The file must be 50 MB or smaller.');
  const text = (k: string, max = 300) => String(form.get(k) ?? '').trim().slice(0, max);
  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
  const up = await supabase.storage.from('manuscripts').upload(path, file);
  if (up.error) throw new Error('The file could not be uploaded.');
  const { error } = await table().insert({
    submitter_id: user.id, title: text('title'), kind: text('manuscriptType') === 'Research' ? 'Research' : 'Capstone',
    authors: text('authors'), program: text('program') || 'BS Computer Science', completed_on: text('completed'),
    keywords: text('keywords'), abstract: text('abstract', 5000), file_path: path, file_name: file.name,
  });
  if (error) { await supabase.storage.from('manuscripts').remove([path]); throw new Error('The submission could not be saved.'); }
}

export async function reviewManuscript(id: string, status: Manuscript['status'], notes?: string) {
  const patch: Record<string, string> = { status };
  if (notes !== undefined) patch['reviewer_notes'] = notes.slice(0, 1000);
  const { error } = await table().update(patch).eq('id', id);
  if (error) throw new Error('Unable to update the manuscript.');
}

export async function deleteManuscript(m: Manuscript) {
  const { error } = await table().delete().eq('id', m.id);
  if (error) throw new Error('Unable to delete the manuscript.');
  await supabase.storage.from('manuscripts').remove([m.file_path]);
}

export async function fileUrl(m: Manuscript, download: boolean) {
  const { data, error } = await supabase.storage.from('manuscripts').createSignedUrl(m.file_path, 300, download ? { download: m.file_name } : undefined);
  if (error || !data) throw new Error('Unable to open the file.');
  return data.signedUrl;
}

export const refLabel = (m: Manuscript) => `#sub-${1199 + m.ref_no}`;
export const formatDate = (d: string) => new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
