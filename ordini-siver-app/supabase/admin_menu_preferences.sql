-- Menu applicazioni amministratore: preferenze personali della disposizione icone.
-- Esegui questo script una sola volta nel SQL Editor di Supabase.

create table if not exists public.admin_menu_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  item_order text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.admin_menu_preferences enable row level security;

drop policy if exists "Admin legge la propria disposizione menu" on public.admin_menu_preferences;
create policy "Admin legge la propria disposizione menu"
on public.admin_menu_preferences
for select
to authenticated
using (
  auth.uid() = user_id
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admin salva la propria disposizione menu" on public.admin_menu_preferences;
create policy "Admin salva la propria disposizione menu"
on public.admin_menu_preferences
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

drop policy if exists "Admin aggiorna la propria disposizione menu" on public.admin_menu_preferences;
create policy "Admin aggiorna la propria disposizione menu"
on public.admin_menu_preferences
for update
to authenticated
using (
  auth.uid() = user_id
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  auth.uid() = user_id
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

grant select, insert, update on public.admin_menu_preferences to authenticated;
