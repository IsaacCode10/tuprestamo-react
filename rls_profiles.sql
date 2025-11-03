-- Habilita la Seguridad a Nivel de Fila (RLS) en la tabla de perfiles.
-- Es un prerrequisito de seguridad para definir políticas.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Permite a un usuario leer ÚNICAMENTE su propio perfil.
-- La función auth.uid() devuelve el ID del usuario autenticado en ese momento.
-- Esto es CRUCIAL para que la suscripción en tiempo real funcione.
CREATE POLICY "Los usuarios pueden ver su propio perfil" 
ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- Política de UPDATE: Permite a un usuario actualizar ÚNICAMENTE su propio perfil.
-- La cláusula WITH CHECK asegura que un usuario no pueda intentar cambiar el 'id' de su perfil a otro.
CREATE POLICY "Los usuarios pueden actualizar su propio perfil" 
ON public.profiles
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- NOTA: No se añade una política de INSERT porque la creación de perfiles
-- ya se gestiona de forma segura a través de un trigger de base de datos cuando un nuevo usuario se registra.
