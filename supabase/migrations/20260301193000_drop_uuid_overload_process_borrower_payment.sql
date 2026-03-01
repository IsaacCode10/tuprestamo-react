-- Fix inmediato: evita ambiguedad RPC en PostgREST al tener dos overloads
-- process_borrower_payment(uuid,text) y process_borrower_payment(bigint,text).
-- El flujo actual usa borrower_payment_intents.id numerico, por lo que dejamos
-- solo la firma bigint.

drop function if exists public.process_borrower_payment(uuid, text);

