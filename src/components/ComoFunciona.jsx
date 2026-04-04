import React from 'react';
import './ComoFunciona.css';

const ComoFunciona = () => {
  return (
    <section id="como-funciona" className="section section--white section--compact">
      <div className="container">
        <h2 className="section__title">&iquest;C&oacute;mo funciona?</h2>
        <p className="section__text">
          Solicita tu evaluaci&oacute;n, revisa tu oferta y paga la deuda de tu tarjeta con condiciones m&aacute;s claras.
        </p>
        <div className="steps-row">
          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">1</span>
              <span className="step-card__icon" aria-hidden>📝</span>
            </div>
            <h3 className="step-card__title">Solicita tu evaluaci&oacute;n</h3>
            <p className="step-card__text">
              Completa tu solicitud online con tu deuda estimada e ingresos.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">2</span>
              <span className="step-card__icon" aria-hidden>✅</span>
            </div>
            <h3 className="step-card__title">Revisamos tu informaci&oacute;n</h3>
            <p className="step-card__text">
              Revisamos tus documentos y confirmamos el saldo real de tu tarjeta.
            </p>
          </div>
        </div>

        <div className="steps-row steps-row--centered">
          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">3</span>
              <span className="step-card__icon" aria-hidden>🏦</span>
            </div>
            <h3 className="step-card__title">Te mostramos tu oferta</h3>
            <p className="step-card__text">
              Ves tu cuota, plazo y condiciones de forma clara antes de decidir.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">4</span>
              <span className="step-card__icon" aria-hidden>💳</span>
            </div>
            <h3 className="step-card__title">Pagamos directo a tu banco</h3>
            <p className="step-card__text">
              El pago se hace directo a la entidad acreedora para ayudarte a ordenar tu deuda.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComoFunciona;


