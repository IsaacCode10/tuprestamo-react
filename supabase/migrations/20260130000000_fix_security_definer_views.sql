-- Corrige las alertas de seguridad "SECURITY DEFINER" para las vistas especificadas.
-- Esto asegura que las vistas se ejecuten con los permisos del usuario que las consulta,
-- aplicando correctamente las políticas de RLS.

ALTER VIEW public.investor_payouts_view SET (security_invoker = true);

ALTER VIEW public.fuente_unica_checks SET (security_invoker = true);

ALTER VIEW public.borrower_mora_view SET (security_invoker = true);
