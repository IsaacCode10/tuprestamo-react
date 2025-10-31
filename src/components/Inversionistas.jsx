import React from 'react';

const Inversionistas = ({ onSolicitudClick }) => {
  return (
    <section id="inversionistas" className="section section--light-alt section--compact">
      <div className="container">
        <h2 className="section__title">Para Inversionistas</h2>
        <p className="section__text">
          Si eres inversionista en Bolivia y est&aacute;s cansado del 3.5% de los DPF, Tu Pr&eacute;stamo te ofrece retornos atractivos con una cartera de bajo riesgo.
        </p>
        <ul className="features-list">
          <li className="features-list__item">
            Rendimiento competitivo: acceso a pr&eacute;stamos con rendimiento anual bruto de hasta 15%.
          </li>
          <li className="features-list__item">
            Inversi&oacute;n segura: minimizamos el riesgo enfoc&aacute;ndonos exclusivamente en prestatarios de alto perfil crediticio que buscan refinanciar deudas t&oacute;xicas.
          </li>
          <li className="features-list__item">
            Inter&eacute;s compuesto: haz crecer tu capital de forma acelerada al reinvertir los pagos mensuales que recibes. Es la f&oacute;rmula perfecta para que tu dinero trabaje por ti.
          </li>
          <li className="features-list__item">
            Protecci&oacute;n de tu capital con Seguro de Desgravamen.
          </li>
        </ul>
        <div className="button-container">
          <p className="cta-text">Reg&iacute;strate como inversionista y conoce las oportunidades.</p>
          {/* BOTÃƒâ€œN QUE ABRE EL MODAL */}
          <button className="btn btn--primary" onClick={() => onSolicitudClick('inversionista')}>
            Ver Oportunidades
          <a className="btn" href="/calculadora-inversionista" style={{ marginLeft: 8 }}>
            Calculadora de Ganancias
          </a>
          </button>\n          <a className="btn" href="/calculadora-inversionista" style={{ marginLeft: 8 }}>\n            Calculadora de Ganancias\n          </a>\n        </div>\n      </div>\n    </section>
  );
};

export default Inversionistas;


