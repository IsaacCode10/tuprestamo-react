-- Policies for ops/admin to upload payout receipts and update payouts

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'ops_admin_upload_receipts'
  ) then
    create policy "ops_admin_upload_receipts"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'comprobantes-pagos'
        and ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'ops'))
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payouts_inversionistas'
      and policyname = 'po_update_admin_ops'
  ) then
    create policy "po_update_admin_ops"
      on public.payouts_inversionistas
      for update
      to authenticated
      using (
        exists (
          select 1 from profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'ops')
        )
      )
      with check (
        exists (
          select 1 from profiles p
          where p.id = auth.uid()
            and p.role in ('admin', 'ops')
        )
      );
  end if;
end $$;
