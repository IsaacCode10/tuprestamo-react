-- Migración para agregar estado de verificación a perfiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS estado_verificacion TEXT DEFAULT 'no_iniciado';

COMMENT ON COLUMN public.profiles.estado_verificacion IS 'Estado del proceso de KYC: no_iniciado, pendiente_revision, verificado, rechazado';

-- Poblar la columna para usuarios existentes
-- Asumimos que los prestatarios existentes están 'verificados' en otro flujo y los admins también.
UPDATE public.profiles
SET estado_verificacion = 'verificado'
WHERE role IN ('prestatario', 'admin', 'analista_riesgo') AND estado_verificacion = 'no_iniciado';

-- Los inversionistas existentes necesitarán pasar por el nuevo flujo.
UPDATE public.profiles
SET estado_verificacion = 'no_iniciado'
WHERE role = 'inversionista';
