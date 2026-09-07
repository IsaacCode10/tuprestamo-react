select cron.schedule(
  'send-reactivacion-fria-cada-30min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://paijuvlccnkxjwjpoffe.supabase.co/functions/v1/send-reactivacion-fria',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
