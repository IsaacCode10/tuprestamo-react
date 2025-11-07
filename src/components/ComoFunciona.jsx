import React from 'react';
import './ComoFunciona.css';

const ComoFunciona = () => {
  return (
    <section id="como-funciona" className="section section--white section--compact">
      <div className="container">
        <h2 className="section__title">&iquest;C&oacute;mo Funciona?</h2>
        {/* Fila superior: pasos 1, 2, 3 */}
        <div className="steps-row">
          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">1</span>
              <span className="step-card__icon" aria-hidden>📝</span>
            </div>
            <h3 className="step-card__title">Solicita y Pre&#8209;eval&uacute;a</h3>
            <p className="step-card__text">
              Completa nuestro formulario en l&iacute;nea. Nuestro algoritmo hace una pre&#8209;selecci&oacute;n r&aacute;pida y un analista experto revisa tu solicitud para una primera aprobaci&oacute;n.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">2</span>
              <span className="step-card__icon" aria-hidden>✅</span>
            </div>
            <h3 className="step-card__title">Verificaci&oacute;n y Aprobaci&oacute;n Final</h3>
            <p className="step-card__text">
              Verificamos tu documentaci&oacute;n y realizamos la <strong>consulta de tu historial crediticio</strong>. Un analista confirma tu tasa y condiciones.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">3</span>
              <span className="step-card__icon" aria-hidden>🤝</span>
            </div>
            <h3 className="step-card__title">Fondeo Colectivo</h3>
            <p className="step-card__text">
              Tu pr&eacute;stamo aprobado se publica como oportunidad de inversi&oacute;n. Inversionistas aportan desde Bs 700 hasta completar el total.
            </p>
          </div>
        </div>

        {/* Fila inferior: pasos 4, 5 centrados */}
        <div className="steps-row steps-row--centered">
          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">4</span>
              <span className="step-card__icon" aria-hidden>🏦</span>
            </div>
            <h3 className="step-card__title">Desembolso Transparente</h3>
            <p className="step-card__text">
              Cuando el fondeo llega al 100%, <strong>realizamos el pago directo al banco acreedor</strong> para asegurar el destino del cr&eacute;dito. La <strong>comisi&oacute;n de originaci&oacute;n</strong> se aplica seg&uacute;n nivel de riesgo: <strong>A 3%</strong> / <strong>B 4%</strong> / <strong>C 5%</strong>.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card__header">
              <span className="step-card__number">5</span>
              <span className="step-card__icon" aria-hidden>📈</span>
            </div>
            <h3 className="step-card__title">Administraci&oacute;n y Rendimientos</h3>
            <p className="step-card__text">
              Pagas en <strong>cuota fija mensual</strong>. Gestionamos la cobranza y distribuimos autom&aacute;ticamente capital e intereses a los inversionistas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComoFunciona;

