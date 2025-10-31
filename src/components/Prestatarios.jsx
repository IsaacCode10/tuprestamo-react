import React from 'react';

const Prestatarios = ({ onSolicitudClick }) => {
  return (
    <section id="prestatarios" className="section section--light section--compact">
      <div className="container">
        <h2 className="section__title">Para Prestatarios</h2>
        <p className="section__text">
          Si tienes tarjeta de cr&eacute;dito y buscas refinanciar con mejores tasas, Tu Pr&eacute;stamo es tu aliado. Deja de regalar tu dinero a los bancos.
        </p>
        <ul className="features-list">
          <li className="features-list__item">
            Proceso &aacute;gil: Olv&iacute;date de la burocracia bancaria. Nuestro proceso de solicitud es en l&iacute;nea y r&aacute;pido.
          </li>
          <li className="features-list__item">
            Ahorro real: las TC en Bolivia cobran tasas de inter&eacute;s anuales superiores al 24% y costos de mantenimiento de m&aacute;s de Bs 120 al mes. Con nosotros, puedes acceder a un refinanciamiento significativamente menor.
          </li>
          <li className="features-list__item">
            Evaluaci&oacute;n justa: no eres solo un n&uacute;mero en un sistema. Un analista de cr&eacute;dito experto revisar&aacute; tu perfil para ofrecerte las mejores condiciones.
          </li>
          <li className="features-list__item">
            Transparencia radical: Olv&iacute;date de los costos fijos mensuales. Solo pagas una comisi&oacute;n por originaci&oacute;n que depende de tu perfil (premiamos a los buenos pagadores) y una comisi&oacute;n de servicio y seguro que disminuye con tu deuda. Simple y claro.
          </li>
        </ul>
        <div className="button-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <p className="cta-text">&iexcl;Solicita tu refinanciamiento ahora sin compromiso!</p>
          <button className="btn btn--secondary" onClick={() => onSolicitudClick('prestatario')}>
            Completa tu Solicitud
          </button>
          <a className="btn" href="/calculadora" style={{ marginTop: 8, background: '#fff8e6', border: '1px solid #FFA800', color: '#7a4b00' }}>
            Calculadora de Ahorro
          </a>
        </div>
      </div>
    </section>
  );
};

export default Prestatarios;

