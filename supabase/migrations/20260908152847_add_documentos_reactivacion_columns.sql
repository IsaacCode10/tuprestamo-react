-- Estado de la conversacion guiada de subida de documentos por WhatsApp (boton "Termino
-- por WhatsApp" de la plantilla reactivacion_solicitud_documentos). El bot necesita
-- recordar, entre un mensaje y el siguiente, que documento puntual esta esperando de esa
-- persona - hoy el webhook es sin memoria de estado mas alla del historial de chat.
alter table public.bot_contacts add column if not exists esperando_documento text;
alter table public.bot_contacts add column if not exists esperando_documento_solicitud_id bigint;

-- Dedup + whitelist retroactiva del 3er segmento (activo, con documentos subidos pero
-- incompletos) - separado del flag de la campaña "caliente" a proposito: son perfiles
-- distintos y no queremos que alguien califique para las dos por error (ver
-- ESTRATEGIA_REACTIVACION_WHATSAPP.md).
alter table public.solicitudes add column if not exists reactivacion_documentos_enviada_at timestamptz;
alter table public.solicitudes add column if not exists incluir_reactivacion_documentos_retroactiva boolean not null default false;

update public.solicitudes set incluir_reactivacion_documentos_retroactiva = true where id in (263, 269);
