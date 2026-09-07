-- Segmento "caliente" del flujo de reactivacion por WhatsApp (ver GUIA_DEFINITIVA_BOT_WHATSAPP.md
-- Parte 10): solicitud completa, nunca activo/visito su dashboard.
alter table public.solicitudes add column if not exists activado_en_dashboard_at timestamptz;
alter table public.solicitudes add column if not exists reactivacion_enviada_at timestamptz;
