# Why accounts show as "Viewer" and "Welcome back, User"

## Who set them as Viewer?

**The role is stored in the database** in `public.workspace_members.role`. The app only **reads** it (via `getCurrentUserRole()` → `api.auth.me()`). If there is **no row** for the user, the app defaults to `'Viewer'`. So "Viewer" is either a real DB value or this default. Causes:

1. **New signups never got a workspace (main cause for paying users)**  
   The **signup trigger** `handle_new_user()` (runs on every new auth user) created profile, user_settings, email_templates, integrations—but **did not** create a workspace or insert into `workspace_members`. So every new user (including paying) had **0 rows** in `workspace_members` and the app showed Viewer.  
   **Fix:** Migration `20260228200000_handle_new_user_creates_workspace_admin.sql` updates the trigger to create a workspace and insert the user as **Admin** on signup. All new users are Admin of their own workspace.

2. **Accepting a workspace invite**  
   The **original** `accept_workspace_invite` did `ON CONFLICT ... DO UPDATE SET role = EXCLUDED.role`, so when the workspace owner accepted an invite (e.g. to their own email with role Viewer), their Admin was **overwritten** to Viewer. Fixed in `20260228150000`.

3. **Backfill when workspaces were added**  
   Backfill created one workspace per profile and set role from `profiles.role` (or Admin if null). If `profiles.role` was already Viewer, you got Viewer. (Viewer was added to the schema later.)

## Why "Welcome back, User"?

The dashboard shows `user?.name?.trim()?.split(' ')[0] || user?.email?.split('@')[0] || 'User'` where `user` comes from `api.auth.me()`. So you see **"User"** only when both:

- `name` is missing/empty from the profile, and  
- `email` is missing/empty from the auth user (e.g. `getUser()` didn’t return email, or session quirk).

So it’s a fallback when name and email are both missing in the response.

## One Admin per workspace (owner only)

There must never be two Admins in the same workspace. Only the workspace **owner** (`workspaces.created_by`) may have role Admin. A prior migration had set `created_by` to "first member" when null, which could pick an invited Viewer; then "set all owners to Admin" made that person Admin by mistake. Migration `20260228230000_one_admin_owner_only.sql` demotes any non-owner with Admin to Viewer and adds a trigger so only `created_by` can be Admin.

## How we fix it

- **Role:** Ensure every workspace has an owner (`workspaces.created_by` set) and that row in `workspace_members` has `role = 'Admin'`. Migrations `20260228160000`, `20260228170000` (RPC), and the per-account link script do that; the new "fix all" migration does it for every workspace and every owner.
- **Welcome:** In `auth.me()` we always prefer `user?.email` (and `user_metadata.email` as fallback) so the greeting never falls back to "User" when we have an email.
