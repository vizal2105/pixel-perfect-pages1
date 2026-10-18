import { createFileRoute } from "@tanstack/react-router";
import { AccountPage, pageHead } from "@/components/portal";

export const Route = createFileRoute("/sign-in")({
  head: () => pageHead("Sign in | DCRAP", "Sign in to your Departmental Capstone and Research Archive Portal account."),
  component: SignIn,
});

function SignIn() { return <AccountPage />; }