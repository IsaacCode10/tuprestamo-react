-- Ajuste de comunicación KYC manual:
-- - Si se aprueba, in-app debe llevar a /oportunidades (CTA comercial).
-- - Si se solicita corrección, mantener /verificar-cuenta.

create or replace function public.ops_set_investor_kyc_status(
  p_user_id uuid,
  p_new_status text,
  p_note text default null
)
returns table (
  user_id uuid,
  estado_verificacion text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_role text;
  v_status text;
  v_title text;
  v_body text;
  v_link text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No autorizado';
  end if;

  select lower(trim(coalesce(p.role, ''))) into v_role
  from public.profiles p
  where p.id = v_uid
  limit 1;

  if v_role not in ('admin', 'ops', 'operaciones', 'admin_ops', 'super_admin', 'ceo') then
    raise exception 'No autorizado';
  end if;

  v_status := lower(trim(coalesce(p_new_status, '')));
  if v_status not in ('verificado', 'requiere_revision_manual', 'pendiente_revision') then
    raise exception 'Estado no permitido';
  end if;

  update public.profiles
  set estado_verificacion = v_status
  where id = p_user_id
    and lower(coalesce(role, '')) = 'inversionista';

  if not found then
    raise exception 'Inversionista no encontrado';
  end if;

  v_title := case
    when v_status = 'verificado' then 'Tu verificación fue aprobada'
    when v_status = 'pendiente_revision' then 'Tu verificación está en revisión'
    else 'Necesitamos que ajustes tu verificación'
  end;

  v_body := case
    when v_status = 'verificado' then 'Tu cuenta ya está verificada y puedes invertir.'
    when v_status = 'pendiente_revision' then 'Recibimos tu verificación y seguimos revisándola.'
    else coalesce(nullif(trim(p_note), ''), 'Revisa tus datos y vuelve a enviarlos para completar tu verificación.')
  end;

  v_link := case
    when v_status = 'verificado' then '/oportunidades'
    else '/verificar-cuenta'
  end;

  insert into public.notifications (user_id, type, title, body, link_url, created_at)
  values (
    p_user_id,
    'kyc_status',
    v_title,
    v_body,
    v_link,
    now()
  );

  return query
  select p_user_id, v_status;
end;
$$;

revoke all on function public.ops_set_investor_kyc_status(uuid, text, text) from public;
grant execute on function public.ops_set_investor_kyc_status(uuid, text, text) to authenticated;
