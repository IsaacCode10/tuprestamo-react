import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { trackEvent } from '@/analytics.js';
import InvestorBackBar from '@/components/InvestorBackBar.jsx';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';
// import './OpportunityDetail.css'; // We can create this later if needed

const OpportunityDetail = () => {
  const { id } = useParams(); // Get the ID from the URL
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  // Analítica centralizada via trackEvent

  // New state for the investment form
  const [investmentAmount, setInvestmentAmount] = useState(''); // texto en formato es-BO (puntos miles, coma decimales)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });
  const [intentInfo, setIntentInfo] = useState(null); // Datos del intent/QR mostrado al usuario
  const [countdown, setCountdown] = useState(''); // Temporizador de expiración
  const [payMode, setPayMode] = useState('qr'); // 'qr' | 'transfer'
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const fileInputRef = useRef(null);
  const qrSrc = '/qr-pago.png'; // QR estático desde /public; reemplazar por QR dinámico si se dispone
  const [showQrModal, setShowQrModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // --- Evento de Analítica: Viewed Loan Details ---
  useEffect(() => {
  if (opportunity && opportunity.id) {
      trackEvent('Viewed Loan Details', {
        loan_id: opportunity.id,
        loan_amount: opportunity.monto,
      });
    }
  }, [opportunity]);

  const fetchOpportunity = async () => {
    setLoading(true);
    setError(null);

    // Call the RPC function instead of a direct select
    const { data, error: rpcError } = await supabase
      .rpc('get_opportunity_details_with_funding', {
        p_opportunity_id: Number(id)
      })
      .single(); // The RPC returns a single record

    if (rpcError) {
      console.error('Error fetching opportunity details with funding:', rpcError);
      setError('Error al cargar los detalles de la oportunidad.');
      setOpportunity(null);
    } else if (!data) {
      setError('Oportunidad no encontrada.');
      setOpportunity(null);
    } else {
      // Normaliza faltantes para evitar NaN en UI
      setOpportunity({
        ...data,
        total_funded: Number(data?.total_funded || 0),
        saldo_pendiente: data?.saldo_pendiente != null ? Number(data.saldo_pendiente) : null,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (id) {
      fetchOpportunity();
      fetchExistingIntent();
    }
  }, [id, userId]);

  const fetchExistingIntent = async () => {
    try {
      if (!id || !userId) return;
      const { data, error: intentErr } = await supabase
        .from('payment_intents')
        .select('id, expected_amount, expires_at, status, payment_channel, receipt_url')
        .eq('investor_id', userId)
        .eq('opportunity_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (intentErr) throw intentErr;
      if (data) {
        setIntentInfo({
          id: data.id,
          expected_amount: data.expected_amount,
          expires_at: data.expires_at,
          status: data.status,
          payment_channel: data.payment_channel,
          receipt_url: data.receipt_url,
        });
        setCountdown('');
      }
    } catch (e) {
      console.error('Error fetching existing intent', e);
    }
  };

  const parseLocaleAmount = (raw) => {
    if (!raw || !raw.trim()) return { ok: false, value: null, error: 'Ingresa un monto válido.' };
    const onlyAllowed = raw.replace(/\s+/g, '');
    // Permitir ambos: 1.234,56 o 1,234.56 (puntos o comas como miles/decimales)
    // 1) detectar separador decimal (último . o , si hay ambos, toma el último)
    const lastDot = onlyAllowed.lastIndexOf('.');
    const lastComma = onlyAllowed.lastIndexOf(',');
    const decimalIdx = Math.max(lastDot, lastComma);
    let integerPart = onlyAllowed;
    let decimalPart = '';
    if (decimalIdx !== -1) {
      integerPart = onlyAllowed.slice(0, decimalIdx);
      decimalPart = onlyAllowed.slice(decimalIdx + 1);
    }
    // Validar que resto sean dígitos/puntos/commas en miles
    const intClean = integerPart.replace(/[.,]/g, '');
    if (!/^\d+$/.test(intClean)) {
      return { ok: false, value: null, error: 'Usa solo números con . o , para separar miles/decimales.' };
    }
    if (decimalPart && !/^\d{1,2}$/.test(decimalPart)) {
      return { ok: false, value: null, error: 'Solo se permiten hasta 2 decimales.' };
    }
    const normalized = decimalPart ? `${intClean}.${decimalPart}` : intClean;
    const num = parseFloat(normalized);
    if (isNaN(num) || num <= 0) return { ok: false, value: null, error: 'Ingresa un monto válido mayor a cero.' };
    return { ok: true, value: num };
  };

  const handleInvestment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });
    setIntentInfo(null);
    setCountdown('');

    const parsed = parseLocaleAmount(investmentAmount);
    if (!parsed.ok) {
      setFormMessage({ type: 'error', text: parsed.error });
      setIsSubmitting(false);
      return;
    }
    const amount = parsed.value;

    if (amount < 700) {
      setFormMessage({ type: 'error', text: 'La inversión mínima es de 700 Bs.' });
      setIsSubmitting(false);
      return;
    }

    // Optional: Check if investment exceeds opportunity amount
    const saldoPendiente = (opportunity?.saldo_pendiente != null)
      ? opportunity.saldo_pendiente
      : (opportunity.monto - (opportunity.total_funded || 0));

    if (saldoPendiente <= 0) {
      setFormMessage({ type: 'error', text: 'Esta oportunidad ya no tiene saldo pendiente por fondear.' });
      setIsSubmitting(false);
      return;
    }

    if (amount > saldoPendiente) {
        setFormMessage({ type: 'error', text: `El monto no puede exceder el saldo por invertir (Bs. ${Number(saldoPendiente).toLocaleString('es-BO')}).` });
        setIsSubmitting(false);
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        setFormMessage({ type: 'error', text: 'Debes iniciar sesión para invertir.' });
        setIsSubmitting(false);
        return;
    }

    // Gate de verificación: solo exigir verificación al momento de invertir
    try {
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('estado_verificacion')
        .eq('id', user.id)
        .single();
      if (pErr) throw pErr;
      if (!prof || prof.estado_verificacion !== 'verificado') {
        setFormMessage({ type: 'error', text: 'Para invertir, primero verifica tu identidad. Te llevaremos al centro de verificación.' });
        setIsSubmitting(false);
        setTimeout(() => navigate('/verificar-cuenta'), 1000);
        return;
      }
    } catch (e) {
      console.error('Error checking verification status:', e);
      setFormMessage({ type: 'error', text: 'No pudimos validar tu verificación. Intenta nuevamente.' });
      setIsSubmitting(false);
      return;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // expiración: 48h

    try {
      const { data: intent, error: intentError } = await supabase.rpc('create_investment_intent', {
        p_opportunity_id: Number(id),
        p_amount: amount,
      });
      if (intentError) {
        const msg = intentError?.message || '';
        setFormMessage({ type: 'error', text: msg.includes('No hay saldo disponible') ? msg : 'Hubo un error al registrar tu inversión. Revisa el monto y vuelve a intentar.' });
        throw intentError;
      }

      // --- Evento de Analítica: Reserva creada ---
      trackEvent('Created Investment Intent', {
        investment_amount: amount,
        loan_id: id,
        expires_at: expiresAt.toISOString(),
      });
      
      const intentPayload = {
        id: intent?.id,
        expected_amount: intent?.expected_amount || amount,
        expires_at: intent?.expires_at || expiresAt.toISOString(),
        payment_channel: intent?.payment_channel || 'qr',
        status: intent?.status || 'pending',
      };
      setFormMessage({ type: 'success', text: 'Tu reserva fue creada. Paga el monto exacto antes del vencimiento para confirmar tu fondeo.' });
      setIntentInfo(intentPayload);
      setCountdown(''); // se recalcula en useEffect
      setInvestmentAmount('');
      // Notificación in-app al inversionista
      try {
        if (user?.id) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Reserva creada',
            body: `Reserva Bs ${Number(intentPayload.expected_amount).toLocaleString('es-BO', { minimumFractionDigits: 2 })} vence ${new Date(intentPayload.expires_at).toLocaleString('es-BO')}`,
            link_url: `/oportunidades/${id}`,
            type: 'investment_intent',
          });
        }
      } catch (notifErr) {
        console.warn('No se pudo registrar la notificación de reserva', notifErr);
      }
      // Refresh data after successful intent to update barra (no suma hasta estado pagado)
      setTimeout(() => {
        fetchOpportunity();
        fetchExistingIntent();
      }, 2000); // Wait 2 seconds to let user read the message

    } catch (error) {
      console.error('Error creating investment:', error);
      setFormMessage({ type: 'error', text: 'Hubo un error al registrar tu inversión. Por favor, intenta de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenew = () => {
    if (!intentInfo?.expected_amount) return;
    setInvestmentAmount(String(intentInfo.expected_amount));
    setIntentInfo(null);
    setFormMessage({ type: '', text: '' });
    setCountdown('');
    setPayMode('qr');
    handleInvestment({ preventDefault() {} });
  };

  const cancelCurrentIntent = async () => {
    if (!intentInfo?.id) return;
    setIsCancelling(true);
    try {
      const { error: cancelErr } = await supabase.rpc('cancel_investment_intent', {
        p_payment_intent_id: intentInfo.id,
      });
      if (cancelErr) throw cancelErr;
      setFormMessage({ type: 'success', text: 'Reserva cancelada. Ingresa un nuevo monto si deseas cambiar tu inversión.' });
      setIntentInfo(null);
      setCountdown('');
      setInvestmentAmount('');
      fetchOpportunity();
    } catch (e) {
      console.error('Error cancelling intent', e);
      setFormMessage({ type: 'error', text: 'No pudimos cancelar la reserva. Intenta nuevamente.' });
    } finally {
      setIsCancelling(false);
    }
  };

  const uploadReceipt = async (fileOverride = null) => {
    try {
      const file = fileOverride || receiptFile;
      if (!file || !intentInfo?.id) return;
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        setFormMessage({ type: 'error', text: 'Formato no permitido. Usa PDF o imagen (JPG/PNG/WebP).' });
        return;
      }
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setFormMessage({ type: 'error', text: 'El archivo supera 5MB. Sube un comprobante más ligero.' });
        return;
      }
      const path = `payment-intents/${intentInfo.id}_${file.name}`;
      const { error: upErr, data } = await supabase.storage.from('comprobantes-pagos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const receiptUrl = data?.path || path;
      const { error: updErr } = await supabase
        .from('payment_intents')
        .update({ receipt_url: receiptUrl })
        .eq('id', intentInfo.id);
      if (updErr) throw updErr;
      setFormMessage({ type: 'success', text: 'Comprobante subido. Procesaremos tu pago al conciliar.' });
      setReceiptFile(null);
      // Notificación in-app para que el inversionista tenga trazabilidad del comprobante
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Comprobante enviado',
            body: 'Recibimos tu comprobante. Operaciones lo conciliarán pronto.',
            link_url: `/oportunidades/${id}`,
            type: 'investment_receipt_uploaded',
          });
        }
      } catch (notifErr) {
        console.warn('No se pudo registrar la notificación del comprobante', notifErr);
      }
      // Alerta a Operaciones por email (via edge function configurable)
      try {
        await supabase.functions.invoke('payment-intent-alert', {
          body: {
            type: 'receipt_uploaded',
            intent_id: intentInfo.id,
            opportunity_id: Number(id),
            expected_amount: intentInfo.expected_amount || amount,
            status: intentInfo.status,
            expires_at: intentInfo.expires_at,
          },
        });
      } catch (fnErr) {
        console.warn('No se pudo enviar alerta a Operaciones', fnErr);
      }
    } catch (e) {
      console.error('Upload receipt error', e);
      setFormMessage({ type: 'error', text: 'No pudimos subir el comprobante. Intenta nuevamente.' });
    }
  };

  const handleSelectReceipt = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setReceiptFile(file);
      uploadReceipt(file);
    }
    // reset input to allow reselect same file
    e.target.value = '';
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = qrSrc.split('/').pop() || 'qr-pago.png';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error descargando QR', e);
      setFormMessage({ type: 'error', text: 'No pudimos descargar el QR. Intenta nuevamente.' });
    }
  };

  const closeQrModal = () => setShowQrModal(false);

  // Countdown para expiración del intent
  useEffect(() => {
    if (!intentInfo?.expires_at) return;
    const target = new Date(intentInfo.expires_at).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown('Expirada');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${hours}h ${minutes}m restantes`);
    };
    tick();
    const id = setInterval(tick, 60 * 1000);
    return () => clearInterval(id);
  }, [intentInfo?.expires_at]);


  if (loading) {
    return <p>Cargando detalles de la oportunidad...</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate('/investor-dashboard')}>Volver a Oportunidades</button>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div>
        <p>No se pudo cargar la oportunidad.</p>
        <button onClick={() => navigate('/investor-dashboard')}>Volver a Oportunidades</button>
      </div>
    );
  }

  const rendimientoBruto = opportunity.tasa_rendimiento_inversionista;
  const comisionServicio = opportunity.comision_servicio_inversionista_porcentaje;
  // NEW v3.0 CALCULATION: Net Rate ≈ (Gross Rate * 0.99) - 1%
  const rendimientoNeto = (rendimientoBruto * (1 - (comisionServicio / 100))) - comisionServicio;

  // Calculations for the progress bar
  const totalFunded = opportunity.total_funded || 0;
  const totalGoal = opportunity.monto;
  const fundedPercentage = totalGoal > 0 ? (totalFunded / totalGoal) * 100 : 0;
  const remainingAmount = opportunity.saldo_pendiente != null
    ? opportunity.saldo_pendiente
    : totalGoal - totalFunded;

  return (
    <div className="opportunity-detail-container" style={{ maxWidth: '1180px', margin: '0 auto', padding: '20px' }}>
      <InvestorBackBar fallbackTo="/oportunidades" label="Volver a Oportunidades" />
      <InvestorBreadcrumbs items={[
        { label: 'Inicio', to: '/investor-dashboard' },
        { label: 'Oportunidades', to: '/oportunidades' },
        { label: 'Detalle' },
      ]} />
      <h2>Detalles de la Oportunidad ID: {opportunity.id}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16, alignItems: 'start' }}>
        {/* Columna izquierda: progreso + resumen + beneficios */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="funding-progress" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px' }}>
              <h4>Progreso de Financiamiento</h4>
              <div style={{ backgroundColor: '#e9ecef', borderRadius: '5px', height: '24px', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{
                      width: `${Math.min(fundedPercentage, 100)}%`,
                      height: '100%',
                      backgroundColor: '#28a745',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      transition: 'width 0.5s ease-in-out'
                  }}>
                      {fundedPercentage.toFixed(2)}%
                  </div>
              </div>
          <p>
              <strong>Recaudado:</strong> Bs. {totalFunded.toLocaleString('es-BO')} de Bs. {totalGoal.toLocaleString('es-BO')}
          </p>
          {remainingAmount > 0 ? (
             <p><strong>Saldo por invertir:</strong> Bs. {remainingAmount.toLocaleString('es-BO')}</p>
          ) : (
             <p><strong>¡Esta oportunidad ha sido completamente financiada!</strong></p>
          )}
      </div>

          <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
            <div>
              <p style={{ margin: 0, color: '#55747b', fontSize: '0.9rem' }}>Monto de la oportunidad</p>
              <p style={{ margin: 0, fontWeight: 700 }}>Bs. {opportunity.monto.toLocaleString('es-BO')}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: '#55747b', fontSize: '0.9rem' }}>Rendimiento anual</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{rendimientoBruto.toFixed(2)}%</p>
            </div>
            <div>
              <p style={{ margin: 0, color: '#55747b', fontSize: '0.9rem' }}>
                Rend. neto estimado
                <span title="Incluye comisión de servicio 1% sobre cada pago (capital+interés)" style={{ marginLeft: 4, color: '#0f5a62' }}>ℹ️</span>
              </p>
              <p style={{ margin: 0, fontWeight: 700 }}>{rendimientoNeto.toFixed(2)}%</p>
            </div>
            <div>
              <p style={{ margin: 0, color: '#55747b', fontSize: '0.9rem' }}>Plazo</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{opportunity.plazo_meses} meses</p>
            </div>
            <div>
              <p style={{ margin: 0, color: '#55747b', fontSize: '0.9rem' }}>Cupo restante</p>
              <p style={{ margin: 0, fontWeight: 700 }}>Bs. {remainingAmount.toLocaleString('es-BO')}</p>
            </div>
          </div>

          <div style={{ border: '1px solid #e6f2f4', background: '#f7fbfc', padding: '12px', borderRadius: 10 }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: 700, color: '#00445A' }}>¿Por qué invertir aquí?</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span role="img" aria-label="calendario">📅</span>
                <div style={{ fontSize: '0.92rem', color: '#0f5a62' }}>Cobros mensuales capital + interés.</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span role="img" aria-label="reinvertir">🔄</span>
                <div style={{ fontSize: '0.92rem', color: '#0f5a62' }}>Reinvierte y genera interés compuesto.</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span role="img" aria-label="transparencia">🔍</span>
                <div style={{ fontSize: '0.92rem', color: '#0f5a62' }}>Comisión 1% por pago; sin cargos ocultos.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna derecha: formulario + reserva */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {remainingAmount > 0 ? (
            <div className="investment-form" style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px' }}>
              <h3>Invertir en esta Oportunidad</h3>
              <p style={{ marginTop: 0, color: '#0f5a62' }}>Ingresa tu monto y registraremos tu reserva. Te daremos las instrucciones de pago para confirmarla.</p>
              <form onSubmit={handleInvestment}>
                <div style={{ marginBottom: '15px' }}>
                  <label htmlFor="investmentAmount">Monto a Invertir (Bs.):</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="investmentAmount"
                    value={investmentAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                    // Solo permitir dígitos, punto y coma
                    if (/^[0-9.,]*$/.test(val)) {
                      setInvestmentAmount(val);
                    }
                  }}
                    placeholder="Ej: 9.000,55"
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                  />
                </div>
                <button type="submit" disabled={isSubmitting} className="btn btn--primary">
                  {isSubmitting ? 'Registrando...' : 'Invertir ahora'}
                </button>
              </form>
          {formMessage.text && (
            <p style={{ color: formMessage.type === 'error' ? 'red' : '#0f5a62', marginTop: '15px', fontWeight: 600 }}>
              {formMessage.text}
            </p>
          )}
          {intentInfo && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#eef9f8', border: '1px solid #a8ede6', color: '#11696b' }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 700 }}>Reserva creada (válida 48h)</p>
              <ul style={{ paddingLeft: 18, margin: '0 0 8px 0', color: '#0f5a62' }}>
                <li>Paga exactamente <strong>Bs. {Number(intentInfo.expected_amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> con el QR en tu panel.</li>
                <li>Vence: {new Date(intentInfo.expires_at).toLocaleString('es-BO')} {countdown && countdown !== 'Expirada' ? `(${countdown})` : ''}</li>
              </ul>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleSelectReceipt}
                      style={{ display: 'none' }}
                    />
                    <button className="btn btn--secondary" type="button" onClick={triggerFileSelect}>
                      Subir comprobante
                    </button>
                    <button className="btn" type="button" onClick={cancelCurrentIntent} disabled={isCancelling}>
                      Cambiar monto
                    </button>
                  </div>
              {countdown === 'Expirada' && (
                <div style={{ margin: 0, color: '#b71c1c', fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>La reserva expiró.</span>
                  <button className="btn btn--primary" type="button" onClick={handleRenew}>Renovar reserva</button>
                </div>
              )}
                </div>
              )}
              {intentInfo && (
                <div style={{ marginTop: 14, borderTop: '1px solid #e6f2f4', paddingTop: 12 }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 700, color: '#00445A' }}>Medios de pago</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button type="button" className={['btn', payMode === 'qr' ? 'btn--primary' : 'btn--secondary'].join(' ')} onClick={() => setPayMode('qr')}>
                      QR
                    </button>
                    <button type="button" className={['btn', payMode === 'transfer' ? 'btn--primary' : 'btn--secondary'].join(' ')} onClick={() => { setPayMode('transfer'); setShowTransferModal(true); }}>
                      Transferencia
                    </button>
                  </div>
                  {payMode === 'qr' && (
                    <div style={{ padding: 10, border: '1px dashed #a8ede6', borderRadius: 10, background: '#f7fbfc', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                      <p style={{ margin: 0, color: '#0f5a62', fontWeight: 600 }}>Escanea este QR para pagar tu reserva</p>
                      <div
                        onClick={() => setShowQrModal(true)}
                        style={{ cursor: 'zoom-in', borderRadius: 12, padding: 6, transition: 'transform 0.2s', display: 'inline-block' }}
                      >
                        <img
                          src={qrSrc}
                          alt="QR de pago Tu Préstamo"
                          style={{ width: 220, height: 220, objectFit: 'contain', display: 'block' }}
                        />
                      </div>
                      <small style={{ color: '#55747b' }}>Monto exacto: Bs. {Number(intentInfo.expected_amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                      <button className="btn" type="button" onClick={handleDownloadQr} style={{ marginTop: 6 }}>
                        Descargar QR
                      </button>
                    </div>
                  )}
                  {payMode === 'transfer' && (
                    <div style={{ padding: 10, border: '1px dashed #a8ede6', borderRadius: 10, background: '#f7fbfc', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{ margin: 0, color: '#0f5a62', fontWeight: 600 }}>Datos de transferencia</p>
                      <div style={{ color: '#0d1a26' }}>Banco: Ganadero · Cuenta Corriente</div>
                      <div style={{ color: '#0d1a26' }}>N° de cuenta: 000-0000000</div>
                      <div style={{ color: '#0d1a26' }}>Beneficiario: Tu Préstamo Bolivia SRL</div>
                      <div style={{ color: '#0d1a26' }}>Moneda: Bolivianos</div>
                      <small style={{ color: '#55747b' }}>Monto exacto: Bs. {Number(intentInfo.expected_amount || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
          <button onClick={() => navigate('/investor-dashboard')} className="btn" style={{ alignSelf: 'flex-start' }}>
            Volver a Oportunidades
          </button>
        </div>
      </div>
      {showQrModal && <QrModal src={qrSrc} onClose={closeQrModal} />}
    </div>
  );
};

export default OpportunityDetail;

// Modal ligero para ampliar el QR (sin dependencias adicionales)
const QrModal = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
    }} onClick={onClose}>
      <div
        style={{
          background: '#fff',
          padding: 16,
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={src} alt="QR ampliado" style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }} />
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <button className="btn" type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};
