import React from 'react';
import { Link } from 'react-scroll';

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="container hero__content">
        <h1 className="hero__title">
          Refinancia tus tarjetas de crédito en Bolivia con mejores tasas
        </h1>
        <p className="hero__subtitle">
          Conectamos personas que necesitan refinanciar sus tarjetas de crédito con inversores que buscan rentabilidad. Tasas justas, proceso simple y 100% en línea.
        </p>

        {/* CTA Items */}
        <div className="hero__cta">
          <div className="cta-item">
            <Link to="prestatarios" smooth={true} duration={500} className="btn btn--secondary">Quiero refinanciar</Link>
            <div className="cta-box">
              <p>REDUCE TUS INTERESES DE TARJETA DE CRÉDITO CON TASAS DESDE 15% ANUAL</p>
            </div>
          </div>
          <div className="cta-item">
            <Link to="inversionistas" smooth={true} duration={500} className="btn btn--primary">Quiero invertir</Link>
            <div className="cta-box">
              <p>OBTÉN RENDIMIENTOS HASTA 15% ANUAL FINANCIANDO PRÉSTAMOS</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
