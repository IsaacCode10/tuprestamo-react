import React from 'react';

const Prestatarios = ({ onSolicitudClick }) => {
  return (
    <section id="prestatarios" className="section section--light section--compact">
      <div className="container">
        <h2 className="section__title">Para Prestatarios</h2>
        <p className="section__text">
          Si tienes tarjeta de crédito y buscas refinanciar con mejores tasas, Tu Préstamo es tu aliado. Deja de regalar tu dinero a los bancos.
        </p>
        <ul className="features-list">
          <li className="features-list__item">
            Proceso Ágil: Olvídate de la burocracia bancaria. Nuestro proceso de solicitud es en línea y rápido.
          </li>
          <li className="features-list__item">
            Ahorro Real: Las TC en Bolivia cobran tasas de interés anuales superiores al 24 % y costos de mantenimiento de más de Bs 120 al mes. Con nosotros, puedes acceder a un refinanciamiento significativamente menor.
          </li>
          <li className="features-list__item">
            Evaluación Justa: No eres solo un número en un sistema. Un analista de crédito experto revisará tu perfil para ofrecerte las mejores condiciones.
          </li>
          <li className="features-list__item">
            Transparencia: Te cobraremos una única comisión al inicio y una pequeña comisión fija de administración mensual. Sabrás el costo total desde el primer día.
          </li>
        </ul>
        <div className="button-container">
          <p className="cta-text">¡Solicita tu refinanciamiento ahora sin compromiso!</p>
          {/* BOTÓN QUE ABRE EL MODAL */}
          <button className="btn btn--secondary" onClick={() => onSolicitudClick('prestatario')}>
            Completa tu Solicitud
          </button>
        </div>
      </div>
    </section>
  );
};

export default Prestatarios;
