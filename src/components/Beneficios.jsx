import React from 'react';

const Beneficios = () => {
  return (
    <section id="beneficios" className="section section--dark">
      <div className="container">
        <h2 className="section__title section__title--white">&iquest;Por qu&eacute; Tu Pr&eacute;stamo?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-card__icon">⚡</div>
            <h3 className="benefit-card__title">Libertad Total de Pago</h3>
            <p className="benefit-card__text">
              Adelanta cuotas o cancela cuando quieras: <strong>Bs 0</strong> de comisiones por prepago. Tu dinero se aplica 100% a capital.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">💰</div>
            <h3 className="benefit-card__title">Mejores condiciones</h3>
            <p className="benefit-card__text">
              Tasas justas y cuota fija. Si tienes excelente historial, accedes a condiciones preferenciales.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📝</div>
            <h3 className="benefit-card__title">Proceso simple</h3>
            <p className="benefit-card__text">
              Solicita online y recibe una respuesta clara y r&aacute;pida.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📈</div>
            <h3 className="benefit-card__title">Para inversionistas</h3>
            <p className="benefit-card__text">
              Invierte en personas con excelente perfil y obt&eacute;n rendimiento atractivo.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">🌐</div>
            <h3 className="benefit-card__title">100% digital</h3>
            <p className="benefit-card__text">
              Sin papeleo innecesario. Transparencia total y soporte cercano.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Beneficios;
