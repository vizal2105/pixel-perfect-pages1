import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { Archive, Download, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortalLogo, PortalTheme, ThemeToggle, pageHead } from '@/components/portal';
import { StatusBadge } from '@/components/manuscript-status';
import { supabase } from '@/integrations/supabase/client';
import { fileUrl, formatDate, listApprovedManuscripts, refLabel, type Manuscript } from '@/lib/manuscripts';

export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => pageHead('Search the Archive | DCRAP', 'Browse approved capstone projects and research papers.'),
  component: StudentDashboard,
});

function StudentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('latest');
  const [error, setError] = useState('');
  const profile = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('No session');
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('full_name,status').eq('id', auth.user.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', auth.user.id),
      ]);
      return { name: p?.full_name || 'Student', status: p?.status, role: roles?.[0]?.role };
    },
  });
  const allowed = profile.data?.role === 'student' && profile.data.status === 'approved';
  const manuscripts = useQuery({ queryKey: ['archive'], queryFn: listApprovedManuscripts, enabled: allowed });
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (manuscripts.data ?? []).filter(m => !q || [m.title, m.authors, m.abstract, m.program, m.keywords].some(f => f.toLowerCase().includes(q)));
    const sorted = [...matches];
    if (sort === 'oldest') sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return sorted;
  }, [manuscripts.data, query, sort]);
  async function signOut() {
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut(); await navigate({ to: '/sign-in', replace: true });
  }
  const submit = (e: FormEvent) => { e.preventDefault(); setQuery(term); };
  async function open(m: Manuscript, download: boolean) {
    setError('');
    const w = window.open('', '_blank');
    try { const url = await fileUrl(m, download); if (w) w.location.href = url; else window.location.href = url; } catch (e) { w?.close(); setError((e as Error).message); }
  }
  return <PortalTheme><div className="admin-page student-page">
    <header className="admin-header"><div className="admin-header-inner"><div className="admin-brand"><span className="student-logo"><PortalLogo /><small>RESEARCH ARCHIVE</small></span><span className="admin-separator">|</span><span>Search Archive</span></div>
      <nav aria-label="Student navigation"><ThemeToggle />{profile.data && <span className="admin-identity">{profile.data.name}</span>}<Button variant="ghost" size="nav" onClick={signOut}>Sign out</Button></nav></div></header>
    <main className="student-content">
      {profile.isPending ? <p className="directory-message">Loading…</p> : !allowed ? <p className="directory-message" role="alert">This dashboard is available to approved student accounts only.</p> : <>
        <h1 className="student-title"><Search />Search the archive</h1>
        <p className="student-subtitle">Browse approved capstone projects and research papers.</p>
        <form className="student-search" onSubmit={submit}>
          <div className="student-search-row"><label className="student-input"><Search /><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search by title, author, abstract, or program..." aria-label="Search the archive" /></label><Button type="submit" variant="auth" className="student-search-btn"><Search />Search</Button></div>
          <div className="student-search-foot"><select className="student-select" aria-label="Sort order" value={sort} onChange={e => setSort(e.target.value)}><option value="latest">Latest</option><option value="oldest">Oldest</option><option value="title">Title A–Z</option></select><span className="archived-pill"><Archive />Archived Manuscripts<span className="count">0</span></span></div>
        </form>
        {error && <p className="form-notice" role="alert">{error}</p>}
        <section aria-label="Search results" className="archive-results">
          {manuscripts.isPending ? <p className="directory-message">Loading the archive…</p>
            : results.length === 0 ? <p className="directory-message">{query ? 'No approved manuscripts match your search.' : 'No manuscripts have been approved yet.'}</p>
            : results.map(m => <article key={m.id} className="ms-card" data-status={m.status}>
              <div className="ms-meta"><code>{refLabel(m)}</code><span className="ms-kind">{m.kind}</span><StatusBadge status={m.status} /><span className="ms-muted">· Completed: {formatDate(m.completed_on)}</span></div>
              <h2 className="ms-title">{m.title}</h2>
              <p className="ms-line">Authors: {m.authors} · Program: {m.program}</p>
              <details className="ms-abstract"><summary>Abstract{m.keywords && ` · Keywords: ${m.keywords}`}</summary><p>{m.abstract}</p></details>
              <div className="ms-actions"><div><Button variant="outline" size="sm" onClick={() => open(m, false)}><Eye />View</Button><Button variant="outline" size="sm" onClick={() => open(m, true)}><Download />Download</Button></div></div>
            </article>)}
        </section>
      </>}
    </main>
  </div></PortalTheme>;
}
