-- Tabla de notificaciones (in-app) con RLS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link_url text,
  data jsonb,
  priority text default 'normal', -- normal | high
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Policies: el usuario ve y actualiza sólo sus notificaciones
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications for select to authenticated
using (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
on public.notifications for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Inserción sólo por servicio (Edge Functions con service_role)
drop policy if exists notifications_insert_none on public.notifications;
create policy notifications_insert_none
on public.notifications for insert to authenticated
with check (false);

comment on table public.notifications is 'In-app notifications with per-user RLS';

