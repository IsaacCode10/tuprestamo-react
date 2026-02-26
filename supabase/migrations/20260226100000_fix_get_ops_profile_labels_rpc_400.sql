-- Fix definitivo: eliminar causas de 400 en get_ops_profile_labels
-- Implementación SQL simple, sin excepciones, con salida determinista.

create or replace function public.get_ops_profile_labels(p_user_ids uuid[])
returns table (
  id uuid,
  nombre_completo text,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.nombre_completo::text as nombre_completo,
    p.email::text as email
  from public.profiles p
  where p.id = any(coalesce(p_user_ids, '{}'::uuid[]));
$$;

revoke all on function public.get_ops_profile_labels(uuid[]) from public;
grant execute on function public.get_ops_profile_labels(uuid[]) to authenticated;
