import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { trackEvent } from '@/analytics.js';
import LoanRequestForm from '@/LoanRequestForm.jsx';
import './AuditorTarjetasPage.css';

const MONTHLY_INSURANCE = 3.07;
const PUNITIVE_INTEREST = 0.07;
const DEFERRED_RATIO = 3704.29 / 8402.8;
const REFERENCE_TU_PRESTAMO_RATE = 15;

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const formatCurrency = (value) =>
  round2(value).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const calculateTea = (tna) => {
  const monthlyRate = Number(tna) / 100 / 12;
  return Math.pow(1 + monthlyRate, 12) - 1;
};

const calculateBankScenario = ({ debt, creditLimit, tna, maintenance, monthlySpend }) => {
  const monthlyRate = tna / 100 / 12;
  const interestOnDebt = debt * monthlyRate;
  const interestOnSpend = monthlySpend * monthlyRate;
  const monthlyInterest = interestOnDebt + interestOnSpend;
  const minimumPayment = monthlyInterest + (debt * 0.01);
  const annualInterest = monthlyInterest * 12;
  const annualFixedCharges = (maintenance + MONTHLY_INSURANCE) * 12;
  const annualCost = annualInterest + annualFixedCharges;
  const availableCredit = Math.max(creditLimit - debt, 0);
  const deferredAmount = debt * DEFERRED_RATIO;
  const referenceInterestAt15 = debt * (REFERENCE_TU_PRESTAMO_RATE / 100);
  return {
    tea: calculateTea(tna),
    monthlyInterest,
    interestOnDebt,
    interestOnSpend,
    minimumPayment,
    annualInterest,
    annualFixedCharges,
    annualCost,
    creditLimit,
    availableCredit,
    deferredAmount,
    referenceInterestAt15,
    previousBalance: debt + monthlyInterest + maintenance + MONTHLY_INSURANCE + PUNITIVE_INTEREST,
  };
};

