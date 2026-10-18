import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { ArrowRight, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortalLogo, PortalTheme, ThemeToggle, pageHead } from '@/components/portal';
import { supabase } from '@/integrations/supabase/client';
import { getAdminDirectory, manageAccount } from '@/lib/admin.functions';

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => pageHead('Admin Control Panel | DCRAP', 'Manage DCRAP user accounts and account approvals.'),
  component: Admin,
});
const filters = ['All', 'Pending', 'Students', 'Graduated Students', 'Faculty'] as const;
const roleNames: Record<string, string> = { admin: 'System Admin', student: 'Student', graduated_student: 'Graduated Student', faculty: 'Faculty' };

function Admin() {
  const fetchDirectory = useServerFn(getAdminDirectory);
  const manage = useServerFn(manageAccount);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['admin-directory'], queryFn: () => fetchDirectory(), retry: false });
  const [filter, setFilter] = useState<string>('All');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const profiles = query.data?.profiles ?? [];
  const matches = (profile: (typeof profiles)[number], tab: string) => tab === 'All' || (tab === 'Pending' ? profile.status === 'pending' : profile.role === ({ Students: 'student', 'Graduated Students': 'graduated_student', Faculty: 'faculty' } as Record<string,string>)[tab]);
  async function signOut() {
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut(); await navigate({ to: '/auth', replace: true });
  }
  async function action(id: string, command: 'approve' | 'delete') {
    if (command === 'delete' && !window.confirm('Reject or delete this account permanently?')) return;
    setBusy(id); setNotice('');
    try { await manage({ data: { id, action: command } }); await query.refetch(); }
    catch { setNotice('The account could not be updated. Please try again.'); }
    finally { setBusy(''); }
  }
  return <PortalTheme><div className="admin-page">
    <header className="admin-header"><div className="admin-header-inner"><div className="admin-brand"><PortalLogo /><span className="admin-separator">/</span><span>Admin Control Panel</span></div><nav aria-label="Administrator navigation"><ThemeToggle /><Button asChild variant="ghost" size="nav"><Link to="/">View Archive <ArrowRight /></Link></Button>{query.data && <span className="admin-identity">admin</span>}<Button variant="ghost" size="nav" onClick={signOut}>Sign out</Button></nav></div></header>
    <main className="admin-content"><section className="directory" aria-labelledby="directory-title"><div className="directory-heading"><h1 id="directory-title">User Accounts Directory</h1><p>Active directory of verified scholars, authors, and faculty.</p></div>
      <div className="directory-tabs" role="tablist" aria-label="Account filters">{filters.map(tab => <Button key={tab} variant="ghost" role="tab" aria-selected={filter === tab} onClick={() => setFilter(tab)}>{tab}<span className={tab === 'Pending' ? 'count pending' : 'count'}>{profiles.filter(profile => matches(profile, tab)).length}</span></Button>)}</div>
      {query.isPending ? <p className="directory-message" role="status">Loading accounts…</p> : query.isError ? <div className="directory-message" role="alert"><p>Administrator access is required, or the directory could not be loaded.</p><Button variant="compact" size="sm" onClick={() => query.refetch()}>Try again</Button></div> : <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Department</th><th>Registered</th><th>Action</th></tr></thead><tbody>{profiles.filter(profile => matches(profile, filter)).map(profile => <tr key={profile.id} className={profile.id === query.data?.userId ? 'self-row' : ''}><td><strong>{profile.full_name || profile.username || 'Unnamed account'}</strong><small>{profile.username ?? profile.email}</small></td><td>{roleNames[profile.role]}</td><td><span className={`account-status ${profile.status}`}>{profile.status === 'approved' ? 'Approved' : 'Pending'}</span></td><td>{profile.department}</td><td><time dateTime={profile.created_at}>{new Date(profile.created_at).toLocaleDateString('en-US', { timeZone: 'UTC' })}</time></td><td>{profile.id === query.data?.userId ? <small>Current (Self)</small> : profile.role === 'admin' ? <small>Protected</small> : <div className="account-actions">{profile.status === 'pending' && <Button size="icon" variant="ghost" disabled={busy === profile.id} aria-label={`Approve ${profile.full_name}`} title="Approve account" onClick={() => action(profile.id, 'approve')}><Check /></Button>}<Button size="icon" variant="ghost" disabled={busy === profile.id} aria-label={`${profile.status === "pending" ? "Reject" : "Delete"} ${profile.full_name}`} title={profile.status === "pending" ? "Reject account" : "Delete account"} onClick={() => action(profile.id, 'delete')}><Trash2 /></Button></div>}</td></tr>)}</tbody></table>{profiles.filter(profile => matches(profile, filter)).length === 0 && <p className="directory-message">No accounts in this category.</p>}</div>}
      {notice && <p className="directory-message" role="alert">{notice}</p>}
    </section></main>
  </div></PortalTheme>;
}