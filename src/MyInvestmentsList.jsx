import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { trackEvent } from '@/analytics.js';
import InvestorBackBar from '@/components/InvestorBackBar.jsx';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';

const MyInvestmentsList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [oppsById, setOppsById] = useState({});
  const [intentsMap, setIntentsMap] = useState({ byId: {}, byOpportunity: {} });
  const [investorSchedules, setInvestorSchedules] = useState({});
  const [payoutSignedMap, setPayoutSignedMap] = useState({});
  const [investorContractSignedMap, setInvestorContractSignedMap] = useState({});
  const [activeTab, setActiveTab] = useState('inversiones');
  const [nextPayments, setNextPayments] = useState([]);
  const [expandedOppRows, setExpandedOppRows] = useState({});

  const toLocalDate = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };
  const formatMoney = (value) => Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    trackEvent('Viewed Portfolio');
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Debes iniciar sesion para ver tu portafolio.');
          setLoading(false);
          return;
        }

        const { data: invs, error: invErr } = await supabase
          .from('inversiones')
          .select('id, opportunity_id, amount, status, created_at, investor_contract_url')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false });
        if (invErr) throw invErr;

        setRows(invs || []);
        const contractSignedMap = {};
        await Promise.all((invs || []).map(async (inv) => {
          if (!inv?.investor_contract_url) return;
          try {
            const { data: signed, error: signErr } = await supabase
              .storage
              .from('contratos')
              .createSignedUrl(inv.investor_contract_url, 60 * 60);
            if (!signErr && signed?.signedUrl) contractSignedMap[inv.id] = signed.signedUrl;
          } catch (_) {}
        }));
        setInvestorContractSignedMap(contractSignedMap);
        const oppIds = Array.from(new Set((invs || []).map(r => r.opportunity_id).filter(Boolean)));
        if (oppIds.length > 0) {
          const opps = await Promise.all(oppIds.map(async (oid) => {
            const { data, error } = await supabase
              .rpc('get_opportunity_details_with_funding', { p_opportunity_id: oid })
              .single();
            if (error) {
              console.warn('No se pudo cargar oportunidad', oid, error);
              return null;
            }
            return {
              id: data.id,
              monto: data.monto,
              plazo_meses: data.plazo_meses,
              perfil_riesgo: data.perfil_riesgo,
              tasa_rendimiento_inversionista: data.tasa_rendimiento_inversionista,
              total_funded: Number(data?.total_funded || 0),
              saldo_pendiente: data?.saldo_pendiente != null ? Number(data.saldo_pendiente) : null,
              estado: data?.estado,
            };
          }));
          const map = {};
          (opps || []).filter(Boolean).forEach(o => { map[o.id] = o; });
          setOppsById(map);

          const schedulesMap = {};
          await Promise.all(oppIds.map(async (oid) => {
            try {
              const { data, error } = await supabase
                .rpc('get_investor_installments', { p_opportunity_id: oid, p_investor_id: user.id });
              if (error) return;
              schedulesMap[oid] = (data || []).map((item) => ({ ...item, opportunity_id: oid }));
            } catch (_) {
              // noop
            }
          }));
          setInvestorSchedules(schedulesMap);
        } else {
          setOppsById({});
        }

        const { data: intentRows, error: intentErr } = await supabase
          .from('payment_intents')
          .select('id, opportunity_id, status, receipt_url, created_at')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false });
        if (intentErr) throw intentErr;
        const byId = {};
        const byOpportunity = {};
        (intentRows || []).forEach((row) => {
          byId[row.id] = row;
          if (!byOpportunity[row.opportunity_id]) {
            byOpportunity[row.opportunity_id] = row;
          }
        });
        setIntentsMap({ byId, byOpportunity });

        const { data: payoutRows, error: payoutErr } = await supabase
          .from('investor_payouts_view')
          .select('*')
          .eq('investor_id', user.id)
          .order('created_at', { ascending: false });
        if (payoutErr) throw payoutErr;
        setPayouts(payoutRows || []);
        const signedMap = {};
        await Promise.all((payoutRows || []).map(async (p) => {
          if (!p?.receipt_url) return;
          try {
            const { data: signed, error: signErr } = await supabase
              .storage
              .from('comprobantes-pagos')
              .createSignedUrl(p.receipt_url, 60 * 60);
            if (!signErr && signed?.signedUrl) signedMap[p.id] = signed.signedUrl;
          } catch (_) {}
        }));
        setPayoutSignedMap(signedMap);

        const { data: nextRows, error: nextErr } = await supabase
          .from('investor_next_payment_view')
          .select('*')
          .eq('investor_id', user.id);
        if (nextErr) throw nextErr;
        setNextPayments(nextRows || []);
      } catch (e) {
        console.error('Error loading portfolio:', e);
        setError('No pudimos cargar tu portafolio. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hasRows = useMemo(() => (rows || []).length > 0, [rows]);
  const paidPayouts = useMemo(() => payouts.filter((p) => (p.status || '').toLowerCase() === 'paid'), [payouts]);
  const pendingPayouts = useMemo(() => payouts.filter((p) => (p.status || '').toLowerCase() === 'pending'), [payouts]);
  const totalInvested = useMemo(
    () => rows.filter((r) => (r.status || '').toLowerCase() === 'pagado').reduce((acc, r) => acc + Number(r.amount || 0), 0),
    [rows]
  );
  const totalPaid = useMemo(() => paidPayouts.reduce((acc, p) => {
    const monto = p.paid_amount || p.amount || p.expected_amount || 0;
    return acc + Number(monto || 0);
  }, 0), [paidPayouts]);
  const nextPendingPayout = useMemo(() => {
    if (!pendingPayouts.length) return null;
    return [...pendingPayouts].sort((a, b) => {
      const aDate = new Date(a.created_at || a.paid_at || 0).getTime();
      const bDate = new Date(b.created_at || b.paid_at || 0).getTime();
      return aDate - bDate;
    })[0];
  }, [pendingPayouts]);
  const schedulesByOpp = useMemo(() => {
    const map = {};
    Object.entries(investorSchedules || {}).forEach(([oppId, list]) => {
      const items = (list || []).filter((item) => item?.due_date);
      items.sort((a, b) => (a.installment_no || 0) - (b.installment_no || 0));
      map[Number(oppId)] = items;
    });
    return map;
  }, [investorSchedules]);

  const payoutScheduleMap = useMemo(() => {
    const map = {};
    const payoutsByOpp = {};
    (payouts || []).forEach((p) => {
      const oppId = Number(p.opportunity_id);
      if (!oppId) return;
      if (!payoutsByOpp[oppId]) payoutsByOpp[oppId] = [];
      payoutsByOpp[oppId].push(p);
    });
    Object.entries(payoutsByOpp).forEach(([oppIdStr, list]) => {
      const oppId = Number(oppIdStr);
      const schedule = schedulesByOpp[oppId] || [];
      const ordered = [...list].sort((a, b) => {
        const aDate = new Date(a.paid_at || a.created_at || 0).getTime();
        const bDate = new Date(b.paid_at || b.created_at || 0).getTime();
        return aDate - bDate;
      });
      ordered.forEach((p, idx) => {
        const item = schedule[idx] || null;
        if (p?.id) {
          map[p.id] = {
            installment_no: item?.installment_no || null,
            total_installments: schedule.length || null,
            due_date: item?.due_date || null,
          };
        }
      });
    });
    return map;
  }, [payouts, schedulesByOpp]);

  const paidCountByOpp = useMemo(() => {
    const map = {};
    paidPayouts.forEach((p) => {
      const oppId = Number(p.opportunity_id);
      if (!oppId) return;
      map[oppId] = (map[oppId] || 0) + 1;
    });
    return map;
  }, [paidPayouts]);
  const lastPaidAmountByOpp = useMemo(() => {
    const map = {};
    const ordered = [...paidPayouts].sort((a, b) => new Date(a.paid_at || a.created_at || 0).getTime() - new Date(b.paid_at || b.created_at || 0).getTime());
    ordered.forEach((p) => {
      const oppId = Number(p.opportunity_id);
      if (!oppId) return;
      const amount = p.paid_amount || p.amount || p.expected_amount || 0;
      if (Number(amount || 0) > 0) map[oppId] = Number(amount || 0);
    });
    return map;
  }, [paidPayouts]);

  const nextPaymentFromView = useMemo(() => {
    if (!nextPayments.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sorted = [...nextPayments].sort((a, b) => {
      const aDate = toLocalDate(a.due_date);
      const bDate = toLocalDate(b.due_date);
      return (aDate ? aDate.getTime() : 0) - (bDate ? bDate.getTime() : 0);
    });
    const upcoming = sorted.find((row) => {
      const due = toLocalDate(row.due_date);
      return due && due.getTime() >= today.getTime();
    });
    const target = upcoming || sorted[sorted.length - 1];
    if (!target) return null;
    const label = target.source === 'pending_payout' ? 'Pendiente' : (target.source === 'programado' ? 'Programado' : 'Sin datos');
    const oppId = Number(target.opportunity_id);
    const oppItems = schedulesByOpp[oppId] || [];
    const matchDate = toLocalDate(target.due_date)?.getTime() || null;
    const scheduleItem = matchDate
      ? oppItems.find((item) => toLocalDate(item.due_date)?.getTime() === matchDate)
      : null;
    return {
      label,
      due_date: target.due_date,
      expected_amount: target.expected_amount || 0,
      opportunity_id: target.opportunity_id,
      installment_no: scheduleItem?.installment_no || null,
      total_installments: oppItems.length || null,
    };
  }, [nextPayments, schedulesByOpp]);

  const nextSchedule = useMemo(() => {
    const items = Object.values(schedulesByOpp).flat().filter(Boolean);
    if (!items.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sorted = [...items].sort((a, b) => {
      const aDate = toLocalDate(a.due_date);
      const bDate = toLocalDate(b.due_date);
      return (aDate ? aDate.getTime() : 0) - (bDate ? bDate.getTime() : 0);
    });
    const upcoming = sorted.find((item) => {
      const due = toLocalDate(item.due_date);
      return due && due.getTime() >= today.getTime();
    });
    const target = upcoming || sorted[sorted.length - 1];
    const oppItems = schedulesByOpp[Number(target.opportunity_id)] || [];
    const oppId = Number(target.opportunity_id || 0);
    const paidAmount = oppId ? lastPaidAmountByOpp[oppId] : null;
    return {
      due_date: target.due_date,
      expected_amount: paidAmount || target.payment_investor_neto || target.payment_investor_bruto || 0,
      opportunity_id: oppId || target.opportunity_id,
      installment_no: target.installment_no,
      total_installments: oppItems.length || null,
    };
  }, [schedulesByOpp, lastPaidAmountByOpp]);
  const nextPaymentDisplay = useMemo(() => {
    if (nextPaymentFromView) {
      return nextPaymentFromView;
    }
    if (nextPendingPayout) {
      const oppId = Number(nextPendingPayout.opportunity_id);
      const oppItems = schedulesByOpp[oppId] || [];
      const paidCount = paidCountByOpp[oppId] || 0;
      const targetNo = Math.min(paidCount + 1, oppItems.length || paidCount + 1);
      const scheduleItem = oppItems.find((item) => item.installment_no === targetNo) || oppItems[0];
      return {
        label: 'Pendiente',
        due_date: scheduleItem?.due_date || nextPendingPayout.created_at,
        expected_amount: nextPendingPayout.amount || nextPendingPayout.expected_amount || scheduleItem?.payment_investor_neto || scheduleItem?.payment_investor_bruto || 0,
        installment_no: scheduleItem?.installment_no || targetNo,
        total_installments: oppItems.length || null,
      };
    }
    if (nextSchedule) {
      return { label: 'Programado', ...nextSchedule };
    }
    const paid = paidPayouts
      .filter((p) => p?.paid_at)
      .sort((a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime())[0];
    if (paid) {
      return {
        label: 'Confirmado',
        due_date: paid.paid_at,
        expected_amount: paid.paid_amount || paid.amount || paid.expected_amount || 0,
      };
    }
    return null;
  }, [nextPaymentFromView, nextPendingPayout, nextSchedule, paidPayouts, schedulesByOpp, paidCountByOpp]);

  const investmentGroups = useMemo(() => {
    const map = {};
    (rows || []).forEach((r) => {
      const oppId = Number(r.opportunity_id);
      if (!oppId) return;
      if (!map[oppId]) {
        map[oppId] = {
          opportunity_id: oppId,
          rows: [],
          paidAmount: 0,
          pendingAmount: 0,
          cancelledAmount: 0,
          totalAmount: 0,
        };
      }
      const status = (r.status || '').toLowerCase();
      const amount = Number(r.amount || 0);
      map[oppId].rows.push(r);
      map[oppId].totalAmount += amount;
      if (status === 'pagado') map[oppId].paidAmount += amount;
      else if (status === 'pendiente_pago') map[oppId].pendingAmount += amount;
      else if (status === 'cancelado' || status === 'expired') map[oppId].cancelledAmount += amount;
    });

    return Object.values(map)
      .map((g) => {
        const o = oppsById[g.opportunity_id] || {};
        const isFondeada = o?.saldo_pendiente != null ? Number(o.saldo_pendiente) <= 0 : false;
        const statusLabel = isFondeada
          ? 'Fondeada'
          : g.pendingAmount > 0
            ? 'En proceso'
            : g.paidAmount > 0
              ? 'Pagada'
              : 'Sin movimiento';
        const paidContracts = g.rows
          .filter((r) => (r.status || '').toLowerCase() === 'pagado' && investorContractSignedMap[r.id])
          .map((r) => investorContractSignedMap[r.id]);
        return {
          ...g,
          statusLabel,
          contractUrl: paidContracts[0] || null,
        };
      })
      .sort((a, b) => b.opportunity_id - a.opportunity_id);
  }, [rows, oppsById, investorContractSignedMap]);

  const formatDate = (value) => {
    if (!value) return 'N/D';
    try {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return new Date(value).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return String(value);
    }
  };

  const formatInvestmentStatus = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pagado') return 'Pagada';
    if (s === 'pendiente_pago') return 'En proceso';
    if (s === 'cancelado') return 'Cancelada';
    if (s === 'expired') return 'Expirada';
    return status || 'Sin estado';
  };

  const toggleOppRow = (opportunityId) => {
    setExpandedOppRows((prev) => ({ ...prev, [opportunityId]: !prev[opportunityId] }));
  };

  if (loading) return <p>Cargando tu portafolio...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="portfolio-container investor-portfolio" style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <InvestorBackBar fallbackTo="/investor-dashboard" label="Volver al Panel" />
      <InvestorBreadcrumbs items={[
        { label: 'Inicio', to: '/investor-dashboard' },
        { label: 'Portafolio', to: '/mis-inversiones' },
        { label: 'Mis Inversiones' },
      ]} />

      <div className="investor-portfolio__header">
        <div>
          <h2>Mis Inversiones</h2>
          <p className="muted">Resumen simple de tus inversiones y pagos.</p>
        </div>
        <div className="investor-portfolio__actions">
          <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Invertir</button>
        </div>
      </div>

      <div className="investor-kpis">
        <div className="investor-kpi">
          <span>Capital invertido (pagado)</span>
          <strong>Bs. {formatMoney(totalInvested)}</strong>
        </div>
        <div className="investor-kpi">
          <span>Cobros acreditados</span>
          <strong>Bs. {formatMoney(totalPaid)}</strong>
        </div>
        <div className="investor-kpi">
          <span>Proximo pago</span>
          <strong>
            {nextPaymentDisplay
              ? (() => {
                const parts = [
                  `ID ${nextPaymentDisplay.opportunity_id || '-'} · ${formatDate(nextPaymentDisplay.due_date)} · Bs. ${formatMoney(nextPaymentDisplay.expected_amount || 0)}`,
                  `(${nextPaymentDisplay.label})`,
                ];
                if (nextPaymentDisplay.installment_no) {
                  parts.push(`Cuota ${nextPaymentDisplay.installment_no}${nextPaymentDisplay.total_installments ? ` de ${nextPaymentDisplay.total_installments}` : ''}`);
                }
                return parts.join(' · ');
              })()
              : 'Sin cronograma'}
          </strong>
        </div>
      </div>

      <div className="investor-tabs" role="tablist" aria-label="Secciones de portafolio">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'inversiones'}
          className={`investor-tab ${activeTab === 'inversiones' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('inversiones')}
        >
          Inversiones
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pagos'}
          className={`investor-tab ${activeTab === 'pagos' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('pagos')}
        >
          Pagos
        </button>
      </div>

      {!hasRows ? (
        <div>
          <p>No has registrado inversiones todavia.</p>
          <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Ver Oportunidades</button>
        </div>
      ) : (
        <>
          {activeTab === 'inversiones' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="minimal-table">
                <thead>
                  <tr>
                    <th>Oportunidad</th>
                    <th className="text-right">Capital pagado (Bs.)</th>
                    <th className="text-right">Reservas en proceso (Bs.)</th>
                    <th>Estado</th>
                    <th className="text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {investmentGroups.map((g) => {
                    const o = oppsById[g.opportunity_id] || {};
                    const isExpanded = !!expandedOppRows[g.opportunity_id];
                    const detailRows = [...(g.rows || [])].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                    return (
                      <React.Fragment key={g.opportunity_id}>
                        <tr>
                          <td>
                            <div className="table-main">ID {g.opportunity_id || '-'}</div>
                            <div className="table-subtle">Monto oportunidad: Bs. {formatMoney(o.monto || 0)}</div>
                          </td>
                          <td className="text-right">Bs. {formatMoney(g.paidAmount)}</td>
                          <td className="text-right">Bs. {formatMoney(g.pendingAmount)}</td>
                          <td>{g.statusLabel}</td>
                          <td className="text-right">
                            {g.contractUrl ? (
                              <a className="btn btn--secondary btn--sm" href={g.contractUrl} target="_blank" rel="noreferrer" style={{ marginRight: 8 }}>
                                Contrato
                              </a>
                            ) : null}
                            <button className="btn btn--secondary btn--sm" onClick={() => navigate(`/oportunidades/${g.opportunity_id}`)} style={{ marginRight: 8 }}>
                              Ver
                            </button>
                            <button className="btn btn--secondary btn--sm" onClick={() => toggleOppRow(g.opportunity_id)}>
                              {isExpanded ? 'Ocultar movimientos' : 'Ver movimientos'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} style={{ background: '#f7fbfc', borderBottom: '1px solid #eef3f5' }}>
                              <div style={{ padding: '10px 8px' }}>
                                <div className="table-subtle" style={{ marginBottom: 8 }}>Historial de movimientos de tu inversión en esta oportunidad</div>
                                <div style={{ overflowX: 'auto' }}>
                                  <table className="minimal-table" style={{ margin: 0 }}>
                                    <thead>
                                      <tr>
                                        <th>Fecha</th>
                                        <th className="text-right">Monto (Bs.)</th>
                                        <th>Estado</th>
                                        <th className="text-right">Detalle</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detailRows.map((r) => (
                                        <tr key={r.id}>
                                          <td>{formatDate(r.created_at)}</td>
                                          <td className="text-right">Bs. {formatMoney(r.amount || 0)}</td>
                                          <td>{formatInvestmentStatus(r.status)}</td>
                                          <td className="text-right">
                                            {(r.status || '').toLowerCase() === 'pagado' && investorContractSignedMap[r.id] ? (
                                              <a className="btn btn--secondary btn--sm" href={investorContractSignedMap[r.id]} target="_blank" rel="noreferrer">
                                                Contrato
                                              </a>
                                            ) : (
                                              <span className="muted">-</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'pagos' && (
            <>
              {payouts.length === 0 ? (
                <p className="muted">Aun no hay pagos registrados.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="minimal-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Oportunidad</th>
                        <th>Cuota</th>
                        <th className="text-right">Monto (Bs.)</th>
                        <th>Estado</th>
                        <th className="text-right">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => {
                        const oppMonto = p.opportunity_monto || 0;
                        const scheduleInfo = payoutScheduleMap[p.id] || {};
                        const isPaid = (p.status || '').toLowerCase() === 'paid';
                        const fecha = isPaid ? p.paid_at : (scheduleInfo.due_date || p.created_at);
                        const cuotaLabel = scheduleInfo.installment_no
                          ? `Cuota ${scheduleInfo.installment_no}${scheduleInfo.total_installments ? `/${scheduleInfo.total_installments}` : ''}`
                          : '-';
                        const montoCobrado = p.paid_amount || p.amount || p.expected_amount || 0;
                        const signedReceipt = payoutSignedMap[p.id] || null;
                        const status = (p.status || '').toLowerCase();
                        return (
                          <tr key={p.id}>
                            <td>{fecha ? formatDate(fecha) : '-'}</td>
                            <td>
                              <div className="table-main">ID {p.opportunity_id || '-'}</div>
                              <div className="table-subtle">Bs. {formatMoney(oppMonto || 0)}</div>
                            </td>
                            <td>{cuotaLabel}</td>
                            <td className="text-right">Bs. {formatMoney(montoCobrado)}</td>
                            <td>{status === 'paid' ? 'Pagado' : 'Pendiente'}</td>
                            <td className="text-right">
                              {status === 'paid' && signedReceipt ? (
                                <a className="btn btn--secondary btn--sm" href={signedReceipt} target="_blank" rel="noreferrer">Comprobante</a>
                              ) : (
                                <span className="muted">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MyInvestmentsList;
