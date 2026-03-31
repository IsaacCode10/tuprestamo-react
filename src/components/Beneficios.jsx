import React from 'react';

const benefits = [
  {
    label: 'Costo',
    title: 'Menos costo que seguir con tu tarjeta',
    text: 'Si hoy pagas intereses altos y cargos mensuales, refinanciar puede ayudarte a recuperar control sobre tu deuda.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4.5" y="6.5" width="15" height="11" rx="2.2" />
        <circle cx="12" cy="12" r="2.2" />
        <path d="M7 10h.01" />
        <path d="M17 14h.01" />
      </svg>
    ),
  },
  {
    label: 'Banco',
    title: 'Pago directo a tu banco',
    text: 'El desembolso va directo al banco acreedor para cancelar la deuda de tu tarjeta de crédito.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4 4 8v1h16V8l-8-4Z" />
        <path d="M6 10v7" />
        <path d="M10 10v7" />
        <path d="M14 10v7" />
        <path d="M18 10v7" />
        <path d="M4 18h16" />
      </svg>
    ),
  },
  {
    label: 'Claridad',
    title: 'Condiciones más claras',
    text: 'Antes de aceptar, conoces la tasa, los costos y el proceso de refinanciar tu deuda, sin letras pequeñas.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h7l4 4v12H7z" />
        <path d="M14 4v4h4" />
        <path d="M10 13h5" />
        <path d="M10 17h4" />
      </svg>
    ),
  },
  {
    label: 'Perfil',
    title: 'Evaluación según tu perfil',
    text: 'Evaluamos tu perfil para ofrecerte condiciones acordes a tu situación financiera.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M6.5 19c1.5-2.7 3.3-4 5.5-4s4 1.3 5.5 4" />
      </svg>
    ),
  },
];

const Beneficios = () => {
  return (
    <section id="beneficios" className="section section--benefits">
      <div className="container benefits-shell">
        <h2 className="section__title">¿Por qué Tu Préstamo?</h2>
        <p className="section__subtitle section__subtitle--centered">
          No se trata solo de pagar menos en tu tarjeta de crédito. Se trata de entender mejor tu deuda y salir de ella con condiciones más claras.
        </p>

        <div className="benefits-grid">
          {benefits.map((benefit) => (
            <article key={benefit.title} className="benefit-card">
              <div className="benefit-card__icon-wrap">
                <div className="benefit-card__icon">{benefit.icon}</div>
              </div>
              <span className="benefit-card__eyebrow">{benefit.label}</span>
              <h3 className="benefit-card__title">{benefit.title}</h3>
              <p className="benefit-card__text">{benefit.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Beneficios;
