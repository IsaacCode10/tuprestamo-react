import React, { useEffect, useState } from 'react';
import { supabase } from '@/supabaseClient';

const AmortizationSchedule = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opportunityId, setOpportunityId] = useState(null);
  const [rows, setRows] = useState([]);

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
  if (!opportunityId) return <div className="card" style={{ marginTop: 16 }}><h3>Amortización</h3><p>No se encontró una oportunidad activa para tu cuenta.</p></div>;
  if (!rows || rows.length === 0) return <div className="card" style={{ marginTop: 16 }}><h3>Amortización</h3><p>Tu cronograma estará disponible tras el desembolso.</p></div>;

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
          {rows.map((r) => (
            <tr key={r.installment_no}>
              <td style={{ padding: 8 }}>{r.installment_no}</td>
              <td style={{ padding: 8 }}>{new Date(r.due_date).toLocaleDateString('es-BO')}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.payment).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.principal).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.interest).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{Number(r.balance).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
              <td style={{ padding: 8 }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AmortizationSchedule;

