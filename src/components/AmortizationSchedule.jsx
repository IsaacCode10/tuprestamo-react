import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { calcTPBreakdown } from '@/utils/loan.js';

const AmortizationSchedule = ({ userId, fallbackOpportunity = null, fallbackSolicitud = null }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opportunityId, setOpportunityId] = useState(null);
  const [rows, setRows] = useState([]);

  const simulatedRows = useMemo(() => {
    const opp = fallbackOpportunity || {};
    const sol = fallbackSolicitud || {};
    const neto = Number(opp.saldo_deudor_verificado || sol.saldo_deuda_tc || sol.monto_solicitado || 0);
    const plazo = Number(opp.plazo_meses || sol.plazo_meses || 0);
    const tasa = Number(opp.tasa_interes_prestatario || sol.tasa_interes_tc || 0);
    const originacionPct = Number(opp.comision_originacion_porcentaje || 0);
    if (!neto || neto <= 0 || !plazo || plazo <= 0 || !tasa) return [];

    const breakdown = calcTPBreakdown(neto, tasa, plazo, originacionPct);
    const serviceTotalDb = Number(opp.comision_servicio_seguro_total || 0);
    const adminSeguroFlat = plazo > 0
      ? (serviceTotalDb > 0 ? serviceTotalDb / plazo : (breakdown.totalServiceFee || 0) / plazo)
      : 0;
    const monthlyRate = tasa / 100 / 12;
    const montoBrutoDb = Number(opp.monto || 0);
    const principal = montoBrutoDb > 0 ? montoBrutoDb : (breakdown.bruto || neto);
    const cuotaPromedioDb = Number(opp.cuota_promedio || 0);
    const paymentTotal = cuotaPromedioDb > 0 ? cuotaPromedioDb : ((breakdown.monthlyPaymentAmort || 0) + adminSeguroFlat);
    const paymentBase = Math.max(0, paymentTotal - adminSeguroFlat);
    let balance = principal;
    const sim = [];
    for (let i = 1; i <= plazo; i++) {
      const interest = balance * monthlyRate;
      const principal = paymentBase - interest;
      balance = Math.max(0, balance - principal);
      sim.push({
        installment_no: i,
        due_date: null,
        payment: paymentTotal,
        principal,
        interest,
        balance,
        status: 'Simulado',
      });
    }
    return sim;
  }, [fallbackOpportunity, fallbackSolicitud]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!userId) {
          throw new Error('No hay usuario activo');
        }

        const { data: opp, error: oppErr } = await supabase
          .from('oportunidades')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (oppErr) throw oppErr;
        if (!opp) {
          if (isMounted) {
            setOpportunityId(null);
            setRows([]);
          }
          return;
        }

        if (isMounted) setOpportunityId(opp.id);

        const { data: amort, error: amErr } = await supabase
          .from('amortizaciones')
          .select('installment_no, due_date, principal, interest, payment, balance, status')
          .eq('opportunity_id', opp.id)
          .order('installment_no', { ascending: true });

        if (amErr) throw amErr;
        if (isMounted) setRows(amort || []);
      } catch (e) {
        if (isMounted) setError(e.message || 'Error al cargar la amortización');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [userId]);

  if (loading) return <div className="card" style={{ marginTop: 16 }}><h3>Amortización</h3><p>Cargando…</p></div>;
  if (error) return <div className="card" style={{ marginTop: 16 }}><h3>Amortización</h3><p style={{ color: '#a94442' }}>{error}</p></div>;
  if (!opportunityId && (!simulatedRows || simulatedRows.length === 0)) return <div className="card" style={{ marginTop: 16 }}><h3>Amortización</h3><p>No se encontró una oportunidad activa para tu cuenta.</p></div>;
  const displayRows = (rows && rows.length > 0) ? rows : simulatedRows;
  if (!displayRows || displayRows.length === 0) return <div className="card" style={{ marginTop: 16 }}><h3>Amortización</h3><p>Tu cronograma estará disponible tras el desembolso.</p></div>;

  return (
    <div className="card" style={{ marginTop: 16, overflowX: 'auto' }}>
      <h3>Tabla de Amortización</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>#</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Vencimiento</th>
            <th style={{ textAlign: 'right', padding: 8 }}>Cuota (Bs)</th>
            <th style={{ textAlign: 'right', padding: 8 }}>Capital</th>
            <th style={{ textAlign: 'right', padding: 8 }}>Interés</th>
            <th style={{ textAlign: 'right', padding: 8 }}>Saldo</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((r) => (
            <tr key={r.installment_no}>
              <td style={{ padding: 8 }}>{r.installment_no}</td>
              <td style={{ padding: 8 }}>{r.due_date ? new Date(r.due_date).toLocaleDateString('es-BO') : '—'}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.payment).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.principal).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.interest).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.balance).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: 8 }}>{r.status || 'Pendiente'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AmortizationSchedule;
