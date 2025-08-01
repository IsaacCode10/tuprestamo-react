import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './Modal.css';

const LoanRequestForm = ({ onClose, role }) => {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    cedula_identidad: '',
    fecha_nacimiento: '',
    telefono: '',
    ciudad: '',
    situacion_laboral: '',
    nombre_empresa: '',
    antiguedad_laboral: '',
    ingreso_mensual: '',
    bancos_deuda: '',
    saldo_deuda_tc: '',
    tasa_interes_tc: '',
    monto_solicitado: '',
    autoriza_infocred: false,
    acepta_contacto: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // --- INICIO DE LA CORRECCIÓN ---
    // Función para convertir a número o null si está vacío
    const parseToNumberOrNull = (value) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    };

    const dataToInsert = {
      ...formData,
      tipo_solicitud: role, // 'prestatario'
      ingreso_mensual: parseToNumberOrNull(formData.ingreso_mensual),
      saldo_deuda_tc: parseToNumberOrNull(formData.saldo_deuda_tc),
      tasa_interes_tc: parseToNumberOrNull(formData.tasa_interes_tc),
      monto_solicitado: parseToNumberOrNull(formData.monto_solicitado),
    };
    // --- FIN DE LA CORRECCIÓN ---

    try {
      // Usamos la variable con los datos limpios
      const { error } = await supabase.from('solicitudes').insert(dataToInsert);

      if (error) throw error;

      setMessage('¡Solicitud enviada con éxito! Pronto nos pondremos en contacto contigo.');
      // Limpiamos el formulario (código existente)
      setFormData({
        nombre_completo: '',
        email: '',
        cedula_identidad: '',
        fecha_nacimiento: '',
        telefono: '',
        ciudad: '',
        situacion_laboral: '',
        nombre_empresa: '',
        antiguedad_laboral: '',
        ingreso_mensual: '',
        bancos_deuda: '',
        saldo_deuda_tc: '',
        tasa_interes_tc: '',
        monto_solicitado: '',
        autoriza_infocred: false,
        acepta_contacto: false,
      });
    } catch (error) {
      setMessage('Error al enviar la solicitud: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <h2>Solicitud para Prestatarios</h2>
        <form onSubmit={handleSubmit}>
          {/* El resto del JSX del formulario no cambia */}
          <div>
            <label htmlFor="nombre_completo">Nombre Completo:</label>
            <input type="text" id="nombre_completo" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="email">Correo Electrónico:</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="telefono">Número de celular (WhatsApp):</label>
            <input type="tel" id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="ciudad">Ciudad de Residencia en Bolivia:</label>
            <input type="text" id="ciudad" name="ciudad" value={formData.ciudad} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="cedula_identidad">Número de Cédula de Identidad:</label>
            <input type="text" id="cedula_identidad" name="cedula_identidad" value={formData.cedula_identidad} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="fecha_nacimiento">Fecha de Nacimiento:</label>
            <input type="date" id="fecha_nacimiento" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="situacion_laboral">¿Cuál es tu situación laboral actual?</label>
            <select id="situacion_laboral" name="situacion_laboral" value={formData.situacion_laboral} onChange={handleChange} required>
              <option value="">Selecciona...</option>
              <option value="Dependiente">Dependiente</option>
              <option value="Independiente">Independiente</option>
              <option value="Jubilado">Jubilado</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div>
            <label htmlFor="nombre_empresa">Nombre de la Empresa o Descripción de tu Actividad Principal (si eres independiente):</label>
            <input type="text" id="nombre_empresa" name="nombre_empresa" value={formData.nombre_empresa} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="antiguedad_laboral">Antigüedad Laboral / Tiempo en tu Actividad Actual:</label>
            <input type="text" id="antiguedad_laboral" name="antiguedad_laboral" value={formData.antiguedad_laboral} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="ingreso_mensual">Ingreso Mensual Promedio (Neto) en Bolivianos (Bs):</label>
            <input type="number" id="ingreso_mensual" name="ingreso_mensual" value={formData.ingreso_mensual} onChange={handleChange} required />
          </div>
          <div>
            <label htmlFor="bancos_deuda">¿En qué banco(s) tienes tu(s) tarjeta(s) de crédito con deuda?</label>
            <input type="text" id="bancos_deuda" name="bancos_deuda" value={formData.bancos_deuda} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="saldo_deuda_tc">¿Cuál es el saldo total aproximado de tu deuda en tarjeta(s) de crédito? (en Bs)</label>
            <input type="number" id="saldo_deuda_tc" name="saldo_deuda_tc" value={formData.saldo_deuda_tc} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="tasa_interes_tc">¿Cuál es la tasa de interés anual aproximada que pagas actualmente en tu(s) tarjeta(s)? (ejm. 24%)</label>
            <input type="number" id="tasa_interes_tc" name="tasa_interes_tc" value={formData.tasa_interes_tc} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="monto_solicitado">¿Qué monto te gustaría refinanciar con Tu Préstamo? (en Bs)</label>
            <input type="number" id="monto_solicitado" name="monto_solicitado" value={formData.monto_solicitado} onChange={handleChange} required />
          </div>
          <div>
            <input type="checkbox" id="autoriza_infocred" name="autoriza_infocred" checked={formData.autoriza_infocred} onChange={handleChange} />
            <label htmlFor="autoriza_infocred">Autorizo a Tu Préstamo a consultar mi historial crediticio en Infocred para la evaluación de mi solicitud.</label>
          </div>
          <div>
            <input type="checkbox" id="acepta_contacto" name="acepta_contacto" checked={formData.acepta_contacto} onChange={handleChange} required />
            <label htmlFor="acepta_contacto">Acepto que Tu Préstamo se ponga en contacto conmigo vía WhatsApp o correo electrónico para dar seguimiento a mi solicitud.</label>
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}
      </div>
    </div>
  );
};

export default LoanRequestForm;