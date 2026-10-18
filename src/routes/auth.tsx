import { createFileRoute } from '@tanstack/react-router';
import { AccountPage, pageHead } from '@/components/portal';

export const Route = createFileRoute('/auth')({
  head: () => pageHead('Account access | DCRAP', 'Sign in to access your DCRAP administrator account.'),
  component: Auth,
});
function Auth() { return <AccountPage />; }