import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import './Modal.css';

const InvestorInterestForm = ({ onClose, role }) => {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
    ciudad: '',
    // Puedes añadir más campos específicos para inversionistas aquí si los tienes
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.from('solicitudes').insert({
        ...formData,
        tipo_solicitud: role, // 'inversionista'
      });

      if (error) throw error;

      setMessage('¡Gracias por tu interés! Pronto nos pondremos en contacto contigo.');
      setFormData({
        nombre_completo: '',
        email: '',
        telefono: '',
        ciudad: '',
      });
    } catch (error) {
      setMessage('Error al enviar tu interés: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        <h2>Formulario de Interés para Inversionistas</h2>
        <form onSubmit={handleSubmit}>
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

          <button type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Interés'}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}
      </div>
    </div>
  );
};

export default InvestorInterestForm;