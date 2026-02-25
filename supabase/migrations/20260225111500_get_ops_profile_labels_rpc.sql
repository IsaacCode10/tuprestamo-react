-- RPC segura para panel de Operaciones:
-- Devuelve nombre/email de perfiles por lista de user_ids sin depender de RLS de profiles.

create or replace function public.get_ops_profile_labels(p_user_ids uuid[])
returns table (
  id uuid,
  nombre_completo text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_role text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No autorizado';
  end if;

  select p.role into v_role
  from public.profiles p
  where p.id = v_uid;

  if coalesce(v_role, '') not in ('admin', 'ops', 'operaciones', 'admin_ops') then
    raise exception 'No autorizado';
  end if;

  return query
  select p.id, p.nombre_completo, p.email
  from public.profiles p
  where p.id = any(coalesce(p_user_ids, '{}'));
end;
$$;

revoke all on function public.get_ops_profile_labels(uuid[]) from public;
grant execute on function public.get_ops_profile_labels(uuid[]) to authenticated;
