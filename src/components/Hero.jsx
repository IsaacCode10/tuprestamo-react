import React from 'react';
import deudaCerradaHeroImg from '../assets/images/deuda-cerrada-tarjeta-hero.png';

const Hero = ({ onBorrowerClick }) => {
  return (
    <section id="hero" className="hero">
      <div className="container hero__content">
        <div className="hero__grid">
          <div className="hero__copy">
            <span className="hero__eyebrow">Refinancia tu tarjeta de crédito en Bolivia</span>
            <h1 className="hero__title">
              Deja de pagar tanto por tu tarjeta de crédito
            </h1>
            <p className="hero__subtitle">
              Si tu tarjeta te cobra intereses altos y pagos mínimos que no te dejan avanzar, solicita una evaluación online para refinanciar tu deuda con condiciones más claras.
            </p>

            <div className="hero__actions">
              <button type="button" className="btn btn--primary hero__btn" onClick={onBorrowerClick}>
                Solicitar evaluación
              </button>
            </div>

            <div className="hero__trust">
              <span className="hero__trust-chip">Pago directo a tu banco</span>
              <span className="hero__trust-chip">Desde 15% anual según perfil</span>
              <span className="hero__trust-chip">Proceso 100% online</span>
            </div>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <div className="hero-illustration">
              <img
                className="hero-illustration__image"
                src={deudaCerradaHeroImg}
                alt=""
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
