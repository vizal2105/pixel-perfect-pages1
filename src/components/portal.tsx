import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { registerAccount } from "@/lib/account.functions";
import { BookOpen, Moon, Sun, Eye, EyeOff } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function PortalTheme({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(window.sessionStorage.getItem("dcrap-theme") === "dark");
  }, []);
  const toggle = () => setDark((value) => {
    window.sessionStorage.setItem("dcrap-theme", value ? "light" : "dark");
    return !value;
  });
  return <ThemeContext.Provider value={{ dark, toggle }}><div className={dark ? "dark" : ""}><div className="bg-background text-foreground">{children}</div></div></ThemeContext.Provider>;
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { dark, toggle } = useContext(ThemeContext);
  return <Button variant="theme" size={compact ? "mini" : "nav"} onClick={toggle} title={`Switch to ${dark ? "light" : "dark"} mode`} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} className={compact ? "absolute right-5 top-5" : ""}>{dark ? <Sun /> : <Moon />}{!compact && (dark ? "Light" : "Dark")}</Button>;
}

export function PortalLogo() {
  return <Link to="/" className="portal-logo" aria-label="DCRAP home"><span className="logo-icon"><BookOpen /></span>DCRAP</Link>;
}

export const accountRoles = [
  { name: "Student", detail: "Browse and read approved capstone and research work." },
  { name: "Graduated Student", detail: "Submit and track your own capstone or thesis." },
  { name: "Faculty", detail: "Advise, review, and curate departmental research." },
];

export function AccountPage({ signup = false }: { signup?: boolean }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => { if (!signup) void supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user))); }, [signup]);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Student");
  const [notice, setNotice] = useState("");
  const register = useServerFn(registerAccount);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (signup) {
      setBusy(true); setNotice('');
      try {
        const result = await register({ data: { fullName: String(fields.get('name') ?? ''), email: String(fields.get('email') ?? ''), password: String(fields.get('password') ?? ''), role: role as 'Student', studentNo: String(fields.get('studentNo') ?? '') || undefined } });
        if (!result.ok) { setNotice(result.message); return; }
        form.reset();
        setNotice('Account created. An administrator must approve it before you can sign in.');
      } catch { setNotice('Unable to create the account. Please check your details.'); }
      finally { setBusy(false); }
      return;
    }
    const login = String(fields.get('email') ?? '').trim().toLowerCase();
    setBusy(true); setNotice('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: login === 'admin' ? 'admin@dcrap.local' : login, password: String(fields.get('password') ?? '') });
      if (error) { setNotice('Incorrect username or password.'); return; }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) { setNotice('Unable to verify your account.'); return; }
      const uid = userData.user.id;
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', uid),
        supabase.from('profiles').select('status').eq('id', uid).maybeSingle(),
      ]);
      const r = roles?.map(x => x.role) ?? [];
      if (r.includes('admin')) { setSignedIn(true); await navigate({ to: '/admin' }); return; }
      if (profile?.status !== 'approved') { await supabase.auth.signOut(); setNotice('Your account is awaiting administrator approval.'); return; }
      if (r.includes('student')) { setSignedIn(true); await navigate({ to: '/dashboard' }); return; }
       if (r.includes('graduated_student')) { setSignedIn(true); await navigate({ to: '/graduated-dashboard' }); return; }
      if (r.includes('faculty')) { setSignedIn(true); await navigate({ to: '/faculty-dashboard' }); return; }
      await supabase.auth.signOut(); setNotice('The dashboard for your role is not available yet.');
    } catch { setNotice('Sign-in is unavailable. Please try again.'); }
    finally { setBusy(false); }
  };
  async function signOut() { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); setSignedIn(false); await navigate({ to: '/auth', replace: true }); }
  return <PortalTheme><main className="auth-page">
    <aside className="auth-sidebar">
      <div className="auth-sidebar-header"><PortalLogo /><Link to="/" className="back-link">Back to portal &gt;</Link></div>
      <div className="auth-story"><div className="auth-eyebrow">DEPARTMENT ARCHIVE</div><h2>Capstone <span>&amp;</span><br />Research<br />Archive Portal</h2><p>One shelf for every defended paper, prototype, and dataset the department produces — preserved, searchable, and credited.</p></div>
      <div className="auth-sidebar-footer">Access is granted by role: Student, Graduating Student, or Faculty.</div>
    </aside>
    <section className="auth-main">
      <ThemeToggle compact />
      <form className="auth-form" onSubmit={submit}>
        <h1>{signup ? "Create your account" : "Sign in"}</h1>
        <p className="auth-subtitle">{signup ? "Choose the role that matches your standing in the department." : "Use your departmental account to continue."}</p>
        {signup && <><label className="auth-field"><span className="auth-label">Full name</span><input className="auth-input" name="name" autoComplete="name" placeholder="Juan Dela Cruz" required /></label>
          <fieldset className="role-options"><legend className="auth-label">Role</legend>{accountRoles.map((item) => <label key={item.name} className="role-choice"><input type="radio" name="role" value={item.name} checked={role === item.name} onChange={() => setRole(item.name)} /><span><strong>{item.name}</strong><small>{item.detail}</small></span></label>)}</fieldset></>}
        <label className="auth-field"><span className="auth-label">{signup ? 'Email' : 'Email or username'}</span><input className="auth-input" type={signup ? 'email' : 'text'} name="email" autoComplete={signup ? 'email' : 'username'} placeholder={signup ? 'example@gmail.com' : 'Email or username'} required /></label>
<div className="auth-field"><label htmlFor="password" className="auth-label">Password</label><div className="password-wrap"><input id="password" className="auth-input" type={showPassword ? "text" : "password"} name="password" autoComplete={signup ? "new-password" : "current-password"} placeholder="••••••••" required minLength={signup ? 8 : 1} /><Button type="button" variant="eye" size="eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <Eye /> : <EyeOff />}</Button></div></div>
        {signup && (role === "Student" || role === "Graduated Student") && <label className="auth-field"><span className="auth-label">Student No.</span><input className="auth-input" name="studentNo" autoComplete="off" placeholder="e.g. 2022-01234" required /></label>}
        <Button variant="auth" size="submit" type="submit" disabled={busy}>{busy ? (signup ? 'Creating…' : 'Signing in…') : signup ? "Create account" : "Sign in"}</Button>
        {signedIn && !signup && <div className="auth-alternate"><Button asChild variant="link" size="sm"><Link to="/admin">Admin Control Panel</Link></Button><Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button></div>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
        <div className="auth-alternate">{signup ? <>Already registered?<Link to="/sign-in">Sign in</Link></> : <>No account yet?<Link to="/sign-up">Create one</Link></>}</div>
      </form>
    </section>
  </main></PortalTheme>;
}

export function pageHead(title: string, description: string) {
  return { meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
}