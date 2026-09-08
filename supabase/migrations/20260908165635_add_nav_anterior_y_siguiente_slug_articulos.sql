alter table public.articulos add column if not exists nav_anterior_titulo text;
alter table public.articulos add column if not exists nav_anterior_slug text;
alter table public.articulos add column if not exists nav_siguiente_slug text;
