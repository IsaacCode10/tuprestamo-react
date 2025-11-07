import React from 'react';

const Beneficios = () => {
  return (
    <section id="beneficios" className="section section--dark">
      <div className="container">
        <h2 className="section__title section__title--white">¿Por qué Tu Préstamo?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-card__icon">⚡</div>
            <h3 className="benefit-card__title">Libertad Total de Pago</h3>
            <p className="benefit-card__text">
              Adelant&aacute; cuotas o cancel&aacute; cuando quieras: <strong>Bs 0</strong> de comisiones por prepago. Tu dinero se aplica 100% a capital.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">💰</div>
            <h3 className="benefit-card__title">Ahorra dinero cada mes</h3>
            <p className="benefit-card__text">
              Tasas justas. Si ten&eacute;s excelente historial, acced&eacute;s a condiciones preferenciales.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📝</div>
            <h3 className="benefit-card__title">Proceso simple y sin papeleo</h3>
            <p className="benefit-card__text">
              Solicit&aacute; online y recib&iacute; una respuesta clara y r&aacute;pida.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📈</div>
            <h3 className="benefit-card__title">Rendimientos atractivos</h3>
            <p className="benefit-card__text">
              Invert&iacute; en personas con excelente perfil y obten&eacute; rendimiento superior al plazo fijo.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">🌐</div>
            <h3 className="benefit-card__title">Accesibilidad para todos</h3>
            <p className="benefit-card__text">
              No necesit&aacute;s grandes sumas. Pod&eacute;s empezar a construir tu portafolio hoy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Beneficios;

