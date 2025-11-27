-- Añade marca de recordatorio para intents de pago inversionista
alter table public.payment_intents
add column if not exists reminder_sent_at timestamptz;
