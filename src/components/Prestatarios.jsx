import React from 'react';

const Prestatarios = ({ onSolicitudClick }) => {
  return (
    <section id="prestatarios" className="section section--light section--compact">
      <div className="container">
        <h2 className="section__title">Para Prestatarios</h2>
        <p className="section__subtitle section__subtitle--centered">
          Dise&ntilde;ado para personas que quieren dejar atr&aacute;s el costo de su tarjeta y avanzar con una alternativa m&aacute;s clara.
        </p>
        <p className="section__text">
          Si tu tarjeta de cr&eacute;dito te cobra demasiado y sientes que tu deuda no baja, en Tu Pr&eacute;stamo puedes solicitar una evaluaci&oacute;n para refinanciar con condiciones m&aacute;s claras.
        </p>
        <ul className="features-list">
          <li className="features-list__item">
            Pago directo a tu banco acreedor: refinanciamos tu deuda de tarjeta sin desembolso libre a tu cuenta.
          </li>
          <li className="features-list__item">
            Condiciones m&aacute;s claras: conoces tu tasa, tus costos y el paso a paso antes de decidir.
          </li>
          <li className="features-list__item">
            Proceso 100% online: inicia tu solicitud desde tu celular y sube tus documentos en l&iacute;nea.
          </li>
          <li className="features-list__item">
            Evaluaci&oacute;n seg&uacute;n tu perfil: analizamos tu caso para ofrecerte condiciones acordes a tu situaci&oacute;n real.
          </li>
        </ul>
        <div className="button-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <p className="cta-text">Solicita tu evaluaci&oacute;n sin compromiso.</p>
          <button className="btn btn--secondary" onClick={() => onSolicitudClick('prestatario')}>
            Solicitar evaluaci&oacute;n
          </button>
          <a className="btn btn--primary" href="/calculadora" style={{ marginTop: 8 }}>
            Calculadora de Ahorro
          </a>
        </div>
      </div>
    </section>
  );
};

export default Prestatarios;
