import React from 'react';

const Beneficios = () => {
  return (
    <section id="beneficios" className="section section--benefits">
      <div className="container">
        <h2 className="section__title">&iquest;Por qu&eacute; Tu Pr&eacute;stamo?</h2>
        <p className="section__subtitle section__subtitle--centered">
          No se trata solo de pagar menos en tu tarjeta de cr&eacute;dito. Se trata de entender mejor tu deuda y salir de ella con condiciones m&aacute;s claras.
        </p>
        <div className="benefits-grid">
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Costo</span>
            <h3 className="benefit-card__title">Menos costo que seguir con tu tarjeta</h3>
            <p className="benefit-card__text">
              Si hoy tu tarjeta de cr&eacute;dito te cobra intereses altos y cargos mensuales, refinanciar puede ayudarte a recuperar control sobre tu deuda.
            </p>
          </div>
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Banco</span>
            <h3 className="benefit-card__title">Pago directo a tu banco</h3>
            <p className="benefit-card__text">
              El desembolso va directo al banco acreedor para cancelar la deuda de tu tarjeta de cr&eacute;dito.
            </p>
          </div>
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Claridad</span>
            <h3 className="benefit-card__title">Condiciones m&aacute;s claras</h3>
            <p className="benefit-card__text">
              Antes de aceptar, conoces la tasa, los costos y el proceso de refinanciar tu deuda, sin letras peque&ntilde;as.
            </p>
          </div>
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Digital</span>
            <h3 className="benefit-card__title">Proceso 100% online</h3>
            <p className="benefit-card__text">
              Inicia tu solicitud para refinanciar tu tarjeta de cr&eacute;dito y carga tus documentos desde tu celular.
            </p>
          </div>
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Perfil</span>
            <h3 className="benefit-card__title">Evaluaci&oacute;n seg&uacute;n tu perfil</h3>
            <p className="benefit-card__text">
              Evaluamos tu perfil para ofrecerte condiciones acordes a tu situaci&oacute;n financiera.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Beneficios;
