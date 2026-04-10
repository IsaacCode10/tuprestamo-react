import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
          <FaqItem question="¿Cómo puedo solicitar una evaluación para pagar la deuda de mi tarjeta de crédito?">
            <p>
              Muy simple. Haz clic en{' '}
              <button type="button" className="link-button cta-inline" onClick={() => setShowBorrowerForm(true)}>
                <strong>“Quiero refinanciar”</strong>
              </button>
              , completa el formulario con tus datos y documentos. Revisamos tu caso y te damos una respuesta clara en pocos días.
            </p>
          </FaqItem>

          <FaqItem question="¿Qué tasa podría pagar para salir de la deuda de mi tarjeta de crédito?">
            <p>
              En Tu Pr&eacute;stamo ofrecemos una tasa anual fija para pagar la deuda de tu tarjeta de cr&eacute;dito.
              Nuestro objetivo es que sea menor al ~24% que muchas tarjetas cobran en Bolivia. La tasa exacta se confirma
              cuando aprobamos tu solicitud. Pagas en <strong>cuota fija mensual</strong> y el <strong>pago se hace directo a tu banco acreedor</strong>.
            </p>
          </FaqItem>

          <FaqItem question="Además del interés, ¿qué comisiones cobra Tu Préstamo?">
            <p>
              Transparencia total: <strong>no cobramos mantenimiento mensual</strong>.
              Comisiones aplicables: 1) <strong>Originación</strong> (una sola vez): <strong>Bs 450</strong> para montos hasta <strong>Bs 10.000</strong>;
              por montos mayores aplica <strong>A 3% / B 4% / C 5%</strong> seg&uacute;n tu perfil de riesgo.
              2) <strong>Servicio + Seguro</strong>: 0,15% mensual sobre el saldo deudor.
            </p>
          </FaqItem>

          <FaqItem question="¿Cómo funciona la evaluación crediticia?">
            <p>
              Primero revisamos tu solicitud y luego validamos tus documentos, ingresos, antig&uuml;edad laboral y
              perfil crediticio. Con esa informaci&oacute;n confirmamos si puedes avanzar y cu&aacute;les ser&iacute;an tus condiciones.
            </p>
          </FaqItem>

          <FaqItem question="¿El pago del préstamo va directo a mi cuenta?">
            <p>
              No. En Tu Pr&eacute;stamo el desembolso se hace <strong>directo a tu banco acreedor</strong> para pagar la deuda
              de tu tarjeta de cr&eacute;dito. As&iacute; el proceso es m&aacute;s claro y el uso del pr&eacute;stamo queda definido desde el inicio.
            </p>
          </FaqItem>

          <FaqItem question="¿Cómo puedo calcular la TEA, los intereses y las comisiones de mi tarjeta?">
            <p>
              Puedes usar nuestro{' '}
              <Link to="/auditor-de-tarjetas" className="link-button cta-inline">
                <strong>auditor de tarjetas</strong>
              </Link>
              . Ah&iacute; ver&aacute;s una estimaci&oacute;n de <strong>TNA, TEA, mantenimiento, seguro e intereses</strong>
              para entender mejor cu&aacute;nto te cuesta hoy tu tarjeta en Bolivia.
            </p>
          </FaqItem>

          <FaqItem question="¿Puedo pagar m&aacute;s que mi cuota este mes?">
            <p>¡S&iacute;! Y es una gran decisi&oacute;n. Todo pago extra se aplica <strong>100% a capital</strong>, reduciendo intereses futuros y acortando la vida del pr&eacute;stamo.</p>
          </FaqItem>

          <FaqItem question="¿Me cobran algo si liquido antes mi pr&eacute;stamo?">
            <p>No. <strong>Cero comisiones por pago anticipado</strong>. Solo pagas el capital pendiente y los intereses generados hasta ese d&iacute;a.</p>
          </FaqItem>

          <FaqItem question="¿C&oacute;mo aplican mi pago extra?">
            <p>Primero verificamos la cuota del mes. El excedente (o el pago extra) va directo a <strong>capital</strong>. Recalculamos tu plan manteniendo la cuota y <strong>reduciendo el plazo</strong>.</p>
          </FaqItem>

          <h3 style={{ marginTop: '30px' }}>Para Inversionistas</h3>
          <FaqItem question="¿Cuál es el rendimiento anual al invertir en Tu Préstamo?">
            <p>
              El rendimiento anual estimado puede llegar a <strong>15%</strong>, seg&uacute;n la oportunidad.
              Es una alternativa para quienes buscan m&aacute;s que el rendimiento tradicional de un dep&oacute;sito a plazo fijo.
              Nuestra comisi&oacute;n es de <strong>1% sobre cada pago que recibes</strong>.
            </p>
          </FaqItem>

          <FaqItem question="¿Es seguro invertir en Tu Préstamo? ¿Cómo minimizan el riesgo?">
            <p>Seleccionamos prestatarios de alto perfil con verificación documental y consulta a Infocred. Además, los préstamos cuentan con <strong>seguro de desgravamen</strong>.</p>
          </FaqItem>

          <FaqItem question="¿Cuál es el monto mínimo y cada cuánto recibo pagos?">
            <p>
              Puedes empezar desde <strong>Bs 700</strong> por oportunidad. Los pagos se acreditan <strong>mensualmente</strong>
              y puedes reinvertir para seguir haciendo crecer tu capital.
            </p>
          </FaqItem>

          <h3 style={{ marginTop: '30px' }}>Preguntas Generales</h3>
          <FaqItem question="¿Qué es Tu Préstamo?">
            <p>
              Somos una plataforma boliviana que conecta personas que necesitan pagar la deuda de su tarjeta de cr&eacute;dito
              con inversionistas que buscan rendimiento. Nuestro objetivo es ofrecer una alternativa m&aacute;s clara y transparente.
            </p>
          </FaqItem>

          <FaqItem question="¿Tu Préstamo opera en Bolivia?">
            <p>
              S&iacute;. Tu Pr&eacute;stamo est&aacute; enfocado en el mercado boliviano y opera con un compromiso claro de
              transparencia, validaci&oacute;n de informaci&oacute;n y cumplimiento.
            </p>
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
