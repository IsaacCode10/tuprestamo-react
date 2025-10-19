import React, { useState } from 'react';

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
  return (
    <section id="faq" className="section section--white">
      <div className="container">
        <h2 className="section__title">Preguntas Frecuentes</h2>
        <div className="faq-list">

          <h3>Para Prestatarios</h3>
          <FaqItem question="¿Qué tasa de interés se paga en un préstamo P2P en Bolivia?">
            <p>En Tu Préstamo, ofrecemos una tasa de interés anual fija para nuestros refinanciamientos de tarjetas de crédito. Nuestro objetivo es que siempre sea significativamente menor al 24% que pagas actualmente en tu banco. La tasa exacta se confirmará en tu proceso de aprobación.</p>
          </FaqItem>

          <FaqItem question="Además del interés, ¿qué comisiones cobra Tu Préstamo Bolivia?">
            <p>Creemos en la transparencia total. A diferencia de los bancos, <strong>no cobramos un 'cargo de mantenimiento' mensual</strong>. Nuestros costos son: 1) Una <strong>Comisión por Originación</strong> que varía según tu perfil de riesgo (desde 3.0% para los mejores perfiles). 2) Una pequeña <strong>Comisión por Servicio y Seguro</strong> (0.15% mensual) que se calcula sobre tu saldo deudor, por lo que disminuye cada mes.</p>
          </FaqItem>

          <FaqItem question="¿Cómo funciona el proceso de evaluación crediticia?">
            <p>Nuestro proceso combina tecnología y experiencia humana. Primero, nuestro algoritmo realiza una pre-selección inicial. Luego, nuestra analista experta (Sarai) verifica tus ingresos, antigüedad laboral e historial de pagos (incluyendo consulta en Infocred) para asegurar que el perfil del prestatario sea de bajo riesgo y pueda cumplir con el pago.</p>
          </FaqItem>

          <FaqItem question="¿Cómo puedo solicitar un préstamo?">
            <p>Es muy sencillo. Haz clic en “Quiero refinanciar” (o en el botón de solicitud), completa el formulario con tus datos y documentos solicitados. Nuestro equipo revisará tu solicitud y recibirás una respuesta clara en pocos días.</p>
          </FaqItem>

          <h3 style={{ marginTop: '30px' }}>Para Inversionistas</h3>
          <FaqItem question="¿Cuál es el rendimiento anual al invertir en préstamos P2P en Bolivia?">
            <p>Podrás obtener un rendimiento anual bruto de hasta el 15%, significativamente superior al 3.5% de los DPFs. Nuestra comisión es simple y transparente: cobramos el <strong>1% sobre cada pago que recibes</strong> (capital + interés). Esto alinea nuestro éxito con el tuyo y te permite obtener un rendimiento neto muy superior al de los productos tradicionales.</p>
          </FaqItem>

          <FaqItem question="¿Es seguro invertir en Tu Préstamo? ¿Cómo minimizan el riesgo?">
            <p>Minimizamos el riesgo mediante un riguroso proceso de selección de prestatarios, que incluye evaluación experta (nuestra analista Sarai), verificación de documentos, consulta a Infocred y contratos con reconocimiento de firma. Adicionalmente, los préstamos cuentan con un seguro de desgravamen.</p>
          </FaqItem>

          <FaqItem question="¿Cuál es el monto mínimo para invertir?">
            <p>Puedes empezar a invertir desde <strong>Bs 700</strong> por cada oportunidad de préstamo. Esto te permite diversificar tu capital entre diferentes préstamos.</p>
          </FaqItem>

          <FaqItem question="¿Cada cuánto tiempo recibiré los pagos de mi inversión?">
            <p>Los prestatarios realizan pagos mensuales. Nosotros gestionamos la cobranza y distribuimos automáticamente tu porción correspondiente de capital e intereses a tu cuenta bancaria cada mes. Lo mejor de todo es que podras reinvertir tus ganancias generando asi el interes compuesto que un DPF no te ofrece.</p>
          </FaqItem>

          <h3 style={{ marginTop: '30px' }}>Preguntas Generales</h3>
          <FaqItem question="¿Tu Préstamo está regulado en Bolivia?">
            <p>Operamos bajo el marco de la regulación FINTECH en Bolivia, incluyendo el Decreto Supremo N° 5384 y en línea con las futuras reglamentaciones de la ASFI. Estamos comprometidos con la transparencia y el cumplimiento normativo.</p>
          </FaqItem>

          <FaqItem question="¿Quiénes somos en Tu Préstamo?">
            <p>Somos una plataforma boliviana de financiamiento colectivo (P2P Lending) dedicada a conectar prestatarios de alto perfil que buscan refinanciar sus deudas de tarjetas de crédito con inversionistas que buscan rendimientos atractivos. Nuestra misión es ofrecer alternativas financieras justas y transparentes para un mejor futuro económico.</p>
          </FaqItem>
          
          <FaqItem question="¿Qué es el 'P2P Lending' o financiamiento colectivo?">
            <p>El P2P (Peer-to-Peer) Lending es un modelo donde una plataforma como Tu Préstamo conecta directamente a personas que necesitan un préstamo con inversionistas que buscan un buen rendimiento. Al eliminar al banco como intermediario, logramos tasas más justas para prestatarios y ganancias más altas para inversionistas. Es una alternativa financiera moderna, transparente y en crecimiento en Bolivia.</p>
          </FaqItem>

        </div>
      </div>
    </section>
  );
};

export default FAQ;
