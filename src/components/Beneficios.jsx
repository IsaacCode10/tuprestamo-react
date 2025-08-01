import React from 'react';

const Beneficios = () => {
  return (
    <section id="beneficios" className="section section--dark">
      <div className="container">
        <h2 className="section__title section__title--white">¿Por qué Tu Préstamo?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-card__icon">💰</div>
            <h3 className="benefit-card__title">Ahorra dinero cada mes</h3>
            <p className="benefit-card__text">
              Tasas justas sin Bancos. Si tienes un excelente historial de pago, te ofrecemos condiciones preferenciales.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📝</div>
            <h3 className="benefit-card__title">Proceso simple y sin papeleo</h3>
            <p className="benefit-card__text">
              Solicita tu préstamo a través de un formulario en línea y recibe una respuesta clara y rápida.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📈</div>
            <h3 className="benefit-card__title">Rendimientos atractivos</h3>
            <p className="benefit-card__text">
              Invierte en préstamos a personas con excelente historial crediticio y obtén una rentabilidad anual superior al plazo fijo.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📊</div>
            <h3 className="benefit-card__title">Accesibilidad para todos</h3>
            <p className="benefit-card__text">
              No necesitas grandes sumas de capital. Puedes empezar a construir tu portafolio de inversiones hoy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Beneficios;
