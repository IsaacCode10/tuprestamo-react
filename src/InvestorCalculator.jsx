import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { trackEvent } from '@/analytics.js'

function calculateReturns(amount, years, rate) {
  const a = Number(amount || 0)
  const t = Number(years || 0)
  const r = Number(rate || 0)
  if (a <= 0 || t <= 0 || r <= 0) return a
  return a * Math.pow(1 + r, t)
}

export default function InvestorCalculator() {
  const navigate = useNavigate()
  const location = useLocation()
  const [amount, setAmount] = useState(10000)
  const [years, setYears] = useState(3)
  const [showLead, setShowLead] = useState(false)
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [sending, setSending] = useState(false)
  const [saved, setSaved] = useState(false)

  const dpfRate = 0.03
  const tpRate = 0.09

  useEffect(() => {
    trackEvent('Calculator_Viewed', {})
  }, [])

  const result = useMemo(() => {
    const dpf = calculateReturns(amount, years, dpfRate)
    const tp = calculateReturns(amount, years, tpRate)
    const extra = Math.max(0, tp - dpf)
    return { dpf, tp, extra }
  }, [amount, years])

  const handleOpenLead = () => {
    trackEvent('Calculator_Calculate_Clicked', { amount, years })
    setShowLead(true)
    trackEvent('Calculator_LeadForm_Viewed', { amount, years })
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
        term_years: years,
        projected_gain: Number(result.extra.toFixed(2)),
        tasa_dpf: dpfRate,
        tasa_tp: tpRate,
        ...utm,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }
      const { error } = await supabase.from('investor_leads').insert(payload)
      if (error) {
        // Si la tabla/policy no existe aún, no bloqueamos la UX
        console.warn('No se pudo guardar el lead:', error.message)
      }
      trackEvent('Calculator_Lead_Submitted', {
        amount,
        term_years: years,
        projected_gain: payload.projected_gain,
        ...utm,
      })
      setSaved(true)
      setShowLead(false)
      trackEvent('Calculator_Result_Viewed', { amount, years, projected_gain: payload.projected_gain })
    } catch (e) {
      alert(e.message || 'No se pudo enviar. Intenta nuevamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px' }}>
      <h1 style={{ marginBottom: 8 }}>Calculadora de Ganancias</h1>
      <p style={{ marginTop: 0, color: '#444' }}>Compara un DPF tradicional vs invertir con Tu Préstamo.</p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr', marginTop: 16 }}>
        <div>
          <label>Monto (Bs): {amount.toLocaleString('es-BO')}</label>
          <input type="range" min={1000} max={50000} step={500} value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <label>Plazo:</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {[1,3,5].map(y => (
              <button key={y} onClick={() => setYears(y)} className={years===y? 'btn btn--primary':'btn'}>{y} año{s(y)}</button>
            ))}
          </div>
        </div>
        <div>
          <button className="btn btn--primary" onClick={handleOpenLead}>Calcular mi Ganancia Adicional</button>
        </div>
      </div>

      {saved && (
        <div style={{ marginTop: 20, padding: 16, border: '1px solid #a8ede6', background: '#eef9f8', borderRadius: 8 }}>
          <strong>Proyección lista.</strong> Esta es tu comparación estimada.
        </div>
      )}

      {(saved) && (
        <Results amount={amount} years={years} dpf={result.dpf} tp={result.tp} extra={result.extra} />
      )}

      {showLead && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 50 }} onClick={() => setShowLead(false)}>
          <div style={{ background:'#fff', borderRadius:8, padding:20, width:'min(520px, 92vw)' }} onClick={(e) => e.stopPropagation()}>
            <h3>Ver mi Proyección Ahora</h3>
            <p style={{ color:'#444' }}>Déjanos tu correo y WhatsApp para enviarte el resultado y contacto.</p>
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
                <button className="btn btn--primary" onClick={saveLead} disabled={sending || !email}>{sending? 'Enviando…':'Ver mi Proyección'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function s(n){ return n===1 ? '' : 's' }

function Results({ amount, years, dpf, tp, extra }){
  const max = Math.max(dpf, tp)
  const dpfH = Math.max(8, Math.round((dpf/max)*160))
  const tpH = Math.max(8, Math.round((tp/max)*160))
  return (
    <div style={{ marginTop: 24 }}>
      <h3>Comparación proyectada</h3>
      <div style={{ display:'flex', gap:16, alignItems:'end', height: 180 }}>
        <Bar label="DPF" height={dpfH} value={dpf} color="#cbd5e1" />
        <Bar label="Tu Préstamo" height={tpH} value={tp} color="#26C2B2" />
      </div>
      <div style={{ marginTop: 12, fontWeight:600, color:'#11696b' }}>Ganancia Adicional estimada: Bs {Math.round(extra).toLocaleString('es-BO')}</div>
      <div style={{ marginTop: 8, color:'#666' }}>Monto inicial: Bs {amount.toLocaleString('es-BO')} • Plazo: {years} año{s(years)}</div>
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
