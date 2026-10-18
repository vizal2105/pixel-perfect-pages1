import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, LogIn, ShieldCheck, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalLogo, PortalTheme, ThemeToggle, pageHead } from "@/components/portal";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => pageHead("DCRAP | Departmental Capstone and Research Archive Portal", "Every defended paper, prototype, and dataset in one place — preserved, searchable, and credited to the people who made it."),
});

const roles = [
  { title: "Student", Icon: User, text: "Search the shelf, read approved capstones, and cite prior departmental work." },
  { title: "Graduated Student", Icon: GraduationCap, text: "Submit your capstone or thesis and follow it through review and archiving." },
  { title: "Faculty", Icon: ShieldCheck, text: "Advise, evaluate, and curate what enters the permanent departmental record." },
];

function Index() {
  return <PortalTheme><div className="portal-page portal-grid">
    <header className="portal-header"><PortalLogo /><nav className="portal-nav" aria-label="Portal navigation"><ThemeToggle /></nav></header>
    <main className="portal-hero"><div className="archive-badge">DEPARTMENT ARCHIVE</div><h1 className="portal-title">Departmental Capstone and<br />Research Archive Portal</h1><p className="portal-description">Every defended paper, prototype, and dataset in one place –<br />preserved, searchable, and credited to the people who made it.</p><div className="hero-actions"><Button variant="portal" size="action" asChild><Link to="/sign-up"><UserPlus />Create an account<ArrowRight /></Link></Button><Button variant="compact" size="action" asChild><Link to="/sign-in"><LogIn className="text-muted-foreground" />Sign in</Link></Button></div></main>
    <section className="portal-roles" aria-label="Department roles"><div className="portal-roles-inner">{roles.map(({ title, Icon, text }) => <article className="portal-role" key={title}><span className="role-icon"><Icon /></span><h2>{title}</h2><p>{text}</p></article>)}</div></section>
    <footer className="portal-footer">Departmental Capstone and Research Archive Portal</footer>
  </div></PortalTheme>;
}
