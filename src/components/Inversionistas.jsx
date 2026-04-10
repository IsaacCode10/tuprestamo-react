import React from 'react';
import { useProfile } from '@/hooks/useProfile.js';
import invertirDineroImg from '../assets/images/invertir-dinero-flujo-mensual-bolivia.png';

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
              Tu dinero puede hacer m&aacute;s que quedarse quieto en un dep&oacute;sito a plazo fijo.
              Mira cu&aacute;nto podr&iacute;as ganar con oportunidades publicadas en Tu Pr&eacute;stamo.
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
                  <strong>Oportunidades con evaluaci&oacute;n previa.</strong> Nos enfocamos en
                  personas que buscan salir de la deuda de su tarjeta de cr&eacute;dito.
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
          <p className="cta-text">Conoce las oportunidades para invertir tu dinero.</p>
          <div className="investors-cta__actions">
            {showCalculatorPrimary ? (
              <>
                <button className="btn btn--primary" onClick={() => onSolicitudClick('inversionista')}>
                  Ver Oportunidades
                </button>
                <a className="btn btn--secondary" href="/calculadora-inversionista">
                  Calculadora de Ganancias
                </a>
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
