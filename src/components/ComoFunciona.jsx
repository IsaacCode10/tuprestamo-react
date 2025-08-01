import React from 'react';

const ComoFunciona = () => {
  return (
    <section id="como-funciona" className="section section--white section--compact">
      <div className="container">
        <h2 className="section__title">¿Cómo Funciona?</h2>
        {/* Fila superior: pasos 1, 2, 3 */}
        <div className="steps-row">
          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">1</span>
              <span className="step-card__icon">📝</span>
            </div>
            <h3 className="step-card__title">Solicita y Pre-evalúa</h3>
            <p className="step-card__text">
              Completa nuestro formulario en línea. Nuestro algoritmo realiza una pre-selección rápida de tu perfil y nuestro analista experto revisa tu solicitud para una primera aprobación.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">2</span>
              <span className="step-card__icon">✅</span>
            </div>
            <h3 className="step-card__title">Verificación y Aprobación Final</h3>
            <p className="step-card__text">
              Solicitamos tu documentación clave y consultamos tu historial crediticio en Infocred. Nuestro analista realiza la aprobación final, definiendo tu tasa y condiciones.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">3</span>
              <span className="step-card__icon">🤝</span> {/* Icono de conexión/apretón de manos */}
            </div>
            <h3 className="step-card__title">Fondeo Colectivo</h3>
            <p className="step-card__text">
              Tu préstamo aprobado se publica como una oportunidad de inversión en nuestra plataforma. Inversionistas como tú aportan montos desde Bs 350 hasta completar el total.
            </p>
          </div>
        </div>

        {/* Fila inferior: pasos 4, 5 centrados */}
        <div className="steps-row steps-row--centered">
          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">4</span>
              <span className="step-card__icon">💸</span>
            </div>
            <h3 className="step-card__title">Desembolso Transparente</h3>
            <p className="step-card__text">
              Una vez fondeado al 100%, transferimos el monto aprobado directamente a tu cuenta bancaria. La comisión de originación del 3.5% se descuenta al momento del desembolso.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">5</span>
              <span className="step-card__icon">📈</span> {/* Icono de gráfico de crecimiento/ganancia */}
            </div>
            <h3 className="step-card__title">Administración y Rendimientos</h3>
            <p className="step-card__text">
              El prestatario realiza sus pagos mensuales. Nuestro sistema gestiona la cobranza y distribuye automáticamente tu capital e intereses netos a los inversionistas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComoFunciona;
