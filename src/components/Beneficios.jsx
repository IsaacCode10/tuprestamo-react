import React from 'react';

const Beneficios = () => {
  return (
    <section id="beneficios" className="section section--dark">
      <div className="container">
        <h2 className="section__title section__title--white">&iquest;Por qu&eacute; Tu Pr&eacute;stamo?</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-card__icon">⚡</div>
            <h3 className="benefit-card__title">Menos costo que seguir con tu tarjeta</h3>
            <p className="benefit-card__text">
              Si hoy pagas tasas altas, mantenimiento mensual y cargos confusos, refinanciar puede ayudarte a recuperar control sobre tu deuda.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">🏦</div>
            <h3 className="benefit-card__title">Pago directo a tu banco</h3>
            <p className="benefit-card__text">
              El desembolso va directo al banco acreedor para cancelar tu tarjeta. As&iacute; el cr&eacute;dito cumple exactamente su prop&oacute;sito.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📝</div>
            <h3 className="benefit-card__title">Condiciones m&aacute;s claras</h3>
            <p className="benefit-card__text">
              Antes de aceptar, conoces tu tasa, tus costos y el proceso. Sin letras peque&ntilde;as ni cobros dif&iacute;ciles de entender.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">📱</div>
            <h3 className="benefit-card__title">Proceso 100% online</h3>
            <p className="benefit-card__text">
              Puedes iniciar tu solicitud y cargar tus documentos desde tu celular, con seguimiento digital de tu proceso.
            </p>
          </div>
          <div className="benefit-card">
            <div className="benefit-card__icon">💰</div>
            <h3 className="benefit-card__title">Evaluaci&oacute;n justa</h3>
            <p className="benefit-card__text">
              Tu caso se revisa seg&uacute;n tu perfil real para ofrecerte condiciones acordes a tu situaci&oacute;n financiera.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Beneficios;
