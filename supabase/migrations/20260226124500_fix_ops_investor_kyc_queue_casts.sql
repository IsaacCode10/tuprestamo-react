-- Fix: "structure of query does not match function result type"
-- Ensure returned columns are explicitly cast to declared return types.

create or replace function public.get_ops_investor_kyc_queue()
returns table (
  user_id uuid,
  nombre_completo text,
  email text,
  numero_ci text,
  estado_verificacion text
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
    return;
  end if;

  select lower(trim(coalesce(p.role, ''))) into v_role
  from public.profiles p
  where p.id = v_uid
  limit 1;

  if v_role not in ('admin', 'ops', 'operaciones', 'admin_ops', 'super_admin', 'ceo') then
    return;
  end if;

  return query
  select
    p.id::uuid as user_id,
    p.nombre_completo::text as nombre_completo,
    p.email::text as email,
    p.numero_ci::text as numero_ci,
    p.estado_verificacion::text as estado_verificacion
  from public.profiles p
  where lower(coalesce(p.role, '')) = 'inversionista'
    and lower(coalesce(p.estado_verificacion, '')) in ('pendiente_revision', 'requiere_revision_manual')
  order by p.nombre_completo nulls last, p.email nulls last;
end;
$$;

revoke all on function public.get_ops_investor_kyc_queue() from public;
grant execute on function public.get_ops_investor_kyc_queue() to authenticated;
