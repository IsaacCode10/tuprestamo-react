import React, { useState } from 'react';
import { supabase } from '@/supabaseClient';
import InteractiveForm from '@/components/InteractiveForm.jsx'; // Importamos el nuevo componente
import '@/Modal.css';

// Definimos las preguntas para el formulario de prestatario
const borrowerQuestions = [
  { id: 1, texto: '¡Hola! Para empezar, ¿cuál es tu nombre completo?', tipo: 'text', clave: 'nombre_completo', required: true },
  { id: 2, texto: 'Gracias. Ahora, tu correo electrónico.', tipo: 'email', clave: 'email', required: true, validation: { regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, errorMessage: 'Por favor, introduce un correo electrónico válido.' } },
  { id: 3, texto: '¿Y tu número de celular (WhatsApp)?', tipo: 'tel', clave: 'telefono', required: true },
  { id: 4, texto: '¿En qué departamento de Bolivia resides?', tipo: 'select', clave: 'departamento', required: true, opciones: [
      { value: 'La Paz', label: 'La Paz' },
      { value: 'Cochabamba', label: 'Cochabamba' },
      { value: 'Santa Cruz', label: 'Santa Cruz' },
      { value: 'Chuquisaca', label: 'Chuquisaca' },
      { value: 'Oruro', label: 'Oruro' },
      { value: 'Potosí', label: 'Potosí' },
      { value: 'Tarija', label: 'Tarija' },
      { value: 'Beni', label: 'Beni' },
      { value: 'Pando', label: 'Pando' },
  ] },
  { id: 5, texto: 'Perfecto. ¿Cuál es tu número de Cédula de Identidad?', tipo: 'text', clave: 'cedula_identidad', required: true, validation: { regex: /^\d{5,8}(-[A-Z]{2})?$/, errorMessage: 'Introduce un CI válido (ej: 1234567 o 1234567-LP).' } },
  { id: 6, texto: '¿Tu fecha de nacimiento?', tipo: 'date', clave: 'fecha_nacimiento', required: true, validation: { regex: /^\d{4}-\d{2}-\d{2}$/, errorMessage: 'Por favor, introduce una fecha válida.' } },
  { id: 7, texto: '¿Cuál es tu situación laboral actual?', tipo: 'select', clave: 'situacion_laboral', required: true, opciones: [
      { value: 'Dependiente', label: 'Dependiente' },
      { value: 'Independiente', label: 'Independiente' },
      { value: 'Jubilado', label: 'Jubilado' },
      { value: 'Otro', label: 'Otro' },
  ]},
  { id: 8, texto: 'Entendido. ¿Nombre de tu empresa o a qué te dedicas?', tipo: 'text', clave: 'nombre_empresa' },
  { id: 9, texto: '¿Cuántos meses de antigüedad tienes en tu trabajo o actividad actual?', tipo: 'number', clave: 'antiguedad_laboral', required: true },
  { id: 10, texto: '¿Cuál es tu ingreso mensual promedio (neto) en Bolivianos (Bs)?', tipo: 'number', clave: 'ingreso_mensual', required: true },
  { id: 11, texto: 'Ahora, sobre tus tarjetas de crédito. ¿En qué banco(s) las tienes?', tipo: 'text', clave: 'bancos_deuda' },
  { id: 12, texto: '¿Cuál es el saldo total aproximado de tu deuda en esas tarjetas? (en Bs)', tipo: 'number', clave: 'saldo_deuda_tc', required: true },
  { id: 13, texto: '¿Recuerdas la tasa de interés anual que pagas? (ej. 24 para 24%)', tipo: 'number', clave: 'tasa_interes_tc', required: true },
  { 
    id: 14, 
    texto: '¿Qué monto te gustaría refinanciar con nosotros? (en Bs)', 
    tipo: 'number', 
    clave: 'monto_solicitado', 
    required: true,
    validation: {
      min: 5000,
      max: 70000,
      errorMessage: 'El monto debe estar entre 5,000 Bs. y 70,000 Bs.'
    } 
  },
  { id: 15, texto: '¿En qué plazo te gustaría pagarlo?', tipo: 'select', clave: 'plazo_meses', required: true, opciones: [
      { value: '12', label: '12 meses' },
      { value: '18', label: '18 meses' },
      { value: '24', label: '24 meses' },
  ]},
  { id: 17, texto: 'Para evaluar tu solicitud, necesitamos tu autorización para consultar tu historial en Infocred.', tipo: 'checkbox', clave: 'autoriza_infocred' },
  { id: 18, texto: 'Finalmente, ¿aceptas que te contactemos por WhatsApp o email para dar seguimiento a tu solicitud?', tipo: 'checkbox', clave: 'acepta_contacto', required: true },
];


const LoanRequestForm = ({ onClose, role }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFormSubmit = async (answers) => {
    setLoading(true);
    setError(null);

    const parseToNumberOrNull = (value) => {
      if (value === '' || value === null || value === undefined) return null;

      // Sanitize the input: remove anything that is not a digit or a dot.
            const cleanedValue = String(value).replace(/[^0-9.]/g, '');

      if (cleanedValue === '') return null;

      const parsed = parseFloat(cleanedValue);
      return isNaN(parsed) ? null : parsed;
    };

    const dataToInsert = {
      ...answers,
      tipo_solicitud: role,
      estado: 'pendiente', // El estado ahora es pendiente, la Edge Function decidirá
      ingreso_mensual: parseToNumberOrNull(answers.ingreso_mensual),
      saldo_deuda_tc: parseToNumberOrNull(answers.saldo_deuda_tc),
      tasa_interes_tc: parseToNumberOrNull(answers.tasa_interes_tc),
      monto_solicitado: parseToNumberOrNull(answers.monto_solicitado),
      plazo_meses: parseToNumberOrNull(answers.plazo_meses),
      antiguedad_laboral: parseToNumberOrNull(answers.antiguedad_laboral),
    };

    try {
      const { error: insertError } = await supabase.from('solicitudes').insert(dataToInsert);

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);

    } catch (error) {
      setError('Hubo un problema al enviar tu solicitud. Por favor, inténtalo de nuevo más tarde.');
      console.error('Error submitting form:', error.message);
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
            />
        )}
      </div>
    </div>
  );
};

export default LoanRequestForm;