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
                <strong>Es para deuda de tarjeta de cr&eacute;dito.</strong> Refinanciamos este tipo
                de deuda para ayudarte a salir de cargos e intereses que se acumulan mes a mes.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">✓</span>
              <p className="borrower-point__text">
                <strong>Sabes si te conviene antes de decidir.</strong> Primero evaluamos tu caso y
                te mostramos condiciones claras para que tomes una decisi&oacute;n informada.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">✓</span>
              <p className="borrower-point__text">
                <strong>Todo empieza 100% online.</strong> Puedes iniciar tu solicitud y avanzar
                desde tu celular, sin vueltas innecesarias.
              </p>
            </div>
            <div className="borrower-point">
              <span className="borrower-point__check" aria-hidden="true">✓</span>
              <p className="borrower-point__text">
                <strong>Recupera el control de tus finanzas.</strong> La idea no es seguir pateando
                la deuda, sino ayudarte a ordenarte con una alternativa m&aacute;s clara.
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
            <button className="btn btn--primary" onClick={() => onSolicitudClick('prestatario')}>
              Solicitar evaluaci&oacute;n
            </button>
            <a className="btn btn--secondary" href="/calculadora">
              Calculadora de Ahorro
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Prestatarios;
