-- bot_contacts vive conceptualmente en el repo tuprestamo-bot, pero es la misma base de
-- datos - se aplica desde aca porque el CLI de Supabase ya esta linkeado a este proyecto en
-- este repo (mismo criterio que Capibara Kids con capibara-kids-bot). Se actualiza cuando
-- Isaac abre una conversacion puntual en /conversations/[id] - permite marcar "mensajes
-- nuevos sin revisar" en el panel del bot.
alter table public.bot_contacts add column if not exists last_read_at timestamptz;
