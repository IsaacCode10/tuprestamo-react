import React from 'react';

const Inversionistas = ({ onSolicitudClick }) => {
  return (
    <section id="inversionistas" className="section section--light-alt section--compact">
      <div className="container">
        <h2 className="section__title">Para Inversionistas</h2>
        <p className="section__text">
          Si eres inversionista en Bolivia y estás cansado del 3.5 % de los DPFs, Tu Préstamo te ofrece retornos atractivos con una cartera de bajo riesgo.
        </p>
        <ul className="features-list">
          <li className="features-list__item">
            Rendimiento Competitivo: Nuestra plataforma te da acceso a préstamos con un rendimiento del 12 % anual.
          </li>
          <li className="features-list__item">
            Inversión segura: Minimizamos el riesgo enfocándonos exclusivamente en prestatarios de alto perfil crediticio que buscan refinanciar deudas tóxicas.
          </li>
          <li className="features-list__item">
            Interés Compuesto: Haz crecer tu capital de forma acelerada al reinvertir los pagos mensuales que recibes. Es la fórmula perfecta para que tu dinero trabaje por ti.
          </li>
          <li className="features-list__item">
            Protección de tu capital con Seguro de Desgravamen.
          </li>
        </ul>
        <div className="button-container">
          <p className="cta-text">¡Regístrate como inversionista y conoce las oportunidades!</p>
          {/* BOTÓN QUE ABRE EL MODAL */}
          <button className="btn btn--primary" onClick={() => onSolicitudClick('inversionista')}>
            Ver Oportunidades
          </button>
        </div>
      </div>
    </section>
  );
};

export default Inversionistas;
