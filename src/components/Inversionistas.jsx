import React from 'react';
import { useProfile } from '@/hooks/useProfile.js';

const Inversionistas = ({ onSolicitudClick }) => {
  const { session, profile } = useProfile();
  const isVerified = profile?.estado_verificacion === 'verificado';
  const showCalculatorPrimary = !session || !isVerified;

  return (
    <section id="inversionistas" className="section section--light-alt section--compact">
      <div className="container">
        <div className="investors-layout">
          <div className="investors-copy">
            <span className="investors-eyebrow">Inversi&oacute;n con flujo mensual</span>
            <h2 className="section__title investors-title">Para Inversionistas</h2>
            <p className="section__text investors-text">
              Si buscas una alternativa a los rendimientos bajos de la banca tradicional,
              en Tu Pr&eacute;stamo puedes invertir en oportunidades publicadas con retorno
              anual competitivo y pagos mensuales proyectados.
            </p>

            <div className="investor-points">
              <div className="investor-point">
                <span className="investor-point__check" aria-hidden="true">✓</span>
                <p className="investor-point__text">
                  <strong>Retornos de 10% a 15% anual bruto.</strong> Seg&uacute;n el perfil
                  de riesgo de cada oportunidad publicada.
                </p>
              </div>
              <div className="investor-point">
                <span className="investor-point__check" aria-hidden="true">✓</span>
                <p className="investor-point__text">
                  <strong>Flujo mensual proyectado.</strong> Recibes pagos peri&oacute;dicos
                  y puedes reinvertir para hacer crecer tu capital.
                </p>
              </div>
              <div className="investor-point">
                <span className="investor-point__check" aria-hidden="true">✓</span>
                <p className="investor-point__text">
                  <strong>Oportunidades filtradas.</strong> El producto est&aacute; enfocado en
                  refinanciamiento dirigido de tarjeta y evaluaci&oacute;n de riesgo previa.
                </p>
              </div>
              <div className="investor-point">
                <span className="investor-point__check" aria-hidden="true">✓</span>
                <p className="investor-point__text">
                  <strong>Modelo claro de ingresos.</strong> Tu rendimiento objetivo se muestra
                  por oportunidad y la comisi&oacute;n de servicio es de 1% sobre cada pago recibido.
                </p>
              </div>
            </div>

            <div className="button-container investors-cta">
              <p className="cta-text">Explora si este tipo de inversi&oacute;n encaja contigo.</p>
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

          <aside className="investor-showcase" aria-label="Resumen de inversión">
            <div className="investor-showcase__card">
              <div className="investor-showcase__header">
                <span className="investor-showcase__label">Oportunidades Tu Pr&eacute;stamo</span>
                <strong className="investor-showcase__headline">Diversifica con tickets claros y pagos estimados</strong>
              </div>

              <div className="investor-showcase__stats">
                <div className="investor-stat">
                  <span className="investor-stat__value">10% - 15%</span>
                  <span className="investor-stat__label">Rendimiento anual bruto objetivo</span>
                </div>
                <div className="investor-stat">
                  <span className="investor-stat__value">Mensual</span>
                  <span className="investor-stat__label">Frecuencia esperada de pagos</span>
                </div>
                <div className="investor-stat">
                  <span className="investor-stat__value">1%</span>
                  <span className="investor-stat__label">Comisi&oacute;n sobre cada pago recibido</span>
                </div>
              </div>

              <div className="investor-showcase__note">
                <strong>No es un DPF.</strong> Inviertes en oportunidades espec&iacute;ficas
                publicadas en la plataforma, con rendimiento objetivo, plazo y flujo mensual proyectado.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Inversionistas;
