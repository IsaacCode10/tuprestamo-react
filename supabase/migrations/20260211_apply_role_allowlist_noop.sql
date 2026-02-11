-- Fix: avoid auth.users trigger failure when allowlist function is missing
create or replace function public.apply_role_from_allowlist(user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- no-op: placeholder so auth.users trigger doesn't fail
  return;
end;
$$;
