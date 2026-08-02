-- Habilita publicacion real de articulos_borrador: columnas de fotos, lectura publica y storage.

alter table public.articulos_borrador
  add column if not exists foto_url text,
  add column if not exists foto_url_2 text,
  add column if not exists caption_foto_2 text;

-- Lectura publica solo de articulos con estado = 'publicado' (la policy admin-only existente sigue
-- cubriendo insert/update/delete y lectura de borradores)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'articulos_borrador'
      and policyname = 'public_read_articulos_publicados'
  ) then
    create policy "public_read_articulos_publicados"
      on public.articulos_borrador
      for select
      to anon, authenticated
      using (estado = 'publicado');
  end if;
end $$;

-- Bucket publico para fotos de articulos
insert into storage.buckets (id, name, public)
values ('articulos-imagenes', 'articulos-imagenes', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'admin_upload_articulos_imagenes'
  ) then
    create policy "admin_upload_articulos_imagenes"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'articulos-imagenes'
        and exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public_read_articulos_imagenes'
  ) then
    create policy "public_read_articulos_imagenes"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'articulos-imagenes');
  end if;
end $$;
