-- Mantener consistencia entre 'documentos' y 'analisis_documentos'
-- 1) Al eliminar un documento, elimina su análisis asociado
create or replace function public.trg_documentos_after_delete_cleanup()
returns trigger language plpgsql as $$
begin
  delete from public.analisis_documentos
  where solicitud_id = old.solicitud_id and document_type = old.tipo_documento;
  return old;
end;
$$;

drop trigger if exists documentos_after_delete_cleanup on public.documentos;
create trigger documentos_after_delete_cleanup
after delete on public.documentos
for each row execute function public.trg_documentos_after_delete_cleanup();

-- 2) Si el estado cambia de 'subido' a otro, elimina el análisis para ese documento
create or replace function public.trg_documentos_after_update_cleanup()
returns trigger language plpgsql as $$
begin
  if (old.estado = 'subido' and new.estado is distinct from 'subido') then
    delete from public.analisis_documentos
    where solicitud_id = new.solicitud_id and document_type = new.tipo_documento;
  end if;
  return new;
end;
$$;

drop trigger if exists documentos_after_update_cleanup on public.documentos;
create trigger documentos_after_update_cleanup
after update on public.documentos
for each row execute function public.trg_documentos_after_update_cleanup();

-- Nota: Ejecuta este archivo en el SQL editor de Supabase o via CLI para aplicar los triggers.

