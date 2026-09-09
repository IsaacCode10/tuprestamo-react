alter table public.bot_contacts add column if not exists categoria text check (categoria in ('spam', 'prueba_interna'));