const AuditorTarjetasPage = () => {
  const [debt, setDebt] = useState(8402.8);
  const [creditLimit, setCreditLimit] = useState(17000);
  const [tna, setTna] = useState(24);
  const [maintenance, setMaintenance] = useState(120);
  const [monthlySpend, setMonthlySpend] = useState(1800);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [completedTracked, setCompletedTracked] = useState(false);

  const bankScenario = useMemo(
    () => calculateBankScenario({ debt, creditLimit, tna, maintenance, monthlySpend }),
    [creditLimit, debt, maintenance, monthlySpend, tna],
  );
  const annualMaintenanceCost = maintenance * 12;
  const annualReferenceInterestGap = Math.max(bankScenario.annualInterest - bankScenario.referenceInterestAt15, 0);
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tuprestamobo.com';

  useEffect(() => {
    trackEvent('Viewed Auditor Tarjetas Page', {
      page_name: 'auditor_tarjetas',
    });
  }, []);

  useEffect(() => {
    if (!hasInteracted || completedTracked) return;
    trackEvent('Completed Auditor Simulation', {
      debt_amount: round2(debt),
      credit_limit: round2(creditLimit),
      bank_tna: tna,
      monthly_spend: round2(monthlySpend),
      maintenance_fee: round2(maintenance),
      annual_cost: round2(bankScenario.annualCost),
    });
    setCompletedTracked(true);
  }, [bankScenario.annualCost, completedTracked, creditLimit, debt, hasInteracted, maintenance, monthlySpend, tna]);

  const markInteraction = (inputName, value) => {
    if (!hasInteracted) {
      trackEvent('Started Auditor Simulation', {
        first_input: inputName,
      });
      setHasInteracted(true);
    }

    setCompletedTracked(false);

    if (inputName === 'debt') setDebt(value);
    if (inputName === 'creditLimit') setCreditLimit(value);
    if (inputName === 'tna') setTna(value);
    if (inputName === 'maintenance') setMaintenance(value);
    if (inputName === 'monthlySpend') setMonthlySpend(value);
  };

  const handleOpenModal = () => {
    trackEvent('Clicked Auditor CTA', {
      debt_amount: round2(debt),
      credit_limit: round2(creditLimit),
      annual_cost: round2(bankScenario.annualCost),
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Calculadora de Intereses de Tarjeta de Crédito en Bolivia | Tu Préstamo</title>
        <meta
          name="description"
          content="Calcula intereses, TNA, TEA y comisiones de tu tarjeta de crédito en Bolivia. Usa esta calculadora gratuita para revisar tu extracto y comparar un escenario estimado de refinanciamiento con Tu Préstamo."
        />
        <meta
          name="keywords"
          content="calculadora tarjeta de crédito Bolivia, auditor de tarjetas Bolivia, calcular TEA Bolivia, comisiones tarjeta de crédito Bolivia, interés tarjeta BNB Bolivia"
        />
        <link rel="canonical" href="https://tuprestamobo.com/auditor-de-tarjetas" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'WebPage',
                name: 'Calculadora de Intereses de Tarjeta de Crédito en Bolivia',
                url: `${siteOrigin}/auditor-de-tarjetas`,
                description:
                  'Herramienta para auditar cargos, intereses y comisiones de una tarjeta de crédito en Bolivia y comparar un escenario estimado de refinanciamiento con Tu Préstamo.',
                inLanguage: 'es-BO',
              },
              {
                '@type': 'SoftwareApplication',
                name: 'Calculadora de Intereses de Tarjeta de Crédito en Bolivia',
                applicationCategory: 'FinanceApplication',
                operatingSystem: 'Web',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'BOB',
                },
                description:
                  'Simulador web para calcular intereses, TNA, TEA y comisiones de tarjetas de crédito en Bolivia.',
                url: `${siteOrigin}/auditor-de-tarjetas`,
              },
              {
                '@type': 'FinancialProduct',
                name: 'Auditor de Tarjetas de Tu Préstamo',
                provider: {
                  '@type': 'Organization',
                  name: 'Tu Préstamo',
                  url: siteOrigin,
                },
                category: 'Refinanciamiento de deuda de tarjeta de crédito',
                description:
                  'Herramienta informativa para estimar el costo financiero de una tarjeta de crédito en Bolivia y comparar un escenario estimado de consolidación.',
                areaServed: 'BO',
              },
              {
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: '¿Cuál es la diferencia entre TNA y TEA en una tarjeta de crédito?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'La TNA es la tasa nominal anual publicada por el banco. La TEA refleja el efecto de la capitalización mensual. Por ejemplo, una TNA de 24% genera una TEA aproximada de 26.82%.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: '¿Qué comisiones pueden encarecer una tarjeta de crédito en Bolivia?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Además de los intereses, el costo total puede incluir mantenimiento mensual, seguro de desgravamen y otros cargos operativos según la entidad emisora.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: '¿Cómo puedo reducir el costo financiero de mi tarjeta?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Una alternativa es consolidar la deuda con una tasa más baja y condiciones más claras. La oferta final siempre depende de la validación documental y del perfil de riesgo.',
                    },
                  },
                ],
              },
            ],
          })}
        </script>
      </Helmet>

      <div className="auditor-page">
        <section className="auditor-hero">
          <div className="auditor-shell">
            <div className="auditor-hero__copy">
              <span className="auditor-eyebrow">Auditor de Tarjetas</span>
              <h1>Calculadora de intereses de tarjeta de crédito en Bolivia</h1>
              <p>
                Estima cuánto pagas por intereses, mantenimiento y seguro en tu tarjeta de crédito.
                Entiende mejor tu extracto y descubre cuánto te puede costar seguir financiando tu deuda.
              </p>
              <div className="auditor-hero__badges">
                <span>Auditoría gratuita</span>
                <span>Resultado al instante</span>
                <span>Sin compromiso</span>
              </div>
            </div>

            <div className="auditor-controls">
              <div className="auditor-controls__header">
                <h2>Ajusta tu escenario</h2>
                <p>Usa datos aproximados de tu tarjeta para estimar su costo financiero real en Bolivia.</p>
              </div>

              <label className="auditor-field">
                <span>Deuda actual</span>
                <div className="auditor-field__split">
                  <input
                    type="range"
                    min="3000"
                    max="70000"
                    step="100"
                    value={debt}
                    onChange={(event) => markInteraction('debt', Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min="3000"
                    max="70000"
                    step="100"
                    value={debt}
                    onChange={(event) => markInteraction('debt', Number(event.target.value || 0))}
                  />
                </div>
              </label>

              <label className="auditor-field">
                <span>Límite de crédito de tu tarjeta</span>
                <div className="auditor-field__split">
                  <input
                    type="range"
                    min="3000"
                    max="70000"
                    step="100"
                    value={creditLimit}
                    onChange={(event) => markInteraction('creditLimit', Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min="3000"
                    max="70000"
                    step="100"
                    value={creditLimit}
                    onChange={(event) => markInteraction('creditLimit', Number(event.target.value || 0))}
                  />
                </div>
                <p className="auditor-field__help">
                  Este dato sale en tu extracto y nos permite mostrar de forma más fiel el crédito utilizado y el disponible.
                </p>
              </label>

              <label className="auditor-field">
                <span>
                  Tasa anual de tu tarjeta (T.N.A.)
                </span>
                <div className="auditor-field__split">
                  <input
                    type="range"
                    min="18"
                    max="50"
                    step="0.5"
                    value={tna}
                    onChange={(event) => markInteraction('tna', Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min="18"
                    max="50"
                    step="0.5"
                    value={tna}
                    onChange={(event) => markInteraction('tna', Number(event.target.value || 0))}
                  />
                </div>
                <p className="auditor-field__help">
                  Es la tasa que publica tu banco para tu tarjeta. Con ella estimamos cuánto interés genera tu deuda durante el año.
                </p>
              </label>

              <label className="auditor-field">
                <span>Mantenimiento mensual</span>
                <div className="auditor-field__split">
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={maintenance}
                    onChange={(event) => markInteraction('maintenance', Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="5"
                    value={maintenance}
                    onChange={(event) => markInteraction('maintenance', Number(event.target.value || 0))}
                  />
                </div>
              </label>

              <label className="auditor-field">
                <span>Gasto mensual estimado con la tarjeta</span>
                <div className="auditor-field__split">
                  <input
                    type="range"
                    min="0"
                    max="12000"
                    step="100"
                    value={monthlySpend}
                    onChange={(event) => markInteraction('monthlySpend', Number(event.target.value))}
                  />
                  <input
                    type="number"
                    min="0"
                    max="12000"
                    step="100"
                    value={monthlySpend}
                    onChange={(event) => markInteraction('monthlySpend', Number(event.target.value || 0))}
                  />
                </div>
                <p className="auditor-field__help">
                  Este monto sirve para simular consumos adicionales y estimar cómo pueden crecer los intereses mes a mes.
                </p>
              </label>
            </div>
          </div>
        </section>

        <section className="auditor-page__section">
          <div className="auditor-shell auditor-shell--narrow">
            <div className="auditor-summary-grid">
              <article className="auditor-summary-card auditor-summary-card--bank">
                <span className="auditor-summary-card__label">Costo anual estimado</span>
                <strong>Bs {formatCurrency(bankScenario.annualCost)}</strong>
                <p>Lo que podrías pagar en un año entre intereses, mantenimiento y seguro.</p>
              </article>
              <article className="auditor-summary-card auditor-summary-card--tp">
                <span className="auditor-summary-card__label">Solo en mantenimiento</span>
                <strong>Bs {formatCurrency(annualMaintenanceCost)}</strong>
                <p>Un cargo fijo mensual pequeño puede convertirse en un costo alto al año.</p>
              </article>
              <article className="auditor-summary-card auditor-summary-card--saving">
                <span className="auditor-summary-card__label">Intereses anuales estimados</span>
                <strong>Bs {formatCurrency(bankScenario.annualInterest)}</strong>
                <p>Es una referencia educativa del peso que pueden tener los intereses en un año.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="auditor-page__section auditor-page__section--statement">
          <div className="auditor-shell auditor-shell--narrow">
            <div className="statement-frame">
              <div className="statement-frame__topbar">
                <div className="statement-frame__brand statement-frame__brand--bank">
                  <span>Extracto auditado</span>
                  <strong>Extracto auditado</strong>
                </div>
              </div>

              <div className="statement-header-grid">
                <div className="statement-box">
                  <span className="statement-box__label">Período estimado</span>
                  <strong>Últimos 30 días</strong>
                </div>
                <div className="statement-box">
                  <span className="statement-box__label">Pago mínimo estimado</span>
                  <strong>Bs {formatCurrency(bankScenario.minimumPayment)}</strong>
                  <small className="statement-box__help">
                    Referencia educativa basada en el interés del mes más 1% del saldo. Tu banco puede calcularlo de otra forma.
                  </small>
                </div>
                <div className="statement-box">
                  <span className="statement-box__label">T.E.A. estimada</span>
                  <strong>{(bankScenario.tea * 100).toFixed(2)}%</strong>
                  <small className="statement-box__help">
                    La TEA muestra el costo real anual y suele ser más alta que la TNA.
                  </small>
                </div>
                <div className="statement-box">
                  <span className="statement-box__label">Costo anual estimado</span>
                  <strong>Bs {formatCurrency(bankScenario.annualCost)}</strong>
                  <small className="statement-box__help">
                    Resume el peso conjunto de intereses, mantenimiento y seguro en un año.
                  </small>
                </div>
              </div>

              <div className="statement-metrics-grid">
                <div className="statement-metric">
                  <span>Límite de crédito</span>
                  <strong>Bs {formatCurrency(bankScenario.creditLimit)}</strong>
                </div>
                <div className="statement-metric">
                  <span>Crédito utilizado</span>
                  <strong>Bs {formatCurrency(debt)}</strong>
                </div>
                <div className="statement-metric">
                  <span>Crédito disponible</span>
                  <strong>Bs {formatCurrency(bankScenario.availableCredit)}</strong>
                </div>
                <div className="statement-metric">
                  <span>T.N.A.</span>
                  <strong>{tna.toFixed(2)}%</strong>
                </div>
                <div className="statement-metric">
                  <span>Saldo actual</span>
                  <strong>Bs {formatCurrency(debt)}</strong>
                </div>
              </div>

              <div className="statement-table-wrap">
                <table className="statement-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Cargo / Debe</th>
                      <th>Comparativo Tu Préstamo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Hoy</td>
                      <td>Saldo de deuda auditado</td>
                      <td>Bs {formatCurrency(debt)}</td>
                      <td>Es el saldo base sobre el que el banco calcula intereses.</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Cargo mantenimiento de cuenta</td>
                      <td>Bs {formatCurrency(maintenance)}</td>
                      <td>Se cobra todos los meses, incluso cuando no haces nuevas compras.</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Intereses estimados del mes</td>
                      <td>Bs {formatCurrency(bankScenario.monthlyInterest)}</td>
                      <td>Incluye interés sobre tu saldo actual y sobre el gasto mensual que simulas.</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Seguro de desgravamen</td>
                      <td>Bs {formatCurrency(MONTHLY_INSURANCE)}</td>
                      <td>Es un cargo pequeño, pero repetido puede sumar más de lo que parece.</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Intereses punitorios</td>
                      <td>Bs {formatCurrency(PUNITIVE_INTEREST)}</td>
                      <td>Aparecen si hay retrasos o condiciones específicas del extracto.</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Estado de diferimientos</td>
                      <td>Monto diferido: Bs {formatCurrency(bankScenario.deferredAmount)}</td>
                      <td>El diferimiento puede aliviar el corto plazo, pero también extender el costo financiero.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="statement-footer-grid">
                <div className="statement-footer-box">
                  <span>Interés anual estimado</span>
                  <strong>Bs {formatCurrency(bankScenario.annualInterest)}</strong>
                </div>
                <div className="statement-footer-box">
                  <span>Mantenimiento anual</span>
                  <strong>Bs {formatCurrency(annualMaintenanceCost)}</strong>
                </div>
                <div className="statement-footer-box statement-footer-box--highlight">
                  <span>Interés anual al 15% de referencia</span>
                  <strong>Bs {formatCurrency(bankScenario.referenceInterestAt15)}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="auditor-page__section">
          <div className="auditor-shell auditor-shell--narrow">
            <div className="auditor-summary-grid">
              <article className="auditor-summary-card auditor-summary-card--bank">
                <span className="auditor-summary-card__label">Tu banco hoy</span>
                <strong>{tna.toFixed(2)}%</strong>
                <p>Tasa anual publicada por tu tarjeta, más mantenimiento y cargos recurrentes.</p>
              </article>
              <article className="auditor-summary-card auditor-summary-card--tp">
                <span className="auditor-summary-card__label">Tu Préstamo</span>
                <strong>Desde {REFERENCE_TU_PRESTAMO_RATE}%</strong>
                <p>Cargo mensual desde Bs 10 según saldo y condiciones más claras que una deuda revolvente.</p>
              </article>
              <article className="auditor-summary-card auditor-summary-card--saving">
                <span className="auditor-summary-card__label">Diferencia educativa</span>
                <strong>Bs {formatCurrency(annualReferenceInterestGap)}</strong>
                <p>Referencia simple de cuánto puede pesar una tasa más alta cuando sostienes deuda durante el año.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="auditor-page__section">
          <div className="auditor-shell auditor-shell--narrow">
            <div className="auditor-cta">
              <div>
                <span className="auditor-eyebrow">Auditoría estimada</span>
                <h2>Ahora que entiendes mejor tu extracto, puedes conocer una alternativa</h2>
                <p>
                  Tu Préstamo está pensado para personas que quieren dejar atrás una deuda cara y poco
                  transparente. La oferta final depende de tu perfil de riesgo y de la validación de tu saldo real.
                </p>
              </div>
              <div className="auditor-cta__actions">
                <div className="auditor-cta__list">
                  <span>Tasas desde 15% anual</span>
                  <span>Cargo mensual desde Bs 10 según saldo</span>
                  <span>Proceso claro y 100% online</span>
                </div>
                <button type="button" className="auditor-cta__button" onClick={handleOpenModal}>
                  Descubrir si califico
                </button>
              </div>
            </div>

            <div className="auditor-disclaimer-grid">
              <article>
                <h3>Qué verás aquí</h3>
                <p>Una estimación clara de intereses, cargos mensuales y tu ahorro potencial.</p>
              </article>
              <article>
                <h3>Importante</h3>
                <p>La oferta final depende de tu perfil y de la validación de tus documentos.</p>
              </article>
              <article>
                <h3>Siguiente paso</h3>
                <p>Si el resultado te conviene, puedes pedir tu evaluación con Tu Préstamo.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="auditor-page__section auditor-page__section--seo">
          <div className="auditor-shell auditor-shell--narrow">
            <div className="auditor-seo-intro">
              <span className="auditor-section-kicker">Guía útil</span>
              <h2>Cómo entender los intereses y comisiones de una tarjeta de crédito en Bolivia</h2>
              <p>
                Esta calculadora no solo sirve para simular. También responde preguntas que muchos
                usuarios tienen al revisar su extracto: cuánto interés realmente pagan, qué diferencia
                existe entre TNA y TEA y por qué cargos como mantenimiento o seguro pueden encarecer
                la deuda más de lo que parece.
              </p>
            </div>

            <div className="auditor-seo-grid">
              <article className="auditor-seo-card">
                <h3>¿Cuál es la diferencia entre la tasa anual y la TEA de mi tarjeta?</h3>
                <p>
                  La <strong>TNA</strong> es la tasa nominal anual publicada por el banco. La
                  <strong> TEA</strong> incorpora el efecto de la capitalización mensual y por eso
                  suele ser más alta. Un ejemplo común es una tarjeta con <strong>24% de TNA</strong>,
                  cuya <strong>TEA real ronda 26.82%</strong>. Esa diferencia importa porque cambia la
                  percepción del costo financiero real de la deuda.
                </p>
              </article>

              <article className="auditor-seo-card">
                <h3>¿Por qué el mantenimiento de cuenta encarece tanto una tarjeta?</h3>
                <p>
                  Aunque parezca pequeño, un cargo fijo mensual como <strong>Bs 120</strong> termina
                  sumando <strong>Bs 1.440 al año</strong>, sin contar seguro de desgravamen ni intereses.
                  Cuando una tarjeta mantiene saldo mes a mes, esos costos fijos se convierten en una
                  parte importante del gasto total y reducen tu capacidad de salir de la deuda.
                </p>
              </article>

              <article className="auditor-seo-card">
                <h3>¿Cómo bajar los intereses de una tarjeta de crédito en Bolivia?</h3>
                <p>
                  La forma más clara de reducir el costo financiero es bajar la tasa efectiva total
                  y eliminar cargos repetitivos poco transparentes. En Tu Préstamo mostramos un
                  escenario estimado de consolidación para que compares si te conviene pasar de una
                  deuda revolvente a una cuota más predecible. La propuesta final depende de tu
                  perfil y de la validación documental.
                </p>
              </article>
            </div>

            <div className="auditor-seo-bottom">
              <article className="auditor-seo-bottom__card">
                <h3>Qué resuelve esta calculadora de intereses</h3>
                <p>
                  Si llegaste buscando “cuánto es el interés de una tarjeta de crédito en Bolivia”,
                  “cómo calcular la TEA” o “qué comisiones cobran las tarjetas”, esta herramienta
                  te da una respuesta práctica y una referencia comparativa inmediata.
                </p>
              </article>

              <article className="auditor-seo-bottom__card">
                <h3>Qué debes recordar antes de decidir</h3>
                <p>
                  Todo cálculo de esta página es estimado. El monto final de refinanciamiento, la
                  tasa y la cuota definitiva se confirman solo después de validar tu documentación,
                  tu saldo real y tu perfil de riesgo.
                </p>
              </article>
            </div>
          </div>
        </section>
      </div>

      {isModalOpen && <LoanRequestForm onClose={() => setIsModalOpen(false)} role="prestatario" />}
    </>
  );
};

export default AuditorTarjetasPage;
