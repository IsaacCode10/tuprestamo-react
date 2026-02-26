-- Enforce KYC + single active reservation at DB level (SSOT)
-- This guarantees an investor cannot bypass verification from frontend.

create or replace function public.create_investment_intent(p_opportunity_id bigint, p_amount numeric)
returns payment_intents
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_op oportunidades%rowtype;
  v_total_paid numeric;
  v_reserved numeric;
  v_available numeric;
  v_expires_at timestamptz;
  v_intent payment_intents%rowtype;
  v_investor uuid;
  v_role text;
  v_verif text;
begin
  v_investor := auth.uid();
  if v_investor is null then
    raise exception 'Debes iniciar sesión para invertir';
  end if;

  -- KYC server-side (definitive gate)
  select lower(coalesce(role, '')), lower(coalesce(estado_verificacion, 'no_iniciado'))
    into v_role, v_verif
  from public.profiles
  where id = v_investor
  limit 1;

  if coalesce(v_verif, 'no_iniciado') <> 'verificado' then
    raise exception 'Debes verificar tu cuenta antes de invertir';
  end if;

  -- Defensive: avoid duplicate active reservations for same investor/opportunity.
  if exists (
    select 1
    from public.payment_intents pi
    where pi.investor_id = v_investor
      and pi.opportunity_id = p_opportunity_id
      and lower(coalesce(pi.status, '')) in ('pending', 'unmatched')
      and coalesce(pi.expires_at, now()) > now()
  ) then
    raise exception 'Ya tienes una reserva activa en esta oportunidad';
  end if;

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
    v_investor,
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
  values (p_opportunity_id, v_investor, p_amount, 'pendiente_pago', v_intent.id, now());

  return v_intent;
end;
$$;
