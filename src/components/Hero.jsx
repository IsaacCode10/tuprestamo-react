import React from 'react';

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
            <div className="hero-card">
              <div className="hero-card__badge">Tu deuda hoy</div>
              <div className="hero-card__surface">
                <div className="hero-card__top">
                  <div className="hero-card__top-left">
                    <div className="hero-card__chip"></div>
                    <div className="hero-card__contactless">
                      <svg viewBox="0 0 28 24" aria-hidden="true" focusable="false">
                        <path d="M4 11a1.5 1.5 0 0 1 0 3" />
                        <path d="M8 9a3.5 3.5 0 0 1 0 7" />
                        <path d="M12 7a5.5 5.5 0 0 1 0 11" />
                        <path d="M16 5a7.5 7.5 0 0 1 0 15" />
                      </svg>
                    </div>
                  </div>
                  <div className="hero-card__brand">
                    <span></span>
                    <span></span>
                  </div>
                </div>
                <div className="hero-card__label">Deuda cerrada</div>
                <div className="hero-card__number">•••• 2048</div>
                <div className="hero-card__lines">
                  <span>Pago mínimo: no te libera</span>
                  <span>Intereses: suben tu costo</span>
                  <span>Mantenimiento: suma cada mes</span>
                </div>
              </div>
              <div className="hero-card__summary">
                <strong>Tu objetivo</strong>
                <p>Salir de la deuda de tu tarjeta con condiciones más claras.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
