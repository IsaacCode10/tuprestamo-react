import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
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

export default function InvestorCalculator() {
  const location = useLocation()
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
      <h1 style={{ marginBottom: 8, textAlign: "center" }}>Calculadora de Ganancias</h1>
      <p style={{ marginTop: 0, color: '#444', textAlign: 'center' }}>Compara un Depósito a Plazo Fijo (DPF) vs invertir con Tu Préstamo.</p>

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
                {[12,18,24].map(m => (
                  <button key={m} className={`term-button ${months===m ? 'selected' : ''}`} onClick={() => setMonths(m)} type="button">{m} meses</button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label>Tasa de tu DPF</label>
              <div className="term-buttons">
                {[0.03, 0.035, 0.04].map(r => (
                  <button key={r} className={`term-button ${dpfRate===r ? 'selected' : ''}`} onClick={() => setDpfRate(r)} type="button">{(r*100).toFixed(1)}%</button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <button className="btn btn--primary" onClick={handleOpenLead}>Calcular mi Ganancia Adicional</button>
            </div>
          </div>
        </div>

        {/* Columna derecha: Resultados y comparativa */}
          <div className="calculator-column results-column">
          <h3>Resultados</h3>
          {!saved ? (
            <div style={{ color:'#666' }}>
              <p>Ingresa los datos y presiona "Calcular mi Ganancia Adicional" para ver tu ProyecciÃƒÂ³n.</p>
              <ComparisonNotes />
            </div>
          ) : (
            <>
              <div className="savings-summary">
                <p className="savings-label"><strong>ProyecciÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡n lista.</strong> Esta es tu comparaciÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡n estimada.</p>
              </div>
              <RateVersusComparison amount={amount} years={years} dpfRate={dpfRate} tpRates={[0.15, 0.12]} />
              <Scenarios amount={amount} years={years} dpfRate={dpfRate} rates={[0.10,0.12,0.15]} />
            </>
          )}
        </div>
      </div>

      {showLead && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 50 }} onClick={() => setShowLead(false)}>
          <div style={{ background:'#fff', borderRadius:8, padding:20, width:'min(520px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
            <h3>Ver mi ProyecciÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡n Ahora</h3>
            <p style={{ color:'#444' }}>DÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â®janos tu correo y WhatsApp para enviarte el resultado y un acceso directo.</p>
            <div style={{ display:'grid', gap:12 }}>
              <div>
                <label>Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="tu@correo.com" style={{ width:'100%' }} />
              </div>
              <div>
                <label>WhatsApp (opcional)</label>
                <input type="tel" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} placeholder="7XX XXX XX" style={{ width:'100%' }} />
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button className="btn" onClick={()=>setShowLead(false)}>Cancelar</button>
                <button className="btn btn--primary" onClick={saveLead} disabled={sending || !email}>{sending? 'Enviando...':'Ver mi ProyecciÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡n'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Bar({ label, height, value, color }){
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ width: 120, height, background: color, borderRadius: 6, display:'flex', alignItems:'end', justifyContent:'center' }}>
        <span style={{ fontSize:12, marginBottom:4 }}>Bs {Math.round(value).toLocaleString('es-BO')}</span>
      </div>
      <div style={{ marginTop: 6, fontWeight:600 }}>{label}</div>
    </div>
  )
}

function Scenarios({ amount, years, dpfRate, rates }){
  const dpfEnd = calculateReturns(amount, years, dpfRate)
  const labels = ['Conservador (A)', 'Balanceado (B)', 'DinÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­mico (C)']
  return (
    <div>
      <h3>Escenarios de retorno</h3>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{textAlign:'left', padding:8}}>Escenario</th>
            <th style={{textAlign:'right', padding:8}}>Tu Pr&eacute;stamo (final)</th>
            <th style={{textAlign:'right', padding:8}}>DPF (final)</th>
            <th style={{textAlign:'right', padding:8}}>Ganancia adicional</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r,i)=>{
            const tpEnd = calculateReturns(amount, years, r)
            const extra = Math.max(0, tpEnd - dpfEnd)
            return (
              <tr key={r} style={{ borderTop:'1px solid #f0f0f0' }}>
                <td style={{ padding:8 }}>{labels[i]}</td>
                <td style={{ padding:8, textAlign:'right' }}>Bs {Math.round(tpEnd).toLocaleString('es-BO')}</td>
                <td style={{ padding:8, textAlign:'right' }}>Bs {Math.round(dpfEnd).toLocaleString('es-BO')}</td>
                <td style={{ padding:8, textAlign:'right', color:'#11696b', fontWeight:600 }}>Bs {Math.round(extra).toLocaleString('es-BO')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop:16, textAlign:"center" }}>
        <a className="btn btn--primary" href="/auth">Crear mi cuenta</a>
      </div>
      <div style={{ marginTop:24 }}>
        <h3 style={{ textAlign:"center" }}>Diferencias clave</h3>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{textAlign:'left', padding:8}}></th>
              <th style={{textAlign:'left', padding:8}}>DPF</th>
              <th style={{textAlign:'left', padding:8}}>Tu Pr&eacute;stamo</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop:'1px solid #f0f0f0' }}>
              <td style={{ padding:8 }}>Flujo de pagos</td>
              <td style={{ padding:8 }}>Inter&eacute;s al final del plazo</td>
              <td style={{ padding:8 }}>Inter&eacute;s + capital mensual</td>
            </tr>
            <tr style={{ borderTop:'1px solid #f0f0f0' }}>
              <td style={{ padding:8 }}>Liquidez</td>
              <td style={{ padding:8 }}>Retiro anticipado penalizado</td>
              <td style={{ padding:8 }}>Flujos mensuales reinvertibles</td>
            </tr>
            <tr style={{ borderTop:'1px solid #f0f0f0' }}>
              <td style={{ padding:8 }}>Inter&eacute;s compuesto</td>
              <td style={{ padding:8 }}>Limitado</td>
              <td style={{ padding:8 }}>Natural con reinversi&oacute;n</td>
            </tr>
            <tr style={{ borderTop:'1px solid #f0f0f0' }}>
              <td style={{ padding:8 }}>TrÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­mite</td>
              <td style={{ padding:8 }}>Presencial: solicitar y firmar en sucursal</td>
              <td style={{ padding:8 }}>100% en lÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡nea</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RateVersusComparison({ amount, years, dpfRate, tpRates }) {
  const [bestRate, avgRate] = tpRates;
  const dpfEnd = calculateReturns(amount, years, dpfRate);
  const bestEnd = calculateReturns(amount, years, bestRate);
  const avgEnd = calculateReturns(amount, years, avgRate);
  return (
    <div className="rate-compare">
      <h4 className="rate-compare__title">ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­Compara tasas y montos finales!</h4>
      <div className="rate-compare__grid">
        <div className="rate-compare__col rate-compare__col--highlight">
          <div className="rate-compare__col-title rate-compare__col-title--highlight">Nuestra mejor tasa</div>
          <div className="rate-compare__row"><span>Tasa anual</span><strong>{(bestRate*100).toFixed(0)}%</strong></div>
          <div className="rate-compare__row"><span>Monto final</span><strong className="text-success">Bs {Math.round(bestEnd).toLocaleString('es-BO')}</strong></div>
        </div>
        <div className="rate-compare__col">
          <div className="rate-compare__col-title">Nuestra tasa promedio</div>
          <div className="rate-compare__row"><span>Tasa anual</span><strong>{(avgRate*100).toFixed(0)}%</strong></div>
          <div className="rate-compare__row"><span>Monto final</span><strong>Bs {Math.round(avgEnd).toLocaleString('es-BO')}</strong></div>
        </div>
        <div className="rate-compare__col rate-compare__col--danger">
          <div className="rate-compare__col-title rate-compare__col-title--danger">Tasa de DPF</div>
          <div className="rate-compare__row"><span>Tasa anual</span><strong className="text-danger">{(dpfRate*100).toFixed(1)}%</strong></div>
          <div className="rate-compare__row"><span>Monto final</span><strong className="text-danger">Bs {Math.round(dpfEnd).toLocaleString('es-BO')}</strong></div>
        </div>
      </div>
    </div>
  )
}

function ComparisonNotes() {
  return (
    <div style={{ fontSize:14, color:'#555' }}>
      <ul style={{ paddingLeft: '1.1rem' }}>
        <li>El DPF paga al final del plazo y penaliza retiros anticipados.</li>
        <li>En Tu Pr&eacute;stamo recibes pagos mensuales (inter&eacute;s + capital) que puedes reinvertir.</li>
        <li>Mostramos tres escenarios de rendimiento: 10%, 12% y 15% anual.</li>
        <li>100% en l&iacute;nea y r&aacute;pido; el DPF requiere sucursal, firmas y esperas.</li>
      </ul>
    </div>
  )
}

