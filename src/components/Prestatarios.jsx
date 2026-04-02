import React from 'react';
import cerrarDeudaTarjetaImg from '../assets/images/cerrar-deuda-tarjeta-credito-bolivia.png';

const Prestatarios = ({ onSolicitudClick }) => {
  return (
    <section id="prestatarios" className="section section--borrowers">
      <div className="container">
        <h2 className="section__title">Para Prestatarios</h2>
        <div className="borrowers-layout">
          <div className="borrowers-list">
            <p className="borrowers-intro">
              <strong>Lib&eacute;rate de la deuda de tu tarjeta de cr&eacute;dito.</strong> Corta con
              los intereses altos, el mantenimiento y los pagos m&iacute;nimos que no te dejan avanzar.
            </p>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">✓</span>
              <p className="borrower-point__text">
                <strong>Pago directo a tu banco.</strong> Refinanciamos tu deuda de tarjeta sin
                desembolso libre a tu cuenta.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">✓</span>
              <p className="borrower-point__text">
                <strong>Condiciones m&aacute;s claras.</strong> Conoces tu tasa, tus costos y el paso
                a paso antes de decidir.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">✓</span>
              <p className="borrower-point__text">
                <strong>Proceso 100% online.</strong> Inicias tu solicitud y subes tus documentos
                desde tu celular.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">✓</span>
              <p className="borrower-point__text">
                <strong>Evaluaci&oacute;n seg&uacute;n tu perfil.</strong> Analizamos tu caso para
                ofrecerte condiciones acordes a tu situaci&oacute;n.
              </p>
            </div>
          </div>

          <div className="borrowers-visual" aria-hidden="true">
            <div className="borrowers-visual__frame">
              <img
                className="borrowers-visual__image"
                src={cerrarDeudaTarjetaImg}
                alt=""
                loading="lazy"
              />
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
