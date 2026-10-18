import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { queryOptions, useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, Clock, RotateCcw, SquareCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortalLogo, PortalTheme, ThemeToggle, pageHead } from '@/components/portal';
import { StatusBadge } from '@/components/manuscript-status';
import { ManuscriptFileButtons } from '@/components/manuscript-file';
import { supabase } from '@/integrations/supabase/client';
import { getFacultyAccount } from '@/lib/faculty.functions';
import { deleteManuscript, formatDate, listManuscripts, refLabel, reviewManuscript } from '@/lib/manuscripts';

const accountOptions = queryOptions({ queryKey: ['faculty-account'], queryFn: () => getFacultyAccount(), retry: false, staleTime: 0 });

export const Route = createFileRoute('/_authenticated/faculty-dashboard')({
  head: () => pageHead('Review Queue | DCRAP', 'Faculty review graduating student manuscripts: inspect, approve, or request revisions.'),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountOptions),
  component: FacultyDashboard,
  errorComponent: FacultyAccessError,
});

function FacultyAccessError() {
  return <PortalTheme><main className="admin-page"><p className="directory-message" role="alert">An approved Faculty account is required to open this dashboard.</p><Button asChild variant="link"><Link to="/sign-in">Return to sign in</Link></Button></main></PortalTheme>;
}

const tabs = [
  { key: 'pending', label: 'Pending', icon: Clock, empty: 'No manuscripts are waiting for review.' },
  { key: 'approved', label: 'Approved', icon: Check, empty: 'No approved manuscripts yet.' },
  { key: 'rejected', label: 'Rejected', icon: X, empty: 'No rejected manuscripts.' },
] as const;

function FacultyDashboard() {
  const { data } = useSuspenseQuery(accountOptions);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('pending');
  const [error, setError] = useState('');
  const { data: all = [] } = useQuery({ queryKey: ['manuscripts'], queryFn: listManuscripts });
  async function signOut() {
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut(); await navigate({ to: '/sign-in', replace: true });
  }
  async function act(fn: () => Promise<unknown>) {
    setError('');
    try { await fn(); await queryClient.invalidateQueries({ queryKey: ['manuscripts'] }); } catch (e) { setError((e as Error).message); }
  }
  const current = tabs.find(t => t.key === tab)!;
  const items = all.filter(m => m.status === tab);
  return <PortalTheme><div className="admin-page student-page">
    <header className="admin-header"><div className="admin-header-inner"><div className="admin-brand"><span className="student-logo"><PortalLogo /><small>RESEARCH ARCHIVE</small></span><span className="admin-separator">|</span><span>Review Queue</span></div>
      <nav aria-label="Faculty navigation"><ThemeToggle /><span className="admin-identity">{data.name}</span><Button variant="ghost" size="nav" onClick={signOut}>Sign out</Button></nav></div></header>
    <main className="review-content">
      <h1 className="student-title"><SquareCheck />Review queue</h1>
      <p className="student-subtitle">Manage graduating student manuscripts. Inspect, approve, request revisions, or delete entries.</p>
      <div className="review-tabs" role="tablist">{tabs.map(t => <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} data-kind={t.key} className="review-tab" onClick={() => setTab(t.key)}><t.icon />{t.label}<span className="count">{all.filter(m => m.status === t.key).length}</span></button>)}</div>
      {error && <p className="form-notice" role="alert">{error}</p>}
      {items.length === 0 ? <div className="review-empty">{current.empty}</div> : items.map(m => <article key={m.id} className="ms-card" data-status={m.status}>
        <div className="ms-meta"><code>{refLabel(m)}</code><span className="ms-kind">{m.kind}</span><StatusBadge status={m.status} /><span className="ms-muted">· Completed: {formatDate(m.completed_on)}</span></div>
        <h2 className="ms-title">{m.title}</h2>
        <p className="ms-line">Authors: {m.authors} · Program: {m.program} · Submitted: {formatDate(m.created_at.slice(0, 10))}</p>
        <details className="ms-abstract"><summary>Abstract{m.keywords && ` · Keywords: ${m.keywords}`}</summary><p>{m.abstract}</p></details>
        {m.reviewer_notes && <div className="ms-notes"><strong>Reviewer Notes:</strong> {m.reviewer_notes}</div>}
        <div className="ms-actions">
          <div><ManuscriptFileButtons manuscript={m} onError={setError} /></div>
          <div>
            {m.status === 'pending' && <><Button variant="auth" size="sm" onClick={() => act(() => reviewManuscript(m.id, 'approved'))}><Check />Approve</Button><Button variant="outline" size="sm" className="ms-reject" onClick={() => { const n = window.prompt('Reviewer notes (reason for rejection / revisions required):'); if (n !== null) act(() => reviewManuscript(m.id, 'rejected', n.trim())); }}><X />Reject</Button></>}
            {m.status === 'approved' && <Button variant="outline" size="sm" onClick={() => act(() => reviewManuscript(m.id, 'pending'))}><RotateCcw />Re-evaluate</Button>}
            {m.status === 'rejected' && <Button variant="auth" size="sm" onClick={() => act(() => reviewManuscript(m.id, 'approved'))}><Check />Reconsider &amp; Approve</Button>}
            <Button variant="outline" size="icon" aria-label="Delete manuscript" title="Delete" onClick={() => { if (window.confirm('Delete this manuscript permanently?')) act(() => deleteManuscript(m)); }}><Trash2 /></Button>
          </div>
        </div>
      </article>)}
    </main>
  </div></PortalTheme>;
}
