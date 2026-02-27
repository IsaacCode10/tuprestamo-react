-- Fix definitivo para reservas de inversión:
-- 1) Elimina posibles overloads heredados de create_investment_intent.
-- 2) Re-crea una sola firma canónica (bigint, numeric).
-- 3) Calcula cupo disponible con payment_intents activos (pending/unmatched no expirados),
--    evitando desalineaciones por estados históricos en otras tablas.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_investment_intent'
  loop
    execute format('drop function if exists %s', r.sig);
  end loop;
end $$;

create or replace function public.create_investment_intent(p_opportunity_id bigint, p_amount numeric)
returns payment_intents
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_op oportunidades%rowtype;
  v_total_paid numeric := 0;
  v_reserved numeric := 0;
  v_available numeric := 0;
  v_expires_at timestamptz;
  v_intent payment_intents%rowtype;
  v_investor uuid;
  v_verif text;
  v_amount numeric;
begin
  v_investor := auth.uid();
  if v_investor is null then
    raise exception 'Debes iniciar sesión para invertir';
  end if;

  select lower(coalesce(estado_verificacion, 'no_iniciado'))
    into v_verif
  from public.profiles
  where id = v_investor
  limit 1;

  if coalesce(v_verif, 'no_iniciado') <> 'verificado' then
    raise exception 'Debes verificar tu cuenta antes de invertir';
  end if;

  v_amount := round(coalesce(p_amount, 0)::numeric, 2);
  if v_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  -- Lock de la oportunidad para evitar sobre-reservas por concurrencia.
  select *
    into v_op
  from oportunidades
  where id = p_opportunity_id
    and estado in ('disponible', 'fondeada', 'activo')
  for update;

  if not found then
    raise exception 'Oportunidad no disponible o inexistente';
  end if;

  -- Restricción: un solo intent activo por inversionista y oportunidad.
  if exists (
    select 1
    from public.payment_intents pi
    where pi.investor_id = v_investor
      and pi.opportunity_id = p_opportunity_id
      and lower(trim(coalesce(pi.status, ''))) in ('pending', 'unmatched')
      and coalesce(pi.expires_at, now()) > now()
  ) then
    raise exception 'Ya tienes una reserva activa en esta oportunidad';
  end if;

  select coalesce(sum(i.amount), 0)
    into v_total_paid
  from public.inversiones i
  where i.opportunity_id = p_opportunity_id
    and lower(trim(coalesce(i.status, ''))) = 'pagado';

  -- Cupo reservado = intents activos (no expirados), excluyendo pagados/expirados/cancelados.
  select coalesce(sum(pi.expected_amount), 0)
    into v_reserved
  from public.payment_intents pi
  where pi.opportunity_id = p_opportunity_id
    and lower(trim(coalesce(pi.status, ''))) in ('pending', 'unmatched')
    and coalesce(pi.expires_at, now()) > now();

  v_available := greatest(round(coalesce(v_op.monto, 0)::numeric, 2) - round(v_total_paid, 2) - round(v_reserved, 2), 0);

  if v_amount > v_available then
    raise exception 'No hay saldo disponible para este monto (cupo actual: %)', v_available;
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
    v_amount,
    'pending',
    encode(extensions.gen_random_bytes(6), 'hex'),
    'qr_generico',
    v_expires_at,
    now(),
    now()
  )
  returning * into v_intent;

  insert into inversiones (opportunity_id, investor_id, amount, status, payment_intent_id, created_at)
  values (p_opportunity_id, v_investor, v_amount, 'pendiente_pago', v_intent.id, now());

  return v_intent;
end;
$$;

grant execute on function public.create_investment_intent(bigint, numeric) to authenticated;
