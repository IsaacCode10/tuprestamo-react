-- Hardening RPC used by AdminOperations to resolve investor/borrower labels.
-- Goal: avoid HTTP 400 on authorization checks and return deterministic output.

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
    return;
  end if;

  select lower(trim(p.role::text)) into v_role
  from public.profiles p
  where p.id = v_uid
  limit 1;

  -- Defensive: do not raise exceptions (PostgREST would return 400).
  -- Unauthorized callers get empty result set.
  if coalesce(v_role, '') not in ('admin', 'ops', 'operaciones', 'admin_ops', 'super_admin', 'ceo') then
    return;
  end if;

  return query
  select p.id, p.nombre_completo, p.email
  from public.profiles p
  where p.id = any(coalesce(p_user_ids, '{}'::uuid[]));
end;
$$;

revoke all on function public.get_ops_profile_labels(uuid[]) from public;
grant execute on function public.get_ops_profile_labels(uuid[]) to authenticated;
