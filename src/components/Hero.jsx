import React from 'react';
import { Link } from 'react-scroll';

const Hero = () => {
  return (
    <section id="hero" className="hero">
      <div className="container hero__content">
        <h1 className="hero__title">
          Sal de tu deuda de tarjeta. Paga a tu ritmo, sin penalidades por pagos anticipados.
        </h1>
        <p className="hero__subtitle">
          Refinanci&aacute; con cuota fija y transparencia total. Adelant&aacute; cuotas o cancel&aacute; cuando quieras: Bs 0 de comisiones por prepago.
        </p>

        {/* CTA Items */}
        <div className="hero__cta">
          <div className="cta-item">
            <Link to="prestatarios" smooth={true} duration={500} className="btn btn--secondary">Quiero refinanciar</Link>
            <div className="cta-box">
              <p>REDUCE TUS INTERESES CON TASAS DESDE 15% ANUAL. CUOTA FIJA MENSUAL.</p>
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

