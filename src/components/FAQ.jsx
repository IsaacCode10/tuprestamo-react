import React, { useState } from 'react';
import LoanRequestForm from '../LoanRequestForm';

const FaqItem = ({ question, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="faq-item">
      <button
        className="faq-item__question"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        {question}
        <span className="faq-item__icon">{isOpen ? '−' : '+'}</span>
      </button>
      <div className="faq-item__answer" style={{ maxHeight: isOpen ? '1000px' : '0' }}>
        <div style={{ padding: '0.75rem 0' }}>{children}</div>
      </div>
    </div>
  );
};

const FAQ = () => {
  const [showBorrowerForm, setShowBorrowerForm] = useState(false);
  return (
    <section id="faq" className="section section--white">
      <div className="container">
        <h2 className="section__title">Preguntas Frecuentes</h2>
        <div className="faq-list">

          <h3>Para Prestatarios</h3>
          <FaqItem question="¿Puedo pagar m&aacute;s que mi cuota este mes?">
            <p>¡S&iacute;! Y es una gran decisi&oacute;n. Todo pago extra se aplica <strong>100% a capital</strong>, reduciendo intereses futuros y acortando la vida del pr&eacute;stamo.</p>
          </FaqItem>

          <FaqItem question="¿Me cobran algo si liquido antes mi pr&eacute;stamo?">
            <p>No. <strong>Cero comisiones por pago anticipado</strong>. Solo pagas el capital pendiente y los intereses generados hasta ese d&iacute;a.</p>
          </FaqItem>

          <FaqItem question="¿C&oacute;mo aplican mi pago extra?">
            <p>Primero verificamos la cuota del mes. El excedente (o el pago extra) va directo a <strong>capital</strong>. Recalculamos tu plan manteniendo la cuota y <strong>reduciendo el plazo</strong>.</p>
          </FaqItem>
          <FaqItem question="¿Qué tasa de interés se paga en un préstamo P2P en Bolivia?">
            <p>En Tu Préstamo, ofrecemos una tasa de interés anual fija para refinanciar tarjetas de crédito. Nuestro objetivo es que sea significativamente menor al ~24% típico de tarjetas. La tasa exacta se confirma en la aprobación. Pagas en <strong>cuota fija mensual</strong> y el <strong>desembolso es directo a tu banco acreedor</strong>.</p>
          </FaqItem>

          <FaqItem question="Además del interés, ¿qué comisiones cobra Tu Préstamo?">
            <p>
              Transparencia total: <strong>no cobramos cargos de mantenimiento mensuales</strong>.
              Comisiones aplicables: 1) <strong>Originación</strong> (una sola vez): <strong>Bs 450</strong> para montos hasta <strong>Bs 10.000</strong>; por montos mayores aplica <strong>A 3% / B 4% / C 5%</strong> según tu perfil de riesgo (a mejor perfil, mejor tasa).
              2) <strong>Servicio + Seguro</strong>: 0,15% mensual sobre el saldo deudor (disminuye cada mes).
            </p>
          </FaqItem>

          <FaqItem question="¿Cómo funciona la evaluación crediticia?">
            <p>Combinamos tecnología y análisis humano. Primero hacemos una preselección automática. Luego, nuestra analista experta verifica ingresos, antigüedad laboral e historial (incluyendo consulta de tu historial de crédito) para asegurar un perfil de bajo riesgo.</p>
          </FaqItem>

          <FaqItem question="¿Cómo puedo solicitar un préstamo?">
            <p>
              Muy simple. Haz clic en 
              <button type="button" className="link-button cta-inline" onClick={() => setShowBorrowerForm(true)}>
                <strong>“Quiero refinanciar”</strong>
              </button>
              , completa el formulario con tus datos y documentos. Revisamos tu caso y te daremos una respuesta clara en pocos días.
            </p>
          </FaqItem>

          <h3 style={{ marginTop: '30px' }}>Para Inversionistas</h3>
          <FaqItem question="¿Cuál es el rendimiento anual al invertir en préstamos P2P en Bolivia?">
            <p>Rendimiento anual estimado <strong>hasta 15%</strong>, superior al 3.5–4% de los DPF. Nuestra comisión es simple: <strong>1% sobre cada pago que recibes</strong> (capital + interés). Cobras <strong>pagos mensuales</strong> y puedes <strong>reinvertir</strong> para potenciar tu resultado.</p>
          </FaqItem>

          <FaqItem question="¿Es seguro invertir en Tu Préstamo? ¿Cómo minimizan el riesgo?">
            <p>Seleccionamos prestatarios de alto perfil con verificación documental y consulta a Infocred. Además, los préstamos cuentan con <strong>seguro de desgravamen</strong>.</p>
          </FaqItem>

          <FaqItem question="¿Cuál es el monto mínimo para invertir?">
            <p>Puedes empezar desde <strong>Bs 700</strong> por oportunidad, lo que facilita <strong>diversificar</strong> tu capital.</p>
          </FaqItem>

          <FaqItem question="¿Cada cuánto tiempo recibiré los pagos de mi inversión?">
            <p>Recibes <strong>mensualmente</strong> (capital + interés). Nosotros gestionamos la cobranza y depositamos tu parte. Puedes <strong>reinvertir</strong> para generar interés compuesto que un DPF no ofrece.</p>
          </FaqItem>

          <h3 style={{ marginTop: '30px' }}>Preguntas Generales</h3>
          <FaqItem question="¿Tu Préstamo está regulado en Bolivia?">
            <p>Operamos alineados al marco FINTECH vigente en Bolivia (p. ej., Decreto Supremo N.º 5384) y comprometidos con la transparencia y el cumplimiento normativo.</p>
          </FaqItem>

          <FaqItem question="¿Quiénes somos en Tu Préstamo?">
            <p>Somos una plataforma boliviana de financiamiento colectivo (P2P Lending) que conecta prestatarios de alto perfil que refinancian tarjetas de crédito con inversionistas que buscan rendimientos atractivos. Nuestra misión es ofrecer alternativas justas y transparentes.</p>
          </FaqItem>

          <FaqItem question="¿Qué es el 'P2P Lending' o financiamiento colectivo?">
            <p>Es un modelo donde una plataforma como Tu Préstamo conecta directamente a personas que necesitan un préstamo con inversionistas que buscan rendimiento. Al eliminar al banco como intermediario, logramos tasas más justas para prestatarios y mejores ganancias para inversionistas.</p>
          </FaqItem>

        </div>
      </div>
      {showBorrowerForm && (
        <LoanRequestForm onClose={() => setShowBorrowerForm(false)} role="prestatario" />
      )}
    </section>
  );
};

export default FAQ;
