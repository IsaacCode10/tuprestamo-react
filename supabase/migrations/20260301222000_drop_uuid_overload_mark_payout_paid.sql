-- Fix definitivo: evitar ambigüedad RPC en mark_payout_paid.
-- El entorno opera con payouts_inversionistas.id numérico, por lo que
-- dejamos solo la firma bigint.

drop function if exists public.mark_payout_paid(uuid, text);

