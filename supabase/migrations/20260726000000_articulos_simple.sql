-- Reemplaza el sistema de articulos_borrador (generador con conceptos/plantillas, abandonado)
-- por una tabla simple: el usuario carga titulo + historia + 2 fotos, y el resto del
-- contenido (frase destacada, tabla de datos, FAQs, CTA) se completa a mano antes de publicar.

drop policy if exists "admin_articulos_full_access" on public.articulos_borrador;
drop policy if exists "public_read_articulos_publicados" on public.articulos_borrador;
drop trigger if exists articulos_borrador_updated_at on public.articulos_borrador;
drop table if exists public.articulos_borrador;

create table public.articulos (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  slug          text unique not null,
  titulo        text not null,
  serie_label   text,        -- ej: "14 Años con la Tarjeta · Episodio 0 · El Origen · Brasil, 2014"
  fecha_texto   text,        -- ej: "Julio 2026"
  tiempo_lectura text,       -- ej: "8 min de lectura"

  foto1_url     text,
  foto1_caption text,
  foto2_url     text,
  foto2_caption text,

  historia      text,        -- parrafos separados por linea en blanco, tal como los pega el usuario
  frase_destacada text,       -- pull quote (.pq)

  tabla_titulo  text,
  tabla_filas   jsonb default '[]'::jsonb,   -- [{"label": "...", "valor": "..."}]

  reveal_label  text,
  reveal_numero text,
  reveal_sub    text,
  insight       text,        -- parrafo de cierre despues del reveal

  faqs          jsonb default '[]'::jsonb,   -- [{"q": "...", "a": "..."}]

  cta_eyebrow      text,
  cta_titulo       text,
  cta_texto        text,
  cta_boton_label  text,
  cta_boton_url    text,

  nav_siguiente_titulo text,  -- "Proximo episodio" en el pie del articulo (opcional)

  seo_title        text,
  seo_description  text,

  publicado     boolean default false,
  creado_por    uuid references auth.users(id) default auth.uid()
);

alter table public.articulos enable row level security;

create policy "admin_articulos_full_access"
  on public.articulos
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

create policy "public_read_articulos_publicados"
  on public.articulos
  for select
  to anon, authenticated
  using (publicado = true);

create trigger articulos_updated_at
  before update on public.articulos
  for each row execute function public.set_updated_at();
