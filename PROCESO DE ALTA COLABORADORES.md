# Proceso de alta de colaboradores (Sarai y Karen)

Este documento describe el proceso paso a paso para dar acceso a colaboradores
con roles sensibles (analista y operaciones) en Tu Prestamo usando Supabase.

## Conceptos clave
- Los roles sensibles se guardan en `auth.users.raw_app_meta_data.role`.
- El rol en `app_metadata` es seguro (el usuario no puede modificarlo).
- El rol se aplica solo si el email esta en la allowlist `public.role_allowlist`.

## Paso 0: Requisitos previos
- Debes estar logueado como admin en Supabase.
- Los colaboradores deben crear su cuenta con su email oficial.
- Cuando terminen de registrarse, deben cerrar sesion e iniciar sesion otra vez
  despues de asignar el rol (para refrescar el JWT).

## Paso 1: Agregar a la allowlist (lista blanca)
Abre Supabase -> SQL Editor -> New Query y pega:

```sql
insert into public.role_allowlist (email, role)
values
  ('SARAI_EMAIL_AQUI', 'analista'),
  ('KAREN_EMAIL_AQUI', 'ops');
```

Notas:
- Reemplaza los emails por los reales.
- Roles validos: `admin`, `ops`, `analista`.

## Paso 2: Aplicar el rol si ya crearon cuenta
Si Sarai o Karen ya se registraron, aplica el rol manualmente:

```sql
select public.apply_role_from_allowlist(id)
from auth.users
where email in ('SARAI_EMAIL_AQUI', 'KAREN_EMAIL_AQUI');
```

Si aun no se registraron, no pasa nada: el trigger lo aplicara automaticamente
cuando creen su cuenta.

## Paso 3: Verificar que el rol quedo aplicado
Ejecuta:

```sql
select
  id,
  email,
  raw_app_meta_data
from auth.users
where email in ('SARAI_EMAIL_AQUI', 'KAREN_EMAIL_AQUI');
```

En `raw_app_meta_data` debe aparecer `"role":"analista"` o `"role":"ops"`.

## Paso 4: Pedirles que vuelvan a iniciar sesion
Una vez aplicado el rol, ellos deben cerrar sesion e iniciar sesion para que el
token (JWT) incluya el nuevo rol.

## Paso 5: Revocar acceso si es necesario
Si necesitas quitar el rol:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email in ('SARAI_EMAIL_AQUI', 'KAREN_EMAIL_AQUI');
```

Opcional: elimina de la allowlist para que no se reasigne automaticamente:

```sql
delete from public.role_allowlist
where email in ('SARAI_EMAIL_AQUI', 'KAREN_EMAIL_AQUI');
```

## Paso 6: Auditoria (opcional, recomendado)
Puedes revisar a quien se le asigno rol y cuando:

```sql
select *
from public.role_grants
order by granted_at desc;
```
