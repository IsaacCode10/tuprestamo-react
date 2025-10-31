import React from 'react';

const Inversionistas = ({ onSolicitudClick }) => {
  return (
    <section id="inversionistas" className="section section--light-alt section--compact">
      <div className="container">
        <h2 className="section__title">Para Inversionistas</h2>
        <p className="section__text">
          Si eres inversionista en Bolivia y estÃƒÂ¡s cansado del 3.5 % de los DPFs, Tu PrÃƒÂ©stamo te ofrece retornos atractivos con una cartera de bajo riesgo.
        </p>
        <ul className="features-list">
          <li className="features-list__item">
            Rendimiento competitivo: acceso a préstamos con rendimiento anual bruto de hasta 15%.
          </li>
          <li className="features-list__item">
            InversiÃƒÂ³n segura: Minimizamos el riesgo enfocÃƒÂ¡ndonos exclusivamente en prestatarios de alto perfil crediticio que buscan refinanciar deudas tÃƒÂ³xicas.
          </li>
          <li className="features-list__item">
            InterÃƒÂ©s Compuesto: Haz crecer tu capital de forma acelerada al reinvertir los pagos mensuales que recibes. Es la fÃƒÂ³rmula perfecta para que tu dinero trabaje por ti.
          </li>
          <li className="features-list__item">
            ProtecciÃƒÂ³n de tu capital con Seguro de Desgravamen.
          </li>
        </ul>
        <div className="button-container">
          <p className="cta-text">Ã‚Â¡RegÃƒÂ­strate como inversionista y conoce las oportunidades!</p>
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

