-- Policies to allow inversionista to insertar y leer sus propias notificaciones (incluye reservas)

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'allow_insert_own_notifications'
  ) then
    create policy allow_insert_own_notifications
      on public.notifications
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'allow_select_own_notifications'
  ) then
    create policy allow_select_own_notifications
      on public.notifications
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end;
$$;
