import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { trackEvent } from '@/analytics.js';
import InteractiveForm from '@/components/InteractiveForm.jsx'; // Importamos el nuevo componente
import { solicitudPrestatarioSchema } from '@/schemas.js'; // Importamos el esquema de validación
import '@/Modal.css';

// Definimos las preguntas para el formulario de prestatario
const borrowerQuestions = [
  { id: 1, texto: '¿Hola! Para empezar, ¿cuál es tu nombre completo?', tipo: 'text', clave: 'nombre_completo', required: true },
  { id: 2, texto: 'Gracias. Ahora, tu correo electrónico.', tipo: 'email', clave: 'email', required: true, validation: { regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, errorMessage: 'Por favor, introduce un correo electrónico válido.' } },
  { id: 3, texto: '¿Y tu número de celular (WhatsApp)?', tipo: 'tel', clave: 'telefono', required: true },
  { id: 4, texto: 'Perfecto. ¿Cuál es tu número de Cédula de Identidad?', tipo: 'text', clave: 'cedula_identidad', required: true, validation: { regex: /^\d{5,8}(-[A-Z]{2})?$/, errorMessage: 'Introduce un CI válido (ej: 1234567 o 1234567-LP).' } },
  { id: 5, texto: '¿Cuál es tu situación laboral actual?', tipo: 'select', clave: 'situacion_laboral', required: true, opciones: [
      { value: 'Dependiente', label: 'Dependiente' },
      { value: 'Independiente', label: 'Independiente' },
      { value: 'Jubilado', label: 'Jubilado' },
      { value: 'Otro', label: 'Otro' },
  ] },
  { id: 6, texto: '¿Cuántos meses de antigüedad tienes en tu trabajo o actividad actual?', tipo: 'number', clave: 'antiguedad_laboral', required: true },
  { id: 7, texto: '¿Cuál es tu ingreso mensual promedio (neto) en Bolivianos (Bs)?', tipo: 'number', clave: 'ingreso_mensual', required: true },
  { id: 8, texto: '¿Cuál es el saldo total aproximado de tu deuda en tarjetas de crédito? (en Bs)', tipo: 'number', clave: 'saldo_deuda_tc', required: true, validation: { min: 5000, max: 70000, errorMessage: 'El saldo debe estar entre 5,000 Bs. y 70,000 Bs.' }, helperText: 'Monto mínimo: 5,000 Bs. y máximo: 70,000 Bs.' },
  { id: 9, texto: '¿Recuerdas la tasa de interés anual que pagas? (ej. 24 para 24%)', tipo: 'number', clave: 'tasa_interes_tc', required: true },
];



const LoanRequestForm = ({ onClose, role }) => {
  // Analítica centralizada via trackEvent

  // Capturamos el evento cuando el componente se monta
  useEffect(() => {
    trackEvent('Viewed Loan Application Form');
  }, );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFormSubmit = async (answers) => {
    setLoading(true);
    setError(null);

    // Zod ya nos entrega los datos parseados, por lo que esta función es menos necesaria,
    // pero la mantenemos como un fallback de saneamiento.
    const parseToNumberOrNull = (value) => {
      if (value === '' || value === null || value === undefined) return null;
      const cleanedValue = String(value).replace(/[^0-9.]/g, '');
      if (cleanedValue === '') return null;
      const parsed = parseFloat(cleanedValue);
      return isNaN(parsed) ? null : parsed;
    };

    const dataToInsert = {
      ...answers,
      tipo_solicitud: role,
      estado: 'pendiente',
      // Aseguramos que los campos numéricos sean números
      ingreso_mensual: parseToNumberOrNull(answers.ingreso_mensual),
      saldo_deuda_tc: parseToNumberOrNull(answers.saldo_deuda_tc),
      tasa_interes_tc: parseToNumberOrNull(answers.tasa_interes_tc),
      antiguedad_laboral: parseToNumberOrNull(answers.antiguedad_laboral),
      autoriza_infocred: true,
      acepta_contacto: true,
      departamento: null,
      fecha_nacimiento: null,
      nombre_empresa: null,
      bancos_deuda: null,
      monto_solicitado: null,
      plazo_meses: null,
    };

    try {
      const { error: insertError } = await supabase.from('solicitudes').insert(dataToInsert);

      if (insertError) {
        throw insertError;
      }

      // Evento de analítica: Solicitud enviada con éxito
      trackEvent('Submitted Loan Application', {
        monthly_income: dataToInsert.ingreso_mensual,
        total_debt: dataToInsert.saldo_deuda_tc,
        tenure_months: dataToInsert.antiguedad_laboral,
      });

      setSuccess(true);

    } catch (error) {
      console.error('Error submitting form:', error);

      // --- NUEVO MANEJO DE ERRORES ESPECÍFICOS ---
      if (error.code === '23505') { // Código de error para violación de unicidad
        if (error.message.includes('solicitudes_cedula_identidad_key')) {
          setError('El número de Cédula de Identidad ya está registrado en una solicitud.');
        } else if (error.message.includes('solicitudes_email_key')) {
          setError('El correo electrónico ya está registrado en una solicitud.');
        } else if (error.message.includes('solicitudes_telefono_key')) {
          setError('El número de teléfono ya está registrado en una solicitud.');
        } else {
          setError('Ya existe una solicitud con algunos de los datos introducidos.');
        }
      } else {
        setError('Hubo un problema al enviar tu solicitud. Por favor, inténtalo de nuevo más tarde.');
      }
      // --- FIN MANEJO DE ERRORES ---

    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay">
        <div className="modal-content modal-content--success">
          <h2 className="success-title">¡Solicitud Enviada!</h2>
          <p className="success-message">¡Excelente! Hemos recibido tu solicitud. Nuestro sistema ya está procesando tu información para pre-aprobar tu nuevo crédito. Mantente atento a tu correo electrónico, te notificaremos los siguientes pasos. ¡Estás más cerca de una mejor salud financiera!</p>
          <button onClick={onClose} className="btn btn--primary">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}><b>X</b></button>
        <h2>Solicitud para Prestatarios</h2>
        
        {loading && <p>Enviando...</p>}
        {error && <p className="form-error-message">{error}</p>}

        {!loading && (
            <InteractiveForm
                questions={borrowerQuestions}
                onSubmit={handleFormSubmit}
                schema={solicitudPrestatarioSchema} // Pasamos el esquema como prop
            />
        )}
      </div>
    </div>
  );
};

export default LoanRequestForm;

