import React from 'react';
import './ComoFunciona.css';

const ComoFunciona = () => {
  return (
    <section id="como-funciona" className="section section--white section--compact">
      <div className="container">
        <h2 className="section__title">&iquest;C&oacute;mo funciona para salir de la deuda de tu tarjeta?</h2>
        <p className="section__text">
          As&iacute; funciona el proceso para solicitar una evaluaci&oacute;n, recibir una oferta y
          pagar la deuda de tu tarjeta de cr&eacute;dito con condiciones m&aacute;s claras.
        </p>
        <div className="steps-row">
          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">1</span>
              <span className="step-card__icon" aria-hidden>📝</span>
            </div>
            <h3 className="step-card__title">Solicita tu evaluaci&oacute;n</h3>
            <p className="step-card__text">
              Completa tu solicitud online con tu deuda estimada e ingresos. En pocos pasos sabr&aacute;s
              si tu perfil puede avanzar en el proceso.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">2</span>
              <span className="step-card__icon" aria-hidden>✅</span>
            </div>
            <h3 className="step-card__title">Revisamos tu informaci&oacute;n</h3>
            <p className="step-card__text">
              Revisamos tus documentos y confirmamos el saldo real de tu tarjeta. Con eso definimos
              tu tasa y las condiciones finales de tu oferta.
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
              Antes de decidir, ves tu cuota estimada, plazo y condiciones de forma clara para saber
              si realmente te conviene seguir.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">4</span>
              <span className="step-card__icon" aria-hidden>💳</span>
            </div>
            <h3 className="step-card__title">Pagamos directo a tu banco</h3>
            <p className="step-card__text">
              Cuando tu solicitud se concreta, el pago se realiza directo a la entidad acreedora para
              ayudarte a salir de la deuda de tu tarjeta con una cuota mensual m&aacute;s ordenada.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComoFunciona;


