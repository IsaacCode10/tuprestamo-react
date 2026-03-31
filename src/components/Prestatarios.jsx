import React from 'react';

const Prestatarios = ({ onSolicitudClick }) => {
  return (
    <section id="prestatarios" className="section section--borrowers">
      <div className="container">
        <h2 className="section__title">Para Prestatarios</h2>
        <p className="section__text">
          Si tu tarjeta de cr&eacute;dito te cobra demasiado y sientes que tu deuda no baja, en Tu Pr&eacute;stamo puedes solicitar una evaluaci&oacute;n para refinanciar con condiciones m&aacute;s claras.
        </p>
        <div className="borrowers-layout">
          <div className="borrowers-list">
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">
                ✓
              </span>
              <p className="borrower-point__text">
                <strong>Pago directo a tu banco.</strong> Refinanciamos tu deuda de tarjeta sin desembolso libre a tu cuenta.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">
                ✓
              </span>
              <p className="borrower-point__text">
                <strong>Condiciones m&aacute;s claras.</strong> Conoces tu tasa, tus costos y el paso a paso antes de decidir.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">
                ✓
              </span>
              <p className="borrower-point__text">
                <strong>Proceso 100% online.</strong> Inicias tu solicitud y subes tus documentos desde tu celular.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">
                ✓
              </span>
              <p className="borrower-point__text">
                <strong>Evaluaci&oacute;n seg&uacute;n tu perfil.</strong> Analizamos tu caso para ofrecerte condiciones acordes a tu situaci&oacute;n.
              </p>
            </div>
          </div>

          <div className="borrowers-panel" aria-hidden="true">
            <div className="borrowers-panel__card">
              <span className="borrowers-panel__eyebrow">Tu tarjeta hoy</span>
              <div className="borrowers-panel__amount">Intereses altos</div>
              <div className="borrowers-panel__items">
                <span>Pago m&iacute;nimo</span>
                <span>Mantenimiento</span>
                <span>Deuda que no baja</span>
              </div>
            </div>
            <div className="borrowers-panel__outcome">
              <span className="borrowers-panel__eyebrow borrowers-panel__eyebrow--accent">Con Tu Pr&eacute;stamo</span>
              <strong>Una salida m&aacute;s clara</strong>
              <p>Refinancias tu deuda con pago directo al banco y condiciones que entiendes antes de decidir.</p>
            </div>
          </div>
        </div>

        <div className="button-container borrowers-cta">
          <p className="cta-text">Solicita tu evaluaci&oacute;n sin compromiso.</p>
          <div className="borrowers-cta__actions">
            <button className="btn btn--secondary" onClick={() => onSolicitudClick('prestatario')}>
              Solicitar evaluaci&oacute;n
            </button>
            <a className="btn btn--primary" href="/calculadora">
              Calculadora de Ahorro
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Prestatarios;
