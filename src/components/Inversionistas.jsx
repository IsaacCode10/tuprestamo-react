import React from 'react';
import { useProfile } from '@/hooks/useProfile.js';

const Inversionistas = ({ onSolicitudClick }) => {
  const { session, profile } = useProfile();
  const isVerified = profile?.estado_verificacion === 'verificado';
  const showCalculatorPrimary = !session || !isVerified;

  return (
    <section id="inversionistas" className="section section--light-alt section--compact">
      <div className="container">
        <div className="investors-copy investors-copy--single">
          <span className="investors-eyebrow">Inversi&oacute;n con flujo mensual</span>
          <h2 className="section__title investors-title">Para Inversionistas</h2>
          <p className="section__text investors-text">
            Esta secci&oacute;n cumple un rol secundario dentro de la home. Si quieres evaluar el
            potencial de retorno, entra a la calculadora y revisa si este modelo de inversi&oacute;n
            encaja contigo.
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
      </div>
    </section>
  );
};

export default Inversionistas;
