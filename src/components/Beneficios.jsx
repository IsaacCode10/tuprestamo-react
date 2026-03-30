import React from 'react';

const Beneficios = () => {
  return (
    <section id="beneficios" className="section section--benefits">
      <div className="container">
        <h2 className="section__title">&iquest;Por qu&eacute; Tu Pr&eacute;stamo?</h2>
        <p className="section__subtitle section__subtitle--centered">
          Si hoy tu tarjeta te cuesta demasiado, aqu&iacute; tienes una alternativa pensada para ayudarte a salir de esa deuda con m&aacute;s control y claridad.
        </p>
        <div className="benefits-grid">
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Costo</span>
            <h3 className="benefit-card__title">Menos costo que seguir con tu tarjeta</h3>
            <p className="benefit-card__text">
              Si hoy pagas tasas altas, mantenimiento mensual y cargos confusos, refinanciar puede ayudarte a recuperar control sobre tu deuda.
            </p>
          </div>
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Banco</span>
            <h3 className="benefit-card__title">Pago directo a tu banco</h3>
            <p className="benefit-card__text">
              El desembolso va directo al banco acreedor para cancelar tu tarjeta. As&iacute; el cr&eacute;dito cumple exactamente su prop&oacute;sito.
            </p>
          </div>
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Claridad</span>
            <h3 className="benefit-card__title">Condiciones m&aacute;s claras</h3>
            <p className="benefit-card__text">
              Antes de aceptar, conoces tu tasa, tus costos y el proceso. Sin letras peque&ntilde;as ni cobros dif&iacute;ciles de entender.
            </p>
          </div>
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Digital</span>
            <h3 className="benefit-card__title">Proceso 100% online</h3>
            <p className="benefit-card__text">
              Puedes iniciar tu solicitud y cargar tus documentos desde tu celular, con seguimiento digital de tu proceso.
            </p>
          </div>
          <div className="benefit-card">
            <span className="benefit-card__eyebrow">Perfil</span>
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
