-- Normaliza estado legacy "financiada" -> "fondeada" y evita reintroducirlo.

-- 1) Corrección de datos existentes
update public.oportunidades
set estado = 'fondeada'
where lower(trim(coalesce(estado, ''))) = 'financiada';

-- 2) Guardrail de escritura para futuros inserts/updates
create or replace function public.normalize_oportunidad_estado()
returns trigger
language plpgsql
as $$
begin
  if new.estado is not null then
    new.estado := lower(trim(new.estado));
    if new.estado = 'financiada' then
      new.estado := 'fondeada';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_normalize_oportunidad_estado on public.oportunidades;
create trigger tr_normalize_oportunidad_estado
before insert or update of estado on public.oportunidades
for each row
execute function public.normalize_oportunidad_estado();

