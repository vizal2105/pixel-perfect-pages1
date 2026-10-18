import { createFileRoute } from "@tanstack/react-router";
import { AccountPage, pageHead } from "@/components/portal";

export const Route = createFileRoute("/sign-up")({
  head: () => pageHead("Create your account | DCRAP", "Create your DCRAP account as a student, graduated student, or faculty member."),
  component: SignUp,
});

function SignUp() { return <AccountPage signup />; }