import React from 'react';

const Inversionistas = ({ onSolicitudClick }) => {
  return (
    <section id="inversionistas" className="section section--light-alt section--compact">
      <div className="container">
        <h2 className="section__title">Para Inversionistas</h2>
        <p className="section__text">
          Si eres inversionista en Bolivia y estÃ¡s cansado del 3.5 % de los DPFs, Tu PrÃ©stamo te ofrece retornos atractivos con una cartera de bajo riesgo.
        </p>
        <ul className="features-list">
          <li className="features-list__item">
            Rendimiento Competitivo: Nuestra plataforma te da acceso a prÃ©stamos con un rendimiento del 12 % anual.
          </li>
          <li className="features-list__item">
            InversiÃ³n segura: Minimizamos el riesgo enfocÃ¡ndonos exclusivamente en prestatarios de alto perfil crediticio que buscan refinanciar deudas tÃ³xicas.
          </li>
          <li className="features-list__item">
            InterÃ©s Compuesto: Haz crecer tu capital de forma acelerada al reinvertir los pagos mensuales que recibes. Es la fÃ³rmula perfecta para que tu dinero trabaje por ti.
          </li>
          <li className="features-list__item">
            ProtecciÃ³n de tu capital con Seguro de Desgravamen.
          </li>
        </ul>
        <div className="button-container">
          <p className="cta-text">Â¡RegÃ­strate como inversionista y conoce las oportunidades!</p>
          {/* BOTÃ“N QUE ABRE EL MODAL */}
          <button className="btn btn--primary" onClick={() => onSolicitudClick('inversionista')}>
            Ver Oportunidades
          <a className="btn" href="/calculadora-inversionista" style={{ marginLeft: 8 }}>
            Calculadora de Ganancias
          </a>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Inversionistas;
