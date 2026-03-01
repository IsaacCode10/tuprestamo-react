-- Hotfix: borrower_payment_intents.id no es uuid en este entorno.
-- Usar comparación por texto para soportar id numérico/uuid sin romper RLS.

drop function if exists public.attach_borrower_receipt(uuid, text);

create or replace function public.attach_borrower_receipt(
  p_intent_id text,
  p_receipt_url text
)
returns table (
  id text,
  receipt_url text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para subir comprobantes';
  end if;

  if coalesce(trim(p_intent_id), '') = '' then
    raise exception 'intent_id requerido';
  end if;

  if coalesce(trim(p_receipt_url), '') = '' then
    raise exception 'receipt_url requerido';
  end if;

  return query
  update public.borrower_payment_intents b
     set receipt_url = p_receipt_url,
         updated_at = now()
   where b.id::text = p_intent_id
     and b.borrower_id = v_uid
     and lower(coalesce(b.status, 'pending')) in ('pending', 'unmatched')
  returning b.id::text, b.receipt_url, b.status;

  if not found then
    raise exception 'No se pudo asociar el comprobante a tu cuota (intent no válido o sin permisos)';
  end if;
end;
$$;

grant execute on function public.attach_borrower_receipt(text, text) to authenticated;
