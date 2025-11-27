-- Habilita pgcrypto y ajusta create_investment_intent a usar extensions.gen_random_bytes

create extension if not exists "pgcrypto" with schema extensions;

drop function if exists public.create_investment_intent(bigint, numeric);

create or replace function public.create_investment_intent(p_opportunity_id bigint, p_amount numeric)
returns payment_intents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op oportunidades%rowtype;
  v_total_paid numeric;
  v_reserved numeric;
  v_available numeric;
  v_expires_at timestamptz;
  v_intent payment_intents%rowtype;
begin
  select *
  into v_op
  from oportunidades
  where id = p_opportunity_id
    and estado in ('disponible', 'fondeada', 'activo')
  limit 1;

  if not found then
    raise exception 'Oportunidad no disponible o inexistente';
  end if;

  select coalesce(sum(amount), 0)
  into v_total_paid
  from inversiones
  where opportunity_id = p_opportunity_id
    and status = 'pagado';

  select coalesce(sum(amount), 0)
  into v_reserved
  from inversiones
  where opportunity_id = p_opportunity_id
    and status in ('pendiente_pago', 'intencion');

  v_available := greatest(v_op.monto - v_total_paid - v_reserved, 0);

  if p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  if p_amount > v_available then
    raise exception 'No hay saldo disponible para este monto (cupo: %)', v_available;
  end if;

  v_expires_at := now() + interval '48 hours';

  insert into payment_intents (
    id,
    opportunity_id,
    investor_id,
    expected_amount,
    status,
    reference_code,
    payment_channel,
    expires_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    p_opportunity_id,
    auth.uid(),
    p_amount,
    'pending',
    encode(extensions.gen_random_bytes(6), 'hex'),
    'qr_generico',
    v_expires_at,
    now(),
    now()
  )
  returning * into v_intent;

  insert into inversiones (opportunity_id, investor_id, amount, status, payment_intent_id, created_at)
  values (p_opportunity_id, auth.uid(), p_amount, 'pendiente_pago', v_intent.id, now());

  return v_intent;
end;
$$;
