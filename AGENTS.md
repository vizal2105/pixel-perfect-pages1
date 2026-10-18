<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep shared portal appearance and account forms in reusable frontend components, with separate content routes for home, sign-in, and sign-up, so both account pages stay visually consistent.
- Account forms are appearance-only until real authentication is requested; never simulate a successful login or account creation.
- Administrator access uses Supabase Auth and a named protected /admin route, with role checks inside every directory and management server function; route gates alone do not protect data.
- Store privilege roles separately from profiles and leave role writes service-only; signup metadata must never grant administrator access.
- Provision initial administrators only through trusted local tooling, never a public bootstrap endpoint; username-only login maps a fixed public handle to a synthetic email.
- Student and Graduated Student accounts use the shared real signup form, and sign-in routes approved accounts to their distinct protected dashboards; Faculty has its own review-queue dashboard.
- Keep the Graduated Student submit-work screen separate from manuscript persistence; never simulate a successful submission before file storage and submission records are implemented.
- Preserve the identity-transition root subscriber and bearer middleware; sign-out cancels and clears protected queries before ending the session.
