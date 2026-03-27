import React from 'react';
import { Link } from 'react-scroll';

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="container hero__content">
        <h1 className="hero__title">
          Deja de pagar tanto por tu tarjeta de crédito
        </h1>
        <p className="hero__subtitle">
          Si tu tarjeta te cobra intereses altos, mantenimiento y pagos mínimos que no te dejan avanzar, en Tu Préstamo puedes solicitar una evaluación online para refinanciar tu deuda con condiciones más claras.
        </p>

        <div className="hero__cta">
          <div className="cta-item">
            <Link to="prestatarios" smooth={true} duration={500} className="btn btn--secondary">Solicitar evaluación</Link>
            <div className="cta-box">
              <p>PAGO DIRECTO A TU BANCO ACREEDOR</p>
              <p>TASAS DESDE 15% ANUAL SEGUN PERFIL</p>
              <p>PROCESO 100% ONLINE</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
