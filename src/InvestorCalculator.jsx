import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProfile } from '@/hooks/useProfile.js'
import { supabase } from './supabaseClient'
import { trackEvent } from '@/analytics.js'
import './InvestorCalculator.css'

function calculateReturns(amount, years, rate) {
  const a = Number(amount || 0)
  const t = Number(years || 0)
  const r = Number(rate || 0)
  if (a <= 0 || t <= 0 || r <= 0) return a
  return a * Math.pow(1 + r, t)
}

function calculateSimpleReturns(amount, years, rate) {
  const a = Number(amount || 0)
  const t = Number(years || 0)
  const r = Number(rate || 0)
  if (a <= 0 || t <= 0 || r <= 0) return a
  return a * (1 + r * t)
}

function calculateMonthlyCompoundReturns(amount, years, rate) {
  const a = Number(amount || 0)
  const t = Number(years || 0)
  const r = Number(rate || 0)
  if (a <= 0 || t <= 0 || r <= 0) return a
  return a * Math.pow(1 + r / 12, 12 * t)
}

export default function InvestorCalculator() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [amount, setAmount] = useState(700)
  const [months, setMonths] = useState(12) // 12, 18, 24 meses
  const years = useMemo(() => months / 12, [months])
  const [dpfRate, setDpfRate] = useState(0.03) // 3%, 3.5%, 4%
  const [showLead, setShowLead] = useState(false)
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { trackEvent('Calculator_Viewed', {}) }, [])

  const result = useMemo(() => {
    const dpf = calculateReturns(amount, years, dpfRate)
    const tp = calculateReturns(amount, years, 0.12) // referencia media
    const extra = Math.max(0, tp - dpf)
    return { dpf, tp, extra }
  }, [amount, years, dpfRate])

  const handleOpenLead = () => {
    trackEvent('Calculator_Calculate_Clicked', { amount, months, dpfRate })
    setShowLead(true)
    trackEvent('Calculator_LeadForm_Viewed', { amount, months, dpfRate })
  }

  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const utm = useMemo(() => ({
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  }), [params])

  const saveLead = async () => {
    setSending(true)
    try {
      if (!email) throw new Error('Ingresa tu email')
      const payload = {
        email,
        whatsapp: whatsapp || null,
        amount,
        term_months: months,
        term_years: years,
        projected_gain: Number(result.extra.toFixed(2)),
        tasa_dpf: dpfRate,
        scenario_rates: [0.10, 0.12, 0.15],
        ...utm,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }
      const { error: fnErr } = await supabase.functions.invoke('save-investor-lead', { body: payload })
      if (fnErr) { console.warn('save-investor-lead failed', fnErr.message) }

      trackEvent('Calculator_Lead_Submitted', {
        amount,
        term_months: months,
        projected_gain: payload.projected_gain,
        tasa_dpf: dpfRate,
        ...utm,
      })
      setSaved(true)
      setShowLead(false)
      trackEvent('Calculator_Result_Viewed', { amount, months, projected_gain: payload.projected_gain })
    } catch (e) {
      alert(e.message || 'No se pudo enviar. Intenta nuevamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="calculator-page-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      <h1 style={{ marginBottom: 8, textAlign: 'center' }}>Calculadora de Ganancias</h1>
      <p style={{ marginTop: 0, color: '#444', textAlign: 'center' }}>Compara un Dep&oacute;sito a Plazo Fijo (DPF) vs invertir con Tu Pr&eacute;stamo.</p>
      {profile?.role === 'inversionista' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, marginBottom: 16 }}>
          <button className="btn" onClick={() => navigate('/investor-dashboard')}>Volver al Panel</button>
        </div>
      )}

      <div className="calculator-layout">
        {/* Columna izquierda: Inputs */}
        <div className="calculator-column inputs-column">
          <h3>Simula tu Retorno</h3>
          <div className="calculator-inputs">
            <div className="input-group">
              <label>Monto (Bs.)</label>
              <input type="range" min={700} max={20000} step={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              <span className="slider-value">Bs. {Number(amount).toLocaleString('es-BO')}</span>
            </div>
            <div className="input-group">
              <label>Plazo</label>
              <div className="term-buttons">
                {[12, 18, 24].map((m) => (
                  <button key={m} className={`term-button ${months === m ? 'selected' : ''}`} onClick={() => setMonths(m)} type="button">
                    {m} meses
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label>Tasa de tu DPF</label>
              <div className="term-buttons">
                {[0.03, 0.035, 0.04].map((r) => (
                  <button key={r} className={`term-button ${dpfRate === r ? 'selected' : ''}`} onClick={() => setDpfRate(r)} type="button">
                    {(r * 100).toFixed(1)}%
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <button className="btn btn--primary" onClick={handleOpenLead}>
                Calcular mi Ganancia Adicional
              </button>
            </div>
          </div>
        </div>

        {/* Columna derecha: Resultados y comparativa */}
        <div className="calculator-column results-column">
          <h3>Resultados</h3>
          {!saved ? (
            <div style={{ color: '#666' }}>
              <p>
                Ingresa los datos y presiona "Calcular mi Ganancia Adicional" para ver tu proyecci&oacute;n.
              </p>
              <ComparisonNotes />
            </div>
          ) : (
            <>
              <div className="savings-summary">
                <p className="savings-label">
                  <strong>Proyecci&oacute;n lista.</strong> Esta es tu comparaci&oacute;n estimada.
                </p>
              </div>
              <RateVersusComparison amount={amount} years={years} dpfRate={dpfRate} tpRates={[0.15, 0.12]} />
              <Scenarios amount={amount} years={years} dpfRate={dpfRate} rates={[0.10, 0.12, 0.15]} />
            </>
          )}
        </div>
      </div>

      {showLead && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setShowLead(false)}
        >
          <div style={{ background: '#fff', borderRadius: 8, padding: 20, width: 'min(520px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
            <h3>Ver mi Proyecci&oacute;n Ahora</h3>
            <p style={{ color: '#444' }}>D&eacute;janos tu correo y WhatsApp para enviarte el resultado y un acceso directo.</p>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" style={{ width: '100%' }} />
              </div>
              <div>
                <label>WhatsApp (opcional)</label>
                <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="7XX XXX XX" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setShowLead(false)}>
                  Cancelar
                </button>
                <button className="btn btn--primary" onClick={saveLead} disabled={sending || !email}>
                  {sending ? 'Enviando...' : 'Ver mi Proyección'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RateVersusComparison({ amount, years, dpfRate, tpRates }) {
  const [bestRate, avgRate] = tpRates
  const dpfEnd = calculateReturns(amount, years, dpfRate)
  const bestEnd = calculateReturns(amount, years, bestRate)
  const avgEnd = calculateReturns(amount, years, avgRate)
  return (
    <div className="rate-compare">
      <h4 className="rate-compare__title">&iexcl;Compara tasas y montos finales!</h4>
      <div className="rate-compare__grid">
        <div className="rate-compare__col rate-compare__col--highlight">
          <div className="rate-compare__col-title rate-compare__col-title--highlight">Nuestra mejor tasa</div>
          <div className="rate-compare__row">
            <span>Tasa anual</span>
            <strong>{(bestRate * 100).toFixed(0)}%</strong>
          </div>
          <div className="rate-compare__row">
            <span>Monto final</span>
            <strong className="text-success">Bs {Math.round(bestEnd).toLocaleString('es-BO')}</strong>
          </div>
        </div>
        <div className="rate-compare__col">
          <div className="rate-compare__col-title">Nuestra tasa promedio</div>
          <div className="rate-compare__row">
            <span>Tasa anual</span>
            <strong>{(avgRate * 100).toFixed(0)}%</strong>
          </div>
          <div className="rate-compare__row">
            <span>Monto final</span>
            <strong>Bs {Math.round(avgEnd).toLocaleString('es-BO')}</strong>
          </div>
        </div>
        <div className="rate-compare__col rate-compare__col--danger">
          <div className="rate-compare__col-title rate-compare__col-title--danger">Tasa de DPF</div>
          <div className="rate-compare__row">
            <span>Tasa anual</span>
            <strong className="text-danger">{(dpfRate * 100).toFixed(1)}%</strong>
          </div>
          <div className="rate-compare__row">
            <span>Monto final</span>
            <strong className="text-danger">Bs {Math.round(dpfEnd).toLocaleString('es-BO')}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

function Scenarios({ amount, years, dpfRate, rates }) {
  const dpfEnd = calculateReturns(amount, years, dpfRate)
  const labels = ['Conservador (A)', 'Balanceado (B)', 'Dinamico (C)']
  const ratePercents = rates.map(r => `${(r * 100).toFixed(0)}%`)
  return (
    <div>
      <h3 style={{ textAlign: 'center' }}>Escenarios de retorno</h3>
      <table className="scenario-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'center', padding: 8 }}>Escenario</th>
            <th style={{ textAlign: 'center', padding: 8 }}>
              Tu Pr&eacute;stamo
              <br />(final)
            </th>
            <th style={{ textAlign: 'center', padding: 8 }}>
              DPF
              <br />(final, {(dpfRate*100).toFixed(1)}%)
            </th>
            <th style={{ textAlign: 'center', padding: 8 }}>
              Ganancia
              <br />adicional
            </th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r, i) => {
            const tpSimple = calculateSimpleReturns(amount, years, r)
            const tpCompound = calculateMonthlyCompoundReturns(amount, years, r)
            const extraSimple = Math.max(0, tpSimple - dpfEnd)
            const extraCompound = Math.max(0, tpCompound - dpfEnd)
            return (
              <tr key={r} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8, textAlign: 'center' }}>{labels[i]} ({ratePercents[i]})</td>
                <td className="scenario-cell scenario-cell--tp">
                  <div className="scenario-subtext">Sin reinversi&oacute;n</div>
                  <div className="scenario-amount">Bs&nbsp;{Math.round(tpSimple).toLocaleString('es-BO')}</div>
                  <div className="scenario-subtext">Con reinversi&oacute;n mensual</div>
                  <div className="scenario-amount scenario-amount--strong">Bs&nbsp;{Math.round(tpCompound).toLocaleString('es-BO')}</div>
                </td>
                <td style={{ padding: 8, textAlign: 'right' }}>
                  <span className="scenario-amount">Bs&nbsp;{Math.round(dpfEnd).toLocaleString('es-BO')}</span>
                </td>
                <td className="scenario-cell scenario-cell--gain">
                  <span className="scenario-badge">
                    Bs&nbsp;{Math.round(extraCompound).toLocaleString('es-BO')}
                  </span>
                  <div className="scenario-subtext">Sin reinversi&oacute;n: Bs&nbsp;{Math.round(extraSimple).toLocaleString('es-BO')}</div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <a className="btn btn--primary" href="/?open=investor-form#inversionistas">Crear mi cuenta</a>
      </div>
      <div style={{ marginTop: 24 }}>
        <h3 style={{ textAlign: 'center' }}>Diferencias clave</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}></th>
              <th style={{ textAlign: 'left', padding: 8 }}>DPF</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Tu Pr&eacute;stamo</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: 8 }}>Flujo de pagos</td>
              <td style={{ padding: 8 }}>Inter&eacute;s al final del plazo</td>
              <td style={{ padding: 8 }}>Inter&eacute;s + capital mensual</td>
            </tr>
            <tr style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: 8 }}>Liquidez</td>
              <td style={{ padding: 8 }}>Retiro anticipado penalizado</td>
              <td style={{ padding: 8 }}>Flujos mensuales reinvertibles</td>
            </tr>
            <tr style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: 8 }}>Inter&eacute;s compuesto</td>
              <td style={{ padding: 8 }}>Limitado</td>
              <td style={{ padding: 8 }}>Natural con reinversi&oacute;n</td>
            </tr>
            <tr style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: 8 }}>Tr&aacute;mite</td>
              <td style={{ padding: 8 }}>Presencial: solicitar y firmar en sucursal</td>
              <td style={{ padding: 8 }}>100% en l&iacute;nea</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ComparisonNotes() {
  return (
    <div style={{ fontSize: 14, color: '#555' }}>
      <ul style={{ paddingLeft: '1.1rem' }}>
        <li>El DPF paga al final del plazo y penaliza retiros anticipados.</li>
        <li>En Tu Pr&eacute;stamo recibes pagos mensuales (inter&eacute;s + capital) que puedes reinvertir.</li>
        <li>Mostramos tres escenarios de rendimiento: 10%, 12% y 15% anual.</li>
        <li>100% en l&iacute;nea y r&aacute;pido; el DPF requiere sucursal, firmas y esperas.</li>
      </ul>
    </div>
  )
}
