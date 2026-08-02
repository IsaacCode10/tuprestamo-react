-- Lead magnet del blog: "avisame cuando salga el proximo capitulo".
-- Cualquiera puede dejar su email (publico, sin login); solo admin puede leer la lista.

create table public.blog_suscriptores (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  email       text not null unique,
  origen_slug text
);

alter table public.blog_suscriptores enable row level security;

create policy "admin_full_access_blog_suscriptores"
  on public.blog_suscriptores
  for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "public_insert_blog_suscriptores"
  on public.blog_suscriptores
  for insert
  to anon, authenticated
  with check (true);
