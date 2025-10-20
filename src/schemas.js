import { z } from 'zod';

// Esquema para el formulario de solicitud de préstamo (prestatario)
export const solicitudPrestatarioSchema = z.object({
  nombre_completo: z.string().min(3, "El nombre es demasiado corto"),
  email: z.string().email("El correo electrónico no es válido"),
  telefono: z.string().min(7, "El número de teléfono no es válido"),
  departamento: z.enum(['La Paz', 'Cochabamba', 'Santa Cruz', 'Chuquisaca', 'Oruro', 'Potosí', 'Tarija', 'Beni', 'Pando'], { errorMap: () => ({ message: "Debes seleccionar un departamento." }) }),
  cedula_identidad: z.string().regex(/^[0-9]{5,9}(?:-[A-Z0-9]{1,2})?$/, "Cédula de identidad no válida para Bolivia (ej: 1234567 o 1234567-LP)"),
  fecha_nacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato AAAA-MM-DD"),
  situacion_laboral: z.enum(['Dependiente', 'Independiente', 'Jubilado', 'Otro'], { errorMap: () => ({ message: "Debes seleccionar una situación laboral." }) }),
  nombre_empresa: z.string().optional(),
  antiguedad_laboral: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "La antigüedad debe ser un número." }).min(0, "La antigüedad no puede ser negativa")
  ),
  ingreso_mensual: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "El ingreso debe ser un número." }).min(1, "El ingreso debe ser mayor a cero")
  ),
  bancos_deuda: z.string().optional(),
  saldo_deuda_tc: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "El saldo debe ser un número." }).min(5000, "El saldo mínimo es 5,000 Bs.").max(70000, "El saldo máximo es 70,000 Bs.")
  ),
  tasa_interes_tc: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "La tasa debe ser un número." }).min(1, "La tasa de interés no es válida").max(100, "La tasa de interés es demasiado alta")
  ),
  monto_solicitado: z.preprocess(
    (val) => Number(String(val).replace(/[^0-9.]/g, '')),
    z.number({ invalid_type_error: "El monto debe ser un número." }).min(5000, "El monto mínimo es 5,000 Bs.").max(70000, "El monto máximo es 70,000 Bs.")
  ),
  plazo_meses: z.enum(['12', '18', '24'], { errorMap: () => ({ message: "Debes seleccionar un plazo." }) }),
  autoriza_infocred: z.boolean().optional(),
  acepta_contacto: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar que te contactemos para continuar." }),
  }),
});

// Esquema para la actualización de datos del perfil
export const profileUpdateSchema = z.object({
    telefono: z.string().min(7, "El número de teléfono no es válido"),
});
