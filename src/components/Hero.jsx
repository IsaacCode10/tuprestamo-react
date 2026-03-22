import React from 'react';
import { Link } from 'react-scroll';
import { Link as RouterLink } from 'react-router-dom';

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="container hero__content">
        <h1 className="hero__title">
          Refinancia tus tarjetas de crédito en Bolivia con mejores tasas
        </h1>
        <p className="hero__subtitle">
          Conectamos personas que necesitan refinanciar sus tarjetas de crédito con inversionistas que buscan rentabilidad. Tasas justas, proceso simple y 100% en línea.
        </p>
        <p className="hero__subtitle hero__subtitle--support">
          Antes de solicitar, también puedes usar nuestro{' '}
          <RouterLink to="/auditor-de-tarjetas" className="hero__inline-link">
            auditor de tarjetas
          </RouterLink>{' '}
          para calcular intereses, TEA y comisiones de tu tarjeta en Bolivia.
        </p>

        {/* CTA Items */}
        <div className="hero__cta">
          <div className="cta-item">
            <Link to="prestatarios" smooth={true} duration={500} className="btn btn--secondary">Quiero refinanciar</Link>
            <div className="cta-box">
              <p>REDUCE TUS INTERESES CON TASAS DESDE 15% ANUAL. CUOTA FIJA MENSUAL</p>
            </div>
          </div>
          <div className="cta-item">
            <Link to="inversionistas" smooth={true} duration={500} className="btn btn--primary">Quiero invertir</Link>
            <div className="cta-box">
              <p>RECIBE PAGOS MENSUALES Y RENDIMIENTO ANUAL ESTIMADO HASTA 15%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
