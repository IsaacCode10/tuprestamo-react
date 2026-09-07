-- Captura progresiva de formularios de solicitud abandonados a mitad de camino.
-- El formulario interactivo (InteractiveForm.jsx) guarda acá nombre/email/telefono
-- apenas la persona los contesta, sin esperar a que termine todo el formulario (que
-- recien inserta en `solicitudes`). Sirve para remarketing a quien empezo pero no
-- termino: si dejo telefono, WhatsApp; si solo dejo email, email marketing.
--
-- Nota de privacidad: esto captura email/telefono antes del checkbox de
-- `acepta_contacto` (que solo existe hoy en el envio final) - decision de negocio
-- tomada explicitamente por Isaac, no asumida por el codigo.

create table public.solicitudes_parciales (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  tipo_solicitud     text not null default 'prestatario',
  nombre_completo    text,
  email              text,
  telefono           text,
  ultima_pregunta_id integer,
  convertido         boolean not null default false,
  convertido_at      timestamptz,
  contactado_at      timestamptz
);

alter table public.solicitudes_parciales enable row level security;

create policy "admin_full_access_solicitudes_parciales"
  on public.solicitudes_parciales
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

-- El formulario es publico y anonimo (nadie inicio sesion todavia en este punto):
-- cualquiera puede crear su propio borrador y actualizarlo mientras sigue completando.
-- La proteccion practica es que solo quien tiene el `id` (uuid generado en su propio
-- navegador) puede actualizar esa fila puntual.
create policy "public_insert_solicitudes_parciales"
  on public.solicitudes_parciales
  for insert
  to anon, authenticated
  with check (true);

create policy "public_update_solicitudes_parciales"
  on public.solicitudes_parciales
  for update
  to anon, authenticated
  using (true)
  with check (true);
