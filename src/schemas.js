import { z } from 'zod';

// Esquema para el formulario de solicitud de préstamo (prestatario)
export const solicitudPrestatarioSchema = z.object({
  nombre_completo: z.string().min(3, "El nombre es demasiado corto"),
  email: z.string().email("El correo electrónico no es válido"),
  telefono: z.string().min(7, "El número de teléfono no es válido"),
  cedula_identidad: z.string().regex(/^[0-9]{5,9}(?:-[A-Z0-9]{1,2})?$/, "Cédula de identidad no válida para Bolivia (ej: 1234567 o 1234567-LP)"),
  situacion_laboral: z.enum(['Dependiente', 'Independiente', 'Jubilado', 'Otro'], { errorMap: () => ({ message: "Debes seleccionar una situación laboral." }) }),
  antiguedad_laboral: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "La antigüedad debe ser un número." }).min(0, "La antigüedad no puede ser negativa")
  ),
  ingreso_mensual: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "El ingreso debe ser un número." }).min(1, "El ingreso debe ser mayor a cero")
  ),
  saldo_deuda_tc: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "El saldo debe ser un número." }).min(5000, "El saldo mínimo es 5,000 Bs.").max(70000, "El saldo máximo es 70,000 Bs.")
  ),
  tasa_interes_tc: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "La tasa debe ser un número." }).min(1, "La tasa de interés no es válida").max(100, "La tasa de interés es demasiado alta")
  ),
  plazo_meses: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9]/g, '')),
    z.union([z.literal(12), z.literal(24), z.literal(36), z.literal(48)], {
      errorMap: () => ({ message: "Debes seleccionar un plazo válido (12, 24, 36 o 48 meses)." }),
    })
  ),
});

// Esquema para la actualización de datos del perfil
export const profileUpdateSchema = z.object({
    telefono: z.string().min(7, "El número de teléfono no es válido"),
});
