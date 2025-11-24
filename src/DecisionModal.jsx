import React, { useState, useEffect } from 'react';
import './DecisionModal.css';

const REJECTION_REASONS = [
  'Nivel de endeudamiento elevado (DTI)',
  'Información de ingresos insuficiente o no verificable',
  'Verificación de identidad fallida',
  'Antigüedad laboral no cumple el mínimo',
  'Historial crediticio desfavorable (reporte Gestora)',
  'Documentación incompleta o inconsistente',
  'Otros (especificar en notas)',
];

// Nuevas razones estructuradas para APROBACIÓN
const APPROVAL_REASONS = [
  'Excelente historial de ingresos',
  'Bajo nivel de endeudamiento (DTI)',
  'Antigüedad laboral y estabilidad demostrada',
  'Score de Confianza muy alto',
  'Verificación de documentos exitosa y consistente',
];

const DecisionModal = ({ isOpen, onClose, onSubmit, profile, decisionType }) => {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [motivosAprobacion, setMotivosAprobacion] = useState([]);
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setMotivoRechazo(decisionType === 'Rechazado' ? REJECTION_REASONS[0] : '');
      setMotivosAprobacion([]);
      setNotas('');
    }
  }, [isOpen, decisionType]);

  if (!isOpen) {
    return null;
  }

  const handleApprovalReasonChange = (reason) => {
    setMotivosAprobacion(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason) 
        : [...prev, reason]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let motivo;
      if (decisionType === 'Rechazado') {
        motivo = motivoRechazo; // string
      } else {
        // Guardamos los motivos de aprobación como array de strings (no JSON string)
        motivo = motivosAprobacion;
      }

      await onSubmit({
        profileId: profile.id,
        decision: decisionType,
        motivo: motivo,
        notas,
      });
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRechazo = decisionType === 'Rechazado';
  const title = isRechazo ? 'Rechazar Préstamo' : 'Aprobar Préstamo';
  const confirmButtonClass = isRechazo ? 'rechazar' : 'aprobar';
  const canSubmit = isRechazo || motivosAprobacion.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className={`modal-header ${confirmButtonClass}`}>
            <h2>{title}</h2>
            <button type="button" className="modal-close-button" onClick={onClose}>&times;</button>
          </div>

          <div className="modal-body">
            <p>
              Estás a punto de <strong>{title.toLowerCase()}</strong> para <strong>{profile?.nombre_completo || 'N/A'}</strong>.
              Por favor, proporciona una justificación.
            </p>

            {isRechazo ? (
              <div className="form-group">
                <label htmlFor="motivo">Motivo del Rechazo (Obligatorio)</label>
                <select id="motivo" value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} required>
                  {REJECTION_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label>Indicadores Clave de Aprobación (Selecciona al menos uno)</label>
                <div className="checkbox-group">
                  {APPROVAL_REASONS.map(reason => (
                    <div key={reason} className="checkbox-item">
                      <input 
                        type="checkbox" 
                        id={reason} 
                        value={reason} 
                        checked={motivosAprobacion.includes(reason)}
                        onChange={() => handleApprovalReasonChange(reason)}
                      />
                      <label htmlFor={reason}>{reason}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="notas">Notas Adicionales</label>
              <textarea 
                id="notas" 
                rows="4" 
                placeholder={isRechazo ? 'Detalles adicionales sobre el motivo del rechazo...' : 'Comentarios adicionales sobre la aprobación...'}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className={`btn-modal btn-confirm ${confirmButtonClass}`} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Procesando...' : `Confirmar ${decisionType}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DecisionModal;
