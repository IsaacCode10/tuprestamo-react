import React from 'react';
import { useProfile } from '@/hooks/useProfile.js';
import invertirDineroImg from '../assets/images/invertir_dinero_flujo-mensual-bolivia.png';

const Inversionistas = ({ onSolicitudClick }) => {
  const { session, profile } = useProfile();
  const isVerified = profile?.estado_verificacion === 'verificado';
  const showCalculatorPrimary = !session || !isVerified;

  return (
    <section id="inversionistas" className="section section--light-alt section--compact">
      <div className="container">
        <h2 className="section__title investors-title">Para Inversionistas</h2>
        <div className="investors-layout">
          <div className="investors-copy investors-copy--single">
            <p className="investors-intro">
              Si quieres evaluar el potencial de retorno, revisa primero la calculadora y conoce
              la propuesta de valor de este modelo de inversi&oacute;n.
            </p>

            <div className="investor-points">
              <div className="investor-point">
                <span className="investor-point__check" aria-hidden="true">✓</span>
                <p className="investor-point__text">
                  <strong>Retornos anuales brutos de 10% a 15%.</strong> Seg&uacute;n el perfil de
                  riesgo de cada oportunidad publicada.
                </p>
              </div>
              <div className="investor-point">
                <span className="investor-point__check" aria-hidden="true">✓</span>
                <p className="investor-point__text">
                  <strong>Flujo mensual proyectado.</strong> Recibes pagos peri&oacute;dicos y puedes
                  reinvertir para hacer crecer tu capital.
                </p>
              </div>
              <div className="investor-point">
                <span className="investor-point__check" aria-hidden="true">✓</span>
                <p className="investor-point__text">
                  <strong>Oportunidades evaluadas por perfil.</strong> El foco est&aacute; en
                  refinanciamiento dirigido de tarjeta con revisi&oacute;n previa.
                </p>
              </div>
              <div className="investor-point">
                <span className="investor-point__check" aria-hidden="true">✓</span>
                <p className="investor-point__text">
                  <strong>Modelo simple y transparente.</strong> La comisi&oacute;n de servicio es de
                  1% sobre cada pago recibido.
                </p>
              </div>
            </div>

          </div>

          <div className="investors-visual" aria-hidden="true">
            <div className="investors-visual__frame">
              <img
                className="investors-visual__image"
                src={invertirDineroImg}
                alt=""
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="button-container investors-cta">
          <p className="cta-text">Conoce el potencial de ganancia antes de registrarte.</p>
          <div className="investors-cta__actions">
            {showCalculatorPrimary ? (
              <>
                <a className="btn btn--primary" href="/calculadora-inversionista">
                  Calculadora de Ganancias
                </a>
                <button className="btn btn--secondary" onClick={() => onSolicitudClick('inversionista')}>
                  Ver Oportunidades
                </button>
              </>
            ) : (
              <>
                <button className="btn btn--primary" onClick={() => onSolicitudClick('inversionista')}>
                  Ver Oportunidades
                </button>
                <a className="btn btn--secondary" href="/calculadora-inversionista">
                  Calculadora de Ganancias
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Inversionistas;
