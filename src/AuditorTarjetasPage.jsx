import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { trackEvent } from '@/analytics.js';
import LoanRequestForm from '@/LoanRequestForm.jsx';
import './AuditorTarjetasPage.css';

const MONTHLY_INSURANCE = 3.07;
const PUNITIVE_INTEREST = 0.07;
const DEFERRED_RATIO = 3704.29 / 8402.8;
const TERM_MONTHS = 12;

const PROFILE_OPTIONS = {
  A: { label: 'Perfil A', annualRate: 0.15, originationPct: 3 },
  B: { label: 'Perfil B', annualRate: 0.17, originationPct: 4 },
  C: { label: 'Perfil C', annualRate: 0.2, originationPct: 5 },
};

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

const calculateBankScenario = ({ debt, tna, maintenance, monthlySpend }) => {
  const monthlyRate = tna / 100 / 12;
  const interestOnDebt = debt * monthlyRate;
  const interestOnSpend = monthlySpend * monthlyRate;
  const monthlyInterest = interestOnDebt + interestOnSpend;
  const minimumPayment = monthlyInterest + (debt * 0.01);
  const annualInterest = monthlyInterest * 12;
  const annualFixedCharges = (maintenance + MONTHLY_INSURANCE) * 12;
  const annualCost = annualInterest + annualFixedCharges;
  const creditLimit = Math.ceil(Math.max(17000, debt * 1.8) / 1000) * 1000;
  const availableCredit = Math.max(creditLimit - debt, 0);
  const deferredAmount = debt * DEFERRED_RATIO;

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
    previousBalance: debt + monthlyInterest + maintenance + MONTHLY_INSURANCE + PUNITIVE_INTEREST,
  };
};

const calculateTuPrestamoScenario = ({ debt, profileKey }) => {
  const profile = PROFILE_OPTIONS[profileKey];
  const origination =
    debt <= 10000
      ? 450
      : debt * (profile.originationPct / 100) / (1 - profile.originationPct / 100);
  const grossPrincipal = debt <= 10000 ? debt + 450 : debt / (1 - profile.originationPct / 100);
  const monthlyRate = profile.annualRate / 12;
  const baseInstallment =
    monthlyRate === 0
      ? grossPrincipal / TERM_MONTHS
      : (grossPrincipal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -TERM_MONTHS));

  let balance = grossPrincipal;
  let totalInterest = 0;
  let totalAdmin = 0;

  for (let installmentNo = 1; installmentNo <= TERM_MONTHS; installmentNo += 1) {
    const interest = balance * monthlyRate;
    const principalPayment = baseInstallment - interest;
    const adminFee = Math.max(balance * 0.0015, 10);
    totalInterest += interest;
    totalAdmin += adminFee;
    balance = Math.max(balance - principalPayment, 0);
  }

  const displayedInstallment = baseInstallment + totalAdmin / TERM_MONTHS;
  const annualCost = (grossPrincipal + totalInterest + totalAdmin) - debt;
  const totalToPay = debt + annualCost;

  return {
    profile,
    origination,
    grossPrincipal,
    totalInterest,
    totalAdmin,
    displayedInstallment,
    annualCost,
    totalToPay,
  };
};

