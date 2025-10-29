import React, { useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { z } from 'zod';
import { trackEvent } from '@/analytics.js';
import './Modal.css';

const InvestorInterestForm = ({ onClose, role }) => {
  const departamentos = useMemo(() => ([
    'La Paz','Cochabamba','Santa Cruz','Chuquisaca','Oruro','Potosí','Tarija','Beni','Pando'
  ]), []);

  const schema = useMemo(() => z.object({
    nombre_completo: z.string().trim().min(3, 'El nombre es demasiado corto'),
    email: z.string().trim().email('Ingresa un correo válido'),
    telefono: z.string()
      .transform(v => v.replace(/[^0-9]/g, ''))
      .refine(v => v.length >= 7 && v.length <= 12, 'Ingresa un número válido (solo dígitos)'),
    departamento: z.enum(['La Paz','Cochabamba','Santa Cruz','Chuquisaca','Oruro','Potosí','Tarija','Beni','Pando'], {
      errorMap: () => ({ message: 'Selecciona un departamento' })
    })
  }), []);

  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
    departamento: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'telefono') {
      v = value.replace(/[^0-9]/g, '');
    }
    setFormData((prev) => ({ ...prev, [name]: v }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validación KYC mínima (similar a prestatario, pero versión corta)
    const parsed = schema.safeParse({
      nombre_completo: formData.nombre_completo,
      email: formData.email,
      telefono: formData.telefono,
      departamento: formData.departamento,
    });

    if (!parsed.success) {
      const fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path?.[0];
        if (k) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        nombre_completo: parsed.data.nombre_completo,
        email: parsed.data.email,
        telefono: parsed.data.telefono,
        departamento: parsed.data.departamento,
        tipo_solicitud: role, // 'inversionista'
      };
      const { error } = await supabase.from('solicitudes').insert(payload);
      
      if (error) throw error;

      // Analítica
      trackEvent('Submitted Investor Interest', { departamento: payload.departamento });

      setMessage('¡Gracias por tu interés! Pronto nos pondremos en contacto contigo.');
      setFormData({
        nombre_completo: '',
        email: '',
        telefono: '',
        departamento: '',
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
            <input
              type="text"
              id="nombre_completo"
              name="nombre_completo"
              value={formData.nombre_completo}
              onChange={handleChange}
              required
              autoComplete="name"
            />
            {errors.nombre_completo && <small className="form-error-message">{errors.nombre_completo}</small>}
          </div>
          <div>
            <label htmlFor="email">Correo Electrónico:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              inputMode="email"
            />
            {errors.email && <small className="form-error-message">{errors.email}</small>}
          </div>
          <div>
            <label htmlFor="telefono">Número de celular (WhatsApp):</label>
            <input
              type="tel"
              id="telefono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              required
              inputMode="numeric"
              pattern="[0-9]{7,12}"
              placeholder="Solo números"
              autoComplete="tel"
            />
            {errors.telefono && <small className="form-error-message">{errors.telefono}</small>}
          </div>
          <div>
            <label htmlFor="departamento">Departamento de Residencia en Bolivia:</label>
            <select
              id="departamento"
              name="departamento"
              value={formData.departamento}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Selecciona un departamento</option>
              {departamentos.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
            {errors.departamento && <small className="form-error-message">{errors.departamento}</small>}
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
