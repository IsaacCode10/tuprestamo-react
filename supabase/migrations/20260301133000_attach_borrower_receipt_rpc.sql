-- Permite al prestatario adjuntar comprobante de su cuota sin abrir UPDATE directo por RLS.
create or replace function public.attach_borrower_receipt(
  p_intent_id uuid,
  p_receipt_url text
)
returns table (
  id uuid,
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

  if coalesce(trim(p_receipt_url), '') = '' then
    raise exception 'receipt_url requerido';
  end if;

  return query
  update public.borrower_payment_intents b
     set receipt_url = p_receipt_url,
         updated_at = now()
   where b.id = p_intent_id
     and b.borrower_id = v_uid
     and lower(coalesce(b.status, 'pending')) in ('pending', 'unmatched')
  returning b.id, b.receipt_url, b.status;

  if not found then
    raise exception 'No se pudo asociar el comprobante a tu cuota (intent no válido o sin permisos)';
  end if;
end;
$$;

grant execute on function public.attach_borrower_receipt(uuid, text) to authenticated;