const AuditorTarjetasPage = () => {
  const [debt, setDebt] = useState(8402.8);
  const [tna, setTna] = useState(24);
  const [maintenance, setMaintenance] = useState(120);
  const [monthlySpend, setMonthlySpend] = useState(1800);
  const [profileKey, setProfileKey] = useState('B');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [completedTracked, setCompletedTracked] = useState(false);

  const bankScenario = useMemo(
    () => calculateBankScenario({ debt, tna, maintenance, monthlySpend }),
    [debt, maintenance, monthlySpend, tna],
  );
  const tuPrestamoScenario = useMemo(
    () => calculateTuPrestamoScenario({ debt, profileKey }),
    [debt, profileKey],
  );
  const annualSavings = Math.max(bankScenario.annualCost - tuPrestamoScenario.annualCost, 0);
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
      bank_tna: tna,
      monthly_spend: round2(monthlySpend),
      maintenance_fee: round2(maintenance),
      selected_profile: profileKey,
      annual_savings: round2(annualSavings),
    });
    setCompletedTracked(true);
  }, [annualSavings, completedTracked, debt, hasInteracted, maintenance, monthlySpend, profileKey, tna]);

  const markInteraction = (inputName, value) => {
    if (!hasInteracted) {
      trackEvent('Started Auditor Simulation', {
        first_input: inputName,
      });
      setHasInteracted(true);
    }

    setCompletedTracked(false);

    if (inputName === 'debt') setDebt(value);
    if (inputName === 'tna') setTna(value);
    if (inputName === 'maintenance') setMaintenance(value);
    if (inputName === 'monthlySpend') setMonthlySpend(value);
    if (inputName === 'profile') {
      setProfileKey(value);
      trackEvent('Changed Auditor Profile', { selected_profile: value });
    }
  };

  const handleOpenModal = () => {
    trackEvent('Clicked Auditor CTA', {
      debt_amount: round2(debt),
      annual_savings: round2(annualSavings),
      selected_profile: profileKey,
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <Helmet>
        <title>Auditor de Tarjetas en Bolivia | Calcula cuánto te cuesta tu tarjeta</title>
        <meta
          name="description"
          content="Audita los cargos de tu tarjeta de crédito en Bolivia, estima intereses, mantenimiento y descubre cuánto podrías ahorrar refinanciando con Tu Préstamo."
        />
        <meta
          name="keywords"
          content="calculadora tarjeta de crédito Bolivia, auditor de tarjetas Bolivia, intereses tarjeta BNB Bolivia, refinanciar tarjeta de crédito Bolivia"
        />
        <link rel="canonical" href="https://tuprestamobo.com/auditor-de-tarjetas" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Auditor de Tarjetas',
            url: `${siteOrigin}/auditor-de-tarjetas`,
            description:
              'Herramienta para auditar cargos anuales de una tarjeta de crédito en Bolivia y comparar un escenario estimado de refinanciamiento con Tu Préstamo.',
            inLanguage: 'es-BO',
          })}
        </script>
      </Helmet>

      <div className="auditor-page">
        <section className="auditor-hero">
          <div className="auditor-shell">
            <div className="auditor-hero__copy">
              <span className="auditor-eyebrow">Auditor de Tarjetas</span>
              <h1>Descubre cuánto te está costando realmente tu tarjeta</h1>
              <p>
                Simula los cargos de tu extracto, revisa el costo anual de mantener la deuda
                y compáralo con un escenario estimado de refinanciamiento con Tu Préstamo.
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
                <p>Usa datos aproximados de tu tarjeta para ver el impacto anual.</p>
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
                <span>TNA de tu tarjeta</span>
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
              </label>

              <div className="auditor-field">
                <span>Escenario estimado con Tu Préstamo</span>
                <div className="auditor-profile-switcher" role="tablist" aria-label="Perfil estimado">
                  {Object.entries(PROFILE_OPTIONS).map(([key, option]) => {
                    const active = profileKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={`auditor-profile-switcher__item ${active ? 'is-active' : ''}`}
                        onClick={() => markInteraction('profile', key)}
                      >
                        {option.label}
                        <strong>{Math.round(option.annualRate * 100)}%</strong>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="auditor-page__section">
          <div className="auditor-shell auditor-shell--narrow">
            <div className="auditor-summary-grid">
              <article className="auditor-summary-card auditor-summary-card--bank">
                <span className="auditor-summary-card__label">Tu banco actual</span>
                <strong>Bs {formatCurrency(bankScenario.annualCost)}</strong>
                <p>Gasto anual estimado entre intereses, mantenimiento y seguro.</p>
              </article>
              <article className="auditor-summary-card auditor-summary-card--tp">
                <span className="auditor-summary-card__label">Tu Préstamo</span>
                <strong>Bs {formatCurrency(tuPrestamoScenario.annualCost)}</strong>
                <p>Escenario a 12 meses con {tuPrestamoScenario.profile.label.toLowerCase()}.</p>
              </article>
              <article className="auditor-summary-card auditor-summary-card--saving">
                <span className="auditor-summary-card__label">Ahorro estimado</span>
                <strong>Bs {formatCurrency(annualSavings)}</strong>
                <p>Si calificas, este es el espacio económico que podrías recuperar en un año.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="auditor-page__section auditor-page__section--statement">
          <div className="auditor-shell auditor-shell--narrow">
            <div className="statement-frame">
              <div className="statement-frame__topbar">
                <div className="statement-frame__brand statement-frame__brand--bank">
                  <span>Tu banco actual</span>
                  <strong>Extracto auditado</strong>
                </div>
                <div className="statement-frame__brand statement-frame__brand--tp">
                  <span>Tu Préstamo</span>
                  <strong>Escenario comparativo</strong>
                </div>
              </div>

              <div className="statement-header-grid">
                <div className="statement-box">
                  <span className="statement-box__label">Período estimado</span>
                  <strong>Últimos 30 días</strong>
                </div>
                <div className="statement-box">
                  <span className="statement-box__label">Pago mínimo actual</span>
                  <strong>Bs {formatCurrency(bankScenario.minimumPayment)}</strong>
                </div>
                <div className="statement-box">
                  <span className="statement-box__label">T.E.A. estimada</span>
                  <strong>{(bankScenario.tea * 100).toFixed(2)}%</strong>
                </div>
                <div className="statement-box">
                  <span className="statement-box__label">Cuota con Tu Préstamo</span>
                  <strong>Bs {formatCurrency(tuPrestamoScenario.displayedInstallment)}</strong>
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
                  <span>Saldo anterior</span>
                  <strong>Bs {formatCurrency(bankScenario.previousBalance)}</strong>
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
                      <td>Neto a refinanciar: Bs {formatCurrency(debt)}</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Cargo mantenimiento de cuenta</td>
                      <td>Bs {formatCurrency(maintenance)}</td>
                      <td>Bs 0.00</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Intereses por consumos</td>
                      <td>Bs {formatCurrency(bankScenario.monthlyInterest)}</td>
                      <td>Cuota fija estimada a 12 meses</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Seguro de desgravamen</td>
                      <td>Bs {formatCurrency(MONTHLY_INSURANCE)}</td>
                      <td>Incluido en admin + seguro</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Intereses punitorios</td>
                      <td>Bs {formatCurrency(PUNITIVE_INTEREST)}</td>
                      <td>Sin cargo simulado</td>
                    </tr>
                    <tr>
                      <td>Hoy</td>
                      <td>Estado de diferimientos</td>
                      <td>Monto diferido: Bs {formatCurrency(bankScenario.deferredAmount)}</td>
                      <td>Originación: Bs {formatCurrency(tuPrestamoScenario.origination)}</td>
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
                  <span>Costo anual Tu Préstamo</span>
                  <strong>Bs {formatCurrency(tuPrestamoScenario.annualCost)}</strong>
                </div>
                <div className="statement-footer-box statement-footer-box--highlight">
                  <span>Podrías ahorrar</span>
                  <strong>Bs {formatCurrency(annualSavings)}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="auditor-page__section">
          <div className="auditor-shell auditor-shell--narrow">
            <div className="auditor-cta">
              <div>
                <span className="auditor-eyebrow">Auditoría estimada</span>
                <h2>Si quieres, el siguiente paso es validar si calificas</h2>
                <p>
                  La oferta final depende de tu perfil de riesgo y del saldo verificado en tus
                  documentos. Este cálculo es una referencia comercial para que veas el impacto
                  de seguir financiando tu tarjeta versus consolidarla.
                </p>
              </div>
              <button type="button" className="auditor-cta__button" onClick={handleOpenModal}>
                Recibir mi auditoría gratis
              </button>
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
      </div>

      {isModalOpen && <LoanRequestForm onClose={() => setIsModalOpen(false)} role="prestatario" />}
    </>
  );
};

export default AuditorTarjetasPage;
