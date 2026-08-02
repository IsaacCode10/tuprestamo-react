-- Tabla para borradores del generador de artículos "14 Años con la Tarjeta"
create table public.articulos_borrador (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),

  -- Identificación del episodio
  titulo        text not null,
  slug          text,
  pais          text,
  year          integer,
  concepto      text,
  keyword       text,

  -- Contenido (voz de Isaac, sin editar)
  historia      text,
  aprendizaje   text,
  dato_sorpresa text,
  caption_foto  text,

  -- Números del episodio
  limite_credito numeric,
  tna            numeric,
  mantenimiento  numeric,
  total_pagado   numeric,

  -- SEO generado por la herramienta
  seo_title       text,
  meta_descripcion text,
  schema_json      jsonb,

  -- Configuración
  cta_destino text default 'auditor',
  estado      text default 'borrador',  -- borrador | revisado | publicado

  -- Auditoría
  creado_por uuid references auth.users(id) default auth.uid()
);

alter table public.articulos_borrador enable row level security;

-- Solo admins pueden leer y escribir
create policy "admin_articulos_full_access"
  on public.articulos_borrador
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

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger articulos_borrador_updated_at
  before update on public.articulos_borrador
  for each row execute function public.set_updated_at();
