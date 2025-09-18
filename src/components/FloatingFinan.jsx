import React, { useState, useEffect } from 'react';
import './FloatingFinan.css';
import RobotAvatar from '@/assets/robot-avatar.svg';

// Lista de Preguntas Frecuentes. Fácil de editar aquí.
const faqs = [
  {
    question: '¿Qué es la Tasa Anual Asignada?',
    answer: 'Es el costo que pagas por tu crédito cada año, expresado como un porcentaje. No incluye otros gastos como comisiones o seguros.'
  },
  {
    question: '¿Qué incluye la Cuota Mensual?',
    answer: 'Tu cuota mensual es un promedio que incluye el pago del capital que te prestamos, los intereses, el costo administrativo mensual y el seguro de desgravamen.'
  },
  {
    question: '¿Por qué debo subir mis documentos?',
    answer: 'Necesitamos verificar tu identidad y tu capacidad de pago para poder darte la aprobación final de tu préstamo. ¡Es el último paso!'
  },
  {
    question: '¿Mis documentos están seguros?',
    answer: 'Sí, tu información es confidencial y está protegida. Solo la usamos para el análisis de tu crédito.'
  }
];

const FloatingFinan = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Muestra el Call to Action después de 3 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) {
        setShowCta(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const toggleFinan = () => {
    setIsOpen(!isOpen);
    setShowCta(false); // Oculta el CTA cuando se abre la ventana
  };

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="floating-finan-container">
      {showCta && !isOpen && (
        <div className="finan-cta-bubble">
          ¿Necesitas ayuda?
        </div>
      )}
      <button onClick={toggleFinan} className="finan-fab">
        <img src={RobotAvatar} alt="Asistente FINAN" />
      </button>

      {isOpen && (
        <div className="finan-chat-window">
          <div className="finan-chat-header">
            <h3>Asistente FINAN</h3>
            <button onClick={toggleFinan} className="finan-close-btn">×</button>
          </div>
          <div className="finan-chat-body">
            <p className="finan-intro-text">¡Hola! Soy FINAN. Aquí tienes respuestas a preguntas comunes.</p>
            <div className="finan-faq-list">
              {faqs.map((faq, index) => (
                <div key={index} className="finan-faq-item">
                  <button className="finan-faq-question" onClick={() => toggleFaq(index)}>
                    {faq.question}
                    <span className={`finan-faq-icon ${openFaqIndex === index ? 'open' : ''}`}>+</span>
                  </button>
                  {openFaqIndex === index && (
                    <div className="finan-faq-answer">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingFinan;
