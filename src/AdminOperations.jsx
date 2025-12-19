import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`btn ${active ? 'btn--primary' : ''}`}
    style={{ marginRight: 8, marginBottom: 8 }}
  >
    {children}
  </button>
);

const formatMoney = (v) => `Bs ${Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const logOps = (...args) => {
  try {
    // Debug siempre visible en consola del navegador para seguimiento en producción
    console.log('[Ops]', ...args);
  } catch (_) {}
};

const OPS_TAB_KEY = 'ops_last_tab';
const OPS_SCROLL_KEY = 'ops_scroll_y';

const AdminOperations = () => {
  const [tab, setTab] = useState(() => {
    try {
      const saved = localStorage.getItem(OPS_TAB_KEY);
      return saved || 'intents';
    } catch (_) {
      return 'intents';
    }
  });
  const [intents, setIntents] = useState([]);
  const [borrowerIntents, setBorrowerIntents] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [investorMap, setInvestorMap] = useState({});
  const [borrowerMap, setBorrowerMap] = useState({});
  const [bankMap, setBankMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptFiles, setReceiptFiles] = useState({});
  const [borrowerReceiptFiles, setBorrowerReceiptFiles] = useState({});
  const [disbReceiptFiles, setDisbReceiptFiles] = useState({});
  const [disbContractFiles, setDisbContractFiles] = useState({});
  const [infoMessage, setInfoMessage] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [seenReceipts, setSeenReceipts] = useState(() => {
    try {
      const raw = localStorage.getItem('ops_seen_receipts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [borrowerStatusFilter, setBorrowerStatusFilter] = useState('pending');
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [expandedBorrower, setExpandedBorrower] = useState({});
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('pending');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [expandedPayouts, setExpandedPayouts] = useState({});

  const pendingPayoutTotals = useMemo(() => {
    const byOpp = {};
    payouts
      .filter((p) => (p.status || '').toLowerCase() === 'pending')
      .forEach((p) => {
        if (!byOpp[p.opportunity_id]) byOpp[p.opportunity_id] = 0;
        byOpp[p.opportunity_id] += Number(p.amount || 0);
    });
    return byOpp;
  }, [payouts]);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const pendingPayoutTotal = useMemo(() => payouts.filter((p) => (p.status || '').toLowerCase() === 'pending').reduce((acc, p) => acc + Number(p.amount || 0), 0), [payouts]);
  const getPayoutRow = (id) => payouts.find((p) => p.id === id);
  const borrowerGroups = useMemo(() => {
    const search = borrowerSearch.trim().toLowerCase();
    const map = {};
    borrowerIntents.forEach((i) => {
      const statusLower = (i.status || '').toLowerCase();
      if (borrowerStatusFilter !== 'all' && statusLower !== borrowerStatusFilter) return;
      const oppIdStr = String(i.opportunity_id || '').toLowerCase();
      const borrowerIdStr = String(i.borrower_id || '').toLowerCase();
      const matchesSearch = !search || oppIdStr.includes(search) || borrowerIdStr.includes(search);
      if (!matchesSearch) return;
      if (!map[i.opportunity_id]) {
        map[i.opportunity_id] = {
          opportunity_id: i.opportunity_id,
          borrower_id: i.borrower_id,
          intents: [],
          totalCount: 0,
          pendingCount: 0,
          pendingAmount: 0,
          nextDue: null,
          nextAmount: 0,
        };
      }
      const group = map[i.opportunity_id];
      group.intents.push(i);
      group.totalCount += 1;
      const isPending = statusLower === 'pending';
      if (isPending) {
        group.pendingCount += 1;
        group.pendingAmount += Number(i.expected_amount || 0);
        const dueTs = i.due_date ? new Date(i.due_date).getTime() : null;
        if (dueTs !== null && (group.nextDue === null || dueTs < group.nextDue)) {
          group.nextDue = dueTs;
          group.nextAmount = Number(i.expected_amount || 0);
        }
      }
    });
    return Object.values(map)
      .map((g) => ({ ...g, intents: [...g.intents].sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0)) }))
      .sort((a, b) => Number(a.opportunity_id || 0) - Number(b.opportunity_id || 0));
  }, [borrowerIntents, borrowerStatusFilter, borrowerSearch]);
  const payoutGroups = useMemo(() => {
    const search = payoutSearch.trim().toLowerCase();
    const map = {};
    payouts.forEach((p) => {
      const statusLower = (p.status || '').toLowerCase();
      if (showPendingOnly && statusLower !== 'pending') return;
      if (payoutStatusFilter !== 'all' && statusLower !== payoutStatusFilter) return;
      const oppIdStr = String(p.opportunity_id || '').toLowerCase();
      const investorStr = String(investorMap[p.investor_id] || p.investor_id || '').toLowerCase();
      const matchesSearch = !search || oppIdStr.includes(search) || investorStr.includes(search);
      if (!matchesSearch) return;
      if (!map[p.opportunity_id]) {
        map[p.opportunity_id] = {
          opportunity_id: p.opportunity_id,
          payouts: [],
          totalCount: 0,
          pendingCount: 0,
          pendingAmount: 0,
        };
      }
      const group = map[p.opportunity_id];
      group.payouts.push(p);
      group.totalCount += 1;
      if (statusLower === 'pending') {
        group.pendingCount += 1;
        group.pendingAmount += Number(p.amount || 0);
      }
    });
    return Object.values(map)
      .map((g) => ({ ...g, payouts: [...g.payouts].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) }))
      .sort((a, b) => Number(a.opportunity_id || 0) - Number(b.opportunity_id || 0));
  }, [payouts, payoutStatusFilter, payoutSearch, investorMap, showPendingOnly]);

  const exportPendingCsv = () => {
    const rows = payouts
      .filter((p) => (p.status || '').toLowerCase() === 'pending')
      .map((p) => {
        const bank = bankMap[p.investor_id] || {};
        const montoNeto = Number(p.amount || 0);
        const montoBruto = montoNeto / 0.99;
        return {
          payout_id: p.id,
          opportunity_id: p.opportunity_id,
          investor_id: p.investor_id,
          monto_bruto: montoBruto,
          monto_neto: montoNeto,
          nombre_banco: bank.nombre_banco || '',
          numero_cuenta: bank.numero_cuenta || '',
        };
      });
    const headers = ['payout_id', 'opportunity_id', 'investor_id', 'monto_bruto', 'monto_neto', 'nombre_banco', 'numero_cuenta'];
    const csv = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => r[h]).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payouts_pendientes.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendNotificationsForPaidIntent = async (intentRow, fundedInfoRaw) => {
    if (!intentRow) return;
    const investorId = intentRow.investor_id;
    const opportunityId = intentRow.opportunity_id;
    const expectedAmount = intentRow.expected_amount || 0;
    const notificationsPayload = [];
    const fundedInfo = Array.isArray(fundedInfoRaw) ? fundedInfoRaw[0] : fundedInfoRaw;

    // Notificación al inversionista: pago verificado
    if (investorId) {
      notificationsPayload.push({
        user_id: investorId,
        title: 'Pago verificado',
        body: `Validamos tu pago de ${formatMoney(expectedAmount)}. Tu participación se activa cuando la oportunidad alcance 100% del fondeo.`,
        link_url: '/mis-inversiones',
        type: 'investment_payment_verified',
      });
    }

    // Si con este pago se fondeó al 100%
    const isFunded = fundedInfo?.funded;
    if (isFunded) {
      // Traer datos de oportunidad y prestatario
      let opp = null;
      try {
        const { data: oppRow } = await supabase
          .from('oportunidades')
          .select('id, user_id, solicitud_id, monto')
          .eq('id', opportunityId)
          .maybeSingle();
        opp = oppRow;
      } catch (_) {}

      if (investorId) {
        notificationsPayload.push({
          user_id: investorId,
          title: 'Oportunidad fondeada',
          body: `Se completó el fondeo de la oportunidad ${opportunityId}. Próximo paso: pago dirigido al banco y cronograma de cuotas.`,
          link_url: '/mis-inversiones',
          type: 'opportunity_funded',
        });
      }

      const borrowerId = opp?.user_id;
      let bankName = null;
      if (opp?.solicitud_id) {
        try {
          const { data: solRow } = await supabase
            .from('solicitudes')
            .select('bancos_deuda')
            .eq('id', opp.solicitud_id)
            .maybeSingle();
          bankName = solRow?.bancos_deuda || null;
        } catch (_) {}
      }

      if (borrowerId) {
        const montoTotal = opp?.monto || fundedInfo?.objetivo || 0;
        notificationsPayload.push({
          user_id: borrowerId,
          title: 'Tu préstamo fue fondeado',
          body: `Tu préstamo fue fondeado. Ahora pagaremos directamente a tu banco${bankName ? ` (${bankName})` : ''} por ${formatMoney(montoTotal)}.`,
          link_url: '/panel-prestatario',
          type: 'loan_funded',
        });
      }
    }

    if (notificationsPayload.length > 0) await supabase.from('notifications').insert(notificationsPayload);
  };

  const markReceiptSeen = (intentId, updatedAt) => {
    if (!intentId) return;
    const ts = updatedAt ? new Date(updatedAt).getTime() : Date.now();
    setSeenReceipts((prev) => {
      const next = { ...prev, [intentId]: ts };
      try { localStorage.setItem('ops_seen_receipts', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const loadIntents = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('payment_intents')
      .select('id, opportunity_id, investor_id, expected_amount, status, expires_at, paid_at, paid_amount, created_at, updated_at, receipt_url')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    const rows = data || [];
    // Generar links firmados para comprobantes (bucket privado)
    const intentsWithLinks = await Promise.all(rows.map(async (r) => {
      let receipt_signed_url = null;
      if (r.receipt_url) {
        try {
          const { data: signed, error: signErr } = await supabase
            .storage
            .from('comprobantes-pagos')
            .createSignedUrl(r.receipt_url, 60 * 60); // 1h
          if (!signErr && signed?.signedUrl) {
            receipt_signed_url = signed.signedUrl;
          }
        } catch (_) {}
      }
      return { ...r, receipt_signed_url };
    }));
    logOps('Intents cargados', intentsWithLinks.map((r) => ({
      id: r.id,
      status: r.status,
      canPay: ['pending', 'unmatched'].includes((r.status || '').toString().trim().toLowerCase()),
    })));
    setIntents(intentsWithLinks);
    // cargar perfiles para mostrar nombre/email en vez de UUID
    const investorIds = Array.from(new Set(rows.map(r => r.investor_id).filter(Boolean)));
    if (investorIds.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .in('id', investorIds);
      if (!profErr && profs) {
        const map = {};
        profs.forEach(p => { map[p.id] = `${p.nombre_completo || ''}${p.email ? ` (${p.email})` : ''}`.trim(); });
        setInvestorMap(map);
      }
    }
    setLoading(false);
  };

  const loadBorrowerIntents = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('borrower_payment_intents')
      .select('id, opportunity_id, borrower_id, expected_amount, status, due_date, paid_at, paid_amount, created_at, updated_at, receipt_url')
      .order('due_date', { ascending: true })
      .limit(100);
    if (error) setError(error.message);
    const rows = data || [];
    const withSigned = await Promise.all(rows.map(async (r) => {
      let receipt_signed_url = null;
      if (r.receipt_url) {
        try {
          const { data: signed, error: signErr } = await supabase
            .storage
            .from('comprobantes-pagos')
            .createSignedUrl(r.receipt_url, 60 * 60);
          if (!signErr && signed?.signedUrl) receipt_signed_url = signed.signedUrl;
        } catch (_) {}
      }
      return { ...r, receipt_signed_url };
    }));
    setBorrowerIntents(withSigned);
    // Map de prestatarios para mostrar nombre/email legible
    const borrowerIds = Array.from(new Set((data || []).map((r) => r.borrower_id).filter(Boolean)));
    if (borrowerIds.length > 0) {
      try {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, nombre_completo, email')
          .in('id', borrowerIds);
        if (profs) {
          const map = {};
          profs.forEach((p) => {
            const label = `${p.nombre_completo || ''}${p.email ? ` (${p.email})` : ''}`.trim();
            map[p.id] = label || shortId(p.id);
          });
          setBorrowerMap(map);
        }
      } catch (_) {}
    }
    setLoading(false);
  };

  const loadPayouts = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('payouts_inversionistas')
      .select('id, opportunity_id, investor_id, amount, status, paid_at, receipt_url, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    const rows = data || [];
    const withSigned = await Promise.all(rows.map(async (r) => {
      let receipt_signed_url = null;
      if (r.receipt_url) {
        try {
          const { data: signed, error: signErr } = await supabase
            .storage
            .from('comprobantes-pagos')
            .createSignedUrl(r.receipt_url, 60 * 60);
          if (!signErr && signed?.signedUrl) receipt_signed_url = signed.signedUrl;
        } catch (_) {}
      }
      return { ...r, receipt_signed_url };
    }));
    setPayouts(withSigned);
    // cargar perfiles
    const investorIds = Array.from(new Set(rows.map(p => p.investor_id).filter(Boolean)));
    if (investorIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, nombre_completo, email')
        .in('id', investorIds);
      if (profs) {
        const map = {};
        profs.forEach(p => { map[p.id] = `${p.nombre_completo || ''}${p.email ? ` (${p.email})` : ''}`.trim(); });
        setInvestorMap(map);
      }
      const { data: banks } = await supabase
        .from('cuentas_bancarias_inversionistas')
        .select('user_id, nombre_banco, numero_cuenta')
        .in('user_id', investorIds);
      if (banks) {
        const map = {};
        banks.forEach(b => { map[b.user_id] = b; });
        setBankMap(map);
      }
    }
    setLoading(false);
  };

  const loadDisbursements = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('desembolsos')
      .select('id, opportunity_id, monto_bruto, monto_neto, estado, comprobante_url, contract_url, paid_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setError(error.message);
    const rows = data || [];
    const withSigned = await Promise.all(rows.map(async (d) => {
      let comprobante_signed_url = null;
      let contract_signed_url = null;
      if (d.comprobante_url) {
        try {
          const { data: signed } = await supabase.storage.from('comprobantes-pagos').createSignedUrl(d.comprobante_url, 60 * 60);
          comprobante_signed_url = signed?.signedUrl || null;
        } catch (_) {}
      }
      if (d.contract_url) {
        try {
          const { data: signed } = await supabase.storage.from('contratos').createSignedUrl(d.contract_url, 60 * 60);
          contract_signed_url = signed?.signedUrl || null;
        } catch (_) {}
      }
      return { ...d, comprobante_signed_url, contract_signed_url };
    }));
    setDisbursements(withSigned);
    setLoading(false);
  };

  const reopenOpportunity = async (opportunityId) => {
    try {
      setError('');
      setInfoMessage('');
      const { error } = await supabase.rpc('reopen_opportunity_if_unfunded', { p_opportunity_id: opportunityId });
      if (error) throw error;
      setInfoMessage(`Oportunidad ${opportunityId} reabierta a disponible (sin pagos acreditados).`);
      loadIntents();
    } catch (e) {
      setError((e).message || 'No se pudo reabrir la oportunidad');
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    setInfoMessage('');
    await Promise.all([loadIntents(), loadBorrowerIntents(), loadPayouts(), loadDisbursements()]);
    setLastRefreshed(new Date());
    setLoading(false);
  };

  const uploadReceipt = async (file, prefix = 'payouts') => {
    if (!file) return null;
    const path = `${prefix}/${Date.now()}_${file.name}`;
    const { error, data } = await supabase.storage.from('comprobantes-pagos').upload(path, file);
    if (error) throw error;
    return data?.path || path;
  };

  const updateIntentStatus = async (id, status) => {
    try {
      if (status === 'paid') {
        // Usar RPC para recalcular fondeo e inversiones pagadas
        const intentRow = intents.find((i) => i.id === id);
        const normalized = (intentRow?.status || '').toString().trim().toLowerCase();
        if (!['pending', 'unmatched'].includes(normalized)) {
          logOps('Click ignorado: intent no payable', { id, status: intentRow?.status });
          return;
        }
        logOps('Marcando pagado', { id, currentStatus: intentRow?.status });
        const { data: rpcData, error: rpcErr } = await supabase.rpc('mark_payment_intent_paid', { p_payment_intent_id: id });
        if (rpcErr) throw rpcErr;
        // Notificaciones básicas al inversionista/prestatario
        try {
          await sendNotificationsForPaidIntent(intentRow, rpcData);
          logOps('Notificaciones enviadas para intent', id);
        } catch (notifErr) {
          console.warn('No se pudieron enviar notificaciones', notifErr);
        }
        // Marcar visto para evitar falso "nuevo comprobante" por updated_at
        markReceiptSeen(id, new Date());
        // Optimista: actualizar estado en memoria
        setIntents((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'paid' } : i)));
      } else {
        const { error } = await supabase.from('payment_intents').update({ status }).eq('id', id);
        if (error) throw error;
        if (status === 'expired') markReceiptSeen(id, new Date());
      }
      loadIntents();
      loadDisbursements();
    } catch (e) {
      setError((e).message || 'Error al actualizar intent');
    }
  };

  const updateBorrowerIntentStatus = async (id, status) => {
    try {
      setInfoMessage('');
      if (status === 'paid') {
        const intentRow = borrowerIntents.find((b) => b.id === id);
        const file = borrowerReceiptFiles[id];
        let receiptPath = null;
        if (file) {
          receiptPath = await uploadReceipt(file, 'borrower');
        }
        const { error: rpcErr } = await supabase.rpc('process_borrower_payment', {
          p_intent_id: id,
          p_receipt_url: receiptPath,
        });
        if (rpcErr) throw rpcErr;
        setBorrowerReceiptFiles((prev) => ({ ...prev, [id]: null }));
        // Feedback visual para Ops
        try {
          const idx = intentRow ? borrowerIntents.filter((b) => b.opportunity_id === intentRow.opportunity_id).findIndex((b) => b.id === id) : -1;
          const cuotaLabel = idx >= 0 ? `Cuota #${idx + 1}` : `ID ${id}`;
          const oppLabel = intentRow?.opportunity_id ? `Op ${intentRow.opportunity_id}` : '';
          setInfoMessage(`${cuotaLabel} ${oppLabel} marcada como pagada.`);
          setTimeout(() => setInfoMessage(''), 4000);
        } catch (_) {}
      } else {
        const payload = { status };
        if (status === 'expired') payload.paid_at = null;
        const { error } = await supabase.from('borrower_payment_intents').update(payload).eq('id', id);
        if (error) throw error;
      }
      loadBorrowerIntents();
    } catch (e) {
      setError((e).message || 'Error al actualizar cuota');
    }
  };

  const updatePayoutStatus = async (id, status) => {
    try {
      const row = getPayoutRow(id);
      if (status === 'paid') {
        const file = receiptFiles[id];
        let receiptPath = null;
        if (file) {
          receiptPath = await uploadReceipt(file, 'payouts');
        }
        const { error: rpcErr } = await supabase.rpc('mark_payout_paid', {
          p_payout_id: id,
          p_receipt_url: receiptPath,
        });
        if (rpcErr) throw rpcErr;
        setReceiptFiles((prev) => ({ ...prev, [id]: null }));
        // Notificación al inversionista: payout acreditado
        if (row?.investor_id) {
          try {
            const notif = {
              user_id: row.investor_id,
              title: 'Pago acreditado',
              body: `Transferimos tu cobro de ${formatMoney(row.amount || 0)} (Op ${row.opportunity_id || '-'}) a tu cuenta registrada.`,
              link_url: '/mis-inversiones',
              type: 'investor_payout_paid',
            };
            await supabase.from('notifications').insert([notif]);
          } catch (notifErr) {
            console.warn('No se pudo notificar payout pagado', notifErr);
          }
        }
      } else {
        const payload = { status };
        if (status === 'expired') payload.paid_at = null;
        const { error } = await supabase.from('payouts_inversionistas').update(payload).eq('id', id);
        if (error) throw error;
      }
      loadPayouts();
    } catch (e) {
      setError((e).message || 'Error al actualizar payout');
    }
  };

  const registerDirectedPayment = async (disbRow) => {
    try {
      if (!disbRow?.opportunity_id) return;
      const receiptFile = disbReceiptFiles[disbRow.id];
      const contractFile = disbContractFiles[disbRow.id];
      let receiptPath = disbRow.comprobante_url || null;
      let contractPath = disbRow.contract_url || null;

      if (receiptFile) {
        receiptPath = await uploadReceipt(receiptFile, 'desembolsos');
      }
      if (contractFile) {
        contractPath = await uploadReceipt(contractFile, 'contratos');
      }

      const { error: rpcErr } = await supabase.rpc('registrar_pago_dirigido', {
        p_opportunity_id: disbRow.opportunity_id,
        p_comprobante_url: receiptPath,
        p_contract_url: contractPath,
      });
      if (rpcErr) throw rpcErr;

      // Generar contrato PDF automático y actualizar desembolso
      try {
        const { data: contractRes, error: contractErr } = await supabase.functions.invoke('generate-contract', {
          body: { opportunity_id: disbRow.opportunity_id },
        });
        if (contractErr) throw contractErr;
        if (contractRes?.path) {
          await supabase.from('desembolsos')
            .update({ contract_url: contractRes.path })
            .eq('opportunity_id', disbRow.opportunity_id);
        }
      } catch (genErr) {
        console.warn('No se pudo generar contrato automáticamente', genErr);
      }

      // Notificar prestatario e inversionistas (campana) + email prestatario
      try {
        await supabase.functions.invoke('notify-directed-payment', {
          body: { opportunity_id: disbRow.opportunity_id },
        });
      } catch (notifErr) {
        console.warn('No se pudo notificar desembolso', notifErr);
      }

      setDisbReceiptFiles((prev) => ({ ...prev, [disbRow.id]: null }));
      setDisbContractFiles((prev) => ({ ...prev, [disbRow.id]: null }));
      setInfoMessage('Pago dirigido registrado, cronograma generado y contrato listo.');
      loadDisbursements();
      loadBorrowerIntents();
    } catch (e) {
      setError((e).message || 'Error al registrar pago dirigido');
    }
  };

  const uploadDisbReceiptImmediate = async (disbRow, file) => {
    if (!file || !disbRow?.id) return;
    try {
      setInfoMessage('Subiendo comprobante...');
      const path = await uploadReceipt(file, 'desembolsos');
      const { error } = await supabase
        .from('desembolsos')
        .update({ comprobante_url: path })
        .eq('id', disbRow.id);
      if (error) throw error;
      setInfoMessage('Comprobante guardado. Listo para registrar el pago dirigido.');
      loadDisbursements();
    } catch (e) {
      setError((e).message || 'No pudimos guardar el comprobante');
    }
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => { refreshAll(); }, 300000); // auto refresh cada 5min
    // restaurar scroll de la última visita
    try {
      const savedY = Number(sessionStorage.getItem(OPS_SCROLL_KEY) || 0);
      if (!Number.isNaN(savedY) && savedY > 0) {
        setTimeout(() => { window.scrollTo(0, savedY); }, 50);
      }
    } catch (_) {}
    const onScroll = () => {
      try {
        sessionStorage.setItem(OPS_SCROLL_KEY, String(window.scrollY || 0));
      } catch (_) {}
    };
    window.addEventListener('scroll', onScroll);
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', onScroll);
      try {
        sessionStorage.setItem(OPS_SCROLL_KEY, String(window.scrollY || 0));
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(OPS_TAB_KEY, tab);
    } catch (_) {}
  }, [tab]);

  const isNewReceipt = (intent) => {
    if (!intent?.receipt_signed_url || !intent?.updated_at) return false;
    const lastSeen = seenReceipts[intent.id] || 0;
    const updatedTs = new Date(intent.updated_at).getTime();
    return updatedTs > lastSeen;
  };

  const toggleBorrowerGroup = (opportunityId) => {
    setExpandedBorrower((prev) => ({ ...prev, [opportunityId]: !prev[opportunityId] }));
  };

  const togglePayoutGroup = (opportunityId) => {
    setExpandedPayouts((prev) => ({ ...prev, [opportunityId]: !prev[opportunityId] }));
  };

  const formatDateShort = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return String(value);
    }
  };

  const formatStatusLabel = (status) => {
    const s = (status || '').toString().trim().toLowerCase();
    switch (s) {
      case 'pending': return 'Pendiente';
      case 'paid': return 'Pagado';
      case 'expired': return 'Expirado';
      case 'unmatched': return 'Por conciliar';
      default: return status || '—';
    }
  };

  const shortId = (id) => {
    if (!id) return 'n/d';
    const str = String(id);
    if (str.length <= 8) return str;
    return `${str.slice(0, 4)}…${str.slice(-4)}`;
  };

  const userLabel = (id, map) => {
    if (!id) return 'n/d';
    if (map && map[id]) return map[id];
    return shortId(id);
  };

  return (
    <div className="admin-ops" style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      <h2>Operaciones</h2>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <TabButton active={tab === 'intents'} onClick={() => setTab('intents')}>Pagos de inversionistas</TabButton>
        <TabButton active={tab === 'review'} onClick={() => setTab('review')}>Por conciliar</TabButton>
        <TabButton active={tab === 'disbursements'} onClick={() => setTab('disbursements')}>Desembolso dirigido</TabButton>
        <TabButton active={tab === 'borrower'} onClick={() => setTab('borrower')}>Pagos de prestatarios</TabButton>
        <TabButton active={tab === 'payouts'} onClick={() => setTab('payouts')}>Pagos a inversionistas</TabButton>
        <button className="btn btn--secondary" onClick={refreshAll} disabled={loading}>Refrescar</button>
        {lastRefreshed && (
          <span style={{ color: '#55747b', fontSize: '0.9rem' }}>
            Actualizado: {lastRefreshed.toLocaleTimeString('es-BO')}
          </span>
        )}
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {infoMessage && <div className="ops-toast">{infoMessage}</div>}

      {tab === 'intents' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Cuota</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Inversionista</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Expira</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Comprobante</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {intents.map((i) => {
                const statusLower = (i.status || '').toString().trim().toLowerCase();
                const canPay = ['pending', 'unmatched'].includes(statusLower);
                const canExpire = statusLower === 'pending';
                const payBtnStyle = canPay ? {} : { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' };
                return (
                  <tr key={i.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', fontFamily: 'monospace', fontSize: '0.9rem' }}>{i.id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.opportunity_id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{userLabel(i.investor_id, investorMap)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatMoney(i.expected_amount)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatStatusLabel(i.status)}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.expires_at ? new Date(i.expires_at).toLocaleString('es-BO') : '—'}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                    {i.receipt_signed_url ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <a
                          className="btn"
                          href={i.receipt_signed_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markReceiptSeen(i.id, i.updated_at)}
                        >
                          Ver
                        </a>
                        {isNewReceipt(i) && (
                          <span style={{ background: '#ffefef', color: '#b71c1c', padding: '4px 8px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>
                            Nuevo comprobante
                          </span>
                        )}
                        <span style={{ color: '#55747b', fontSize: '0.85rem' }}>
                          Actualizado {i.updated_at ? new Date(i.updated_at).toLocaleString('es-BO') : '—'}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn--primary" style={payBtnStyle} onClick={() => updateIntentStatus(i.id, 'paid')} disabled={!canPay}>Marcar pagado</button>
                      <button className="btn" onClick={() => updateIntentStatus(i.id, 'expired')} disabled={!canExpire}>Expirar</button>
                      <button className="btn" onClick={() => reopenOpportunity(i.opportunity_id)} disabled={statusLower === 'paid'}>Reabrir (sin pagos)</button>
                    </td>
                  </tr>
                );
              })}
              {intents.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay intents</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'review' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Cuota #</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Inversionista</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Expira</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Comprobante</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {intents
                .filter((i) => ['pending', 'unmatched'].includes((i.status || '').toLowerCase()))
                .sort((a, b) => {
                  const aExp = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
                  const bExp = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
                  return aExp - bExp;
                })
                .map((i) => (
                  <tr key={i.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', fontFamily: 'monospace', fontSize: '0.9rem' }}>{i.id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.opportunity_id}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{userLabel(i.investor_id, investorMap)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatMoney(i.expected_amount)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatStatusLabel(i.status)}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{i.expires_at ? new Date(i.expires_at).toLocaleString('es-BO') : '—'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                      {i.receipt_signed_url ? (
                        <a className="btn" href={i.receipt_signed_url} target="_blank" rel="noreferrer">Ver</a>
                      ) : (
                        <span style={{ color: '#888' }}>Sin comprobante</span>
                      )}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn--primary"
                        style={['pending', 'unmatched'].includes((i.status || '').toString().trim().toLowerCase()) ? {} : { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' }}
                        onClick={() => updateIntentStatus(i.id, 'paid')}
                        disabled={(i.status || '').toString().trim().toLowerCase() === 'paid'}
                      >
                        Marcar pagado
                      </button>
                      <button className="btn" onClick={() => updateIntentStatus(i.id, 'expired')} disabled={(i.status || '').toString().trim().toLowerCase() === 'expired'}>Expirar</button>
                    </td>
                  </tr>
                ))}
              {intents.filter((i) => ['pending', 'unmatched'].includes((i.status || '').toLowerCase())).length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay pagos pendientes por conciliar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'borrower' && (
        <div style={{ overflowX: 'auto' }}>
          <div className="ops-filters">
            <label className="ops-filter-control">
              <span className="muted">Estado</span>
              <select value={borrowerStatusFilter} onChange={(e) => setBorrowerStatusFilter(e.target.value)}>
                <option value="pending">Pendientes</option>
                <option value="paid">Pagadas</option>
                <option value="expired">Expiradas</option>
                <option value="all">Todos</option>
              </select>
            </label>
            <label className="ops-filter-control">
              <span className="muted">Buscar (op o prestatario)</span>
              <input
                type="text"
                value={borrowerSearch}
                onChange={(e) => setBorrowerSearch(e.target.value)}
                placeholder="61, correo o UUID prestatario"
                className="ops-filter-input"
              />
            </label>
          </div>
          {borrowerGroups.length === 0 && (
            <div style={{ padding: 12, textAlign: 'center', color: '#55747b', border: '1px dashed #d9e5e8', borderRadius: 10 }}>
              No hay cuotas que coincidan con el filtro.
            </div>
          )}
          {borrowerGroups.map((g) => {
            const expanded = !!expandedBorrower[g.opportunity_id];
            return (
              <div key={g.opportunity_id} style={{ border: '1px solid #e5f0f2', borderRadius: 10, marginBottom: 12, background: '#fbfdfe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 700, color: '#0f5a62' }}>Oportunidad {g.opportunity_id}</div>
                    <div className="muted">Prestatario: {userLabel(g.borrower_id, borrowerMap)}</div>
                    <div className="muted">
                      Pendientes: {g.pendingCount}/{g.totalCount} · Monto pendiente: {formatMoney(g.pendingAmount)}
                    </div>
                    {g.nextDue && (
                      <div className="muted">Próxima vence: {formatDateShort(g.nextDue)} · Cuota: {formatMoney(g.nextAmount)}</div>
                    )}
                  </div>
                  <button className="btn" onClick={() => toggleBorrowerGroup(g.opportunity_id)}>
                    {expanded ? 'Ocultar cuotas' : 'Ver cuotas'}
                  </button>
                </div>
                {expanded && (
                  <div style={{ padding: 10, borderTop: '1px solid #e5f0f2' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Cuota #</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Vence</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Recibo</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.intents.map((i, idx) => (
                          <tr key={i.id}>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                              Cuota #{idx + 1}
                              <div className="muted">ID {i.id}</div>
                            </td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatDateShort(i.due_date)}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatMoney(i.expected_amount)}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{formatStatusLabel(i.status)}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                              {i.receipt_signed_url ? (
                                <>
                                  <a className="btn" href={i.receipt_signed_url} target="_blank" rel="noreferrer">Ver</a>
                                  <div className="muted" style={{ marginTop: 4 }}>Subido por el prestatario</div>
                                </>
                              ) : (
                                <>
                                  <span style={{ color: '#888' }}>Sin comprobante</span>
                                  <div style={{ marginTop: 6 }}>
                                    <label className="ops-file-upload-label">
                                      <input className="ops-file-input-hidden" type="file" accept=".pdf,image/*" onChange={(e) => setBorrowerReceiptFiles(prev => ({ ...prev, [i.id]: e.target.files?.[0] || null }))} />
                                      Subir comprobante
                                    </label>
                                    <div className="muted" style={{ marginTop: 4 }}>Solo si Ops lo recibe por otro canal</div>
                                  </div>
                                </>
                              )}
                            </td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {['pending'].includes((i.status || '').toString().toLowerCase()) ? (
                                <>
                                  <button className="btn btn--primary" onClick={() => updateBorrowerIntentStatus(i.id, 'paid')}>Marcar pagado</button>
                                  <button className="btn" onClick={() => updateBorrowerIntentStatus(i.id, 'expired')}>Expirar</button>
                                </>
                              ) : (
                                <span className="muted">Sin acciones (ya procesada)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {g.intents.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay cuotas en este filtro</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'payouts' && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ marginBottom: 10, padding: 10, border: '1px solid #d9f0f0', borderRadius: 10, background: '#f7fbfc' }}>
            <strong>Pagos pendientes a inversionistas por oportunidad</strong>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
              <label className="ops-checkbox">
                <input type="checkbox" checked={showPendingOnly} onChange={(e) => setShowPendingOnly(e.target.checked)} />
                Ver solo pendientes (lista rápida)
              </label>
              <div style={{ background: '#d4f4ef', color: '#0f5a62', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                Total pendientes: {formatMoney(pendingPayoutTotal)}
              </div>
              <button className="btn" onClick={exportPendingCsv}>Exportar CSV</button>
            </div>
            {Object.keys(pendingPayoutTotals).length === 0 ? (
              <div className="muted" style={{ marginTop: 4 }}>No hay payouts en espera de transferencia.</div>
            ) : (
              <ul style={{ margin: '6px 0 0 16px', color: '#0f5a62' }}>
                {Object.entries(pendingPayoutTotals).map(([oppId, total]) => (
                  <li key={oppId}>ID {oppId}: {formatMoney(total)} (neto a inversionistas)</li>
                ))}
              </ul>
            )}
          </div>
          <div className="ops-filters" style={{ marginBottom: 12 }}>
            <label className="ops-filter-control">
              <span className="muted">Estado</span>
              <select value={payoutStatusFilter} onChange={(e) => setPayoutStatusFilter(e.target.value)}>
                <option value="pending">Pendientes</option>
                <option value="paid">Pagados</option>
                <option value="expired">Expirados</option>
                <option value="all">Todos</option>
              </select>
            </label>
            <label className="ops-filter-control">
              <span className="muted">Buscar (op o inversionista)</span>
              <input
                type="text"
                value={payoutSearch}
                onChange={(e) => setPayoutSearch(e.target.value)}
                placeholder="61, correo o UUID inversionista"
                className="ops-filter-input"
              />
            </label>
          </div>
          {payoutGroups.length === 0 && (
            <div style={{ padding: 12, textAlign: 'center', color: '#55747b', border: '1px dashed #d9e5e8', borderRadius: 10 }}>
              No hay payouts que coincidan con el filtro.
            </div>
          )}
          {payoutGroups.map((g) => {
            const expanded = !!expandedPayouts[g.opportunity_id];
            return (
              <div key={g.opportunity_id} style={{ border: '1px solid #e5f0f2', borderRadius: 10, marginBottom: 12, background: '#fbfdfe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 700, color: '#0f5a62' }}>Oportunidad {g.opportunity_id}</div>
                    <div className="muted">
                      Pendientes: {g.pendingCount}/{g.totalCount} · Neto pendiente: {formatMoney(g.pendingAmount)}
                    </div>
                  </div>
                  <button className="btn" onClick={() => togglePayoutGroup(g.opportunity_id)}>
                    {expanded ? 'Ocultar payouts' : 'Ver payouts'}
                  </button>
                </div>
                {expanded && (
                  <div style={{ padding: 10, borderTop: '1px solid #e5f0f2' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Inversionista</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto (bruto/neto)</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Recibo</th>
                          <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.payouts.map((p) => (
                          <tr key={p.id}>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{p.id}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                              {userLabel(p.investor_id, investorMap)}
                              {bankMap[p.investor_id] && (
                                <div className="muted" style={{ marginTop: 2 }}>
                                  {bankMap[p.investor_id].nombre_banco || 'Banco n/d'} · CTA {bankMap[p.investor_id].numero_cuenta || 'n/d'}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                              <div>Neto a pagar: {formatMoney(p.amount)}</div>
                              <small className="muted">Bruto estimado: {formatMoney(Number(p.amount || 0) / 0.99)}</small>
                            </td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 8,
                                background: (p.status || '').toLowerCase() === 'paid' ? '#d7f2e3' : '#ffe9cc',
                                color: (p.status || '').toLowerCase() === 'paid' ? '#0a7a4b' : '#a85f0a',
                                fontWeight: 700,
                              }}>
                                {formatStatusLabel(p.status)}
                              </span>
                            </td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                              {p.receipt_signed_url ? (
                                <a className="btn" href={p.receipt_signed_url} target="_blank" rel="noreferrer">Ver</a>
                              ) : (
                                <span style={{ color: '#888' }}>Sin comprobante</span>
                              )}
                              <div style={{ marginTop: 6 }}>
                                <label className="ops-file-upload-label">
                                  <input className="ops-file-input-hidden" type="file" accept=".pdf,image/*" onChange={(e) => setReceiptFiles(prev => ({ ...prev, [p.id]: e.target.files?.[0] || null }))} />
                                  Subir comprobante
                                </label>
                              </div>
                            </td>
                            <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button className="btn btn--primary" onClick={() => updatePayoutStatus(p.id, 'paid')} disabled={p.status === 'paid'}>Marcar pagado</button>
                            </td>
                          </tr>
                        ))}
                        {g.payouts.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay payouts en este filtro</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'disbursements' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Oportunidad</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Monto bruto / neto</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Estado</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Comprobante / Contrato</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {disbursements.map((d) => (
                <tr key={d.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{d.id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>{d.opportunity_id}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                    {formatMoney(d.monto_bruto || 0)}
                    <div className="muted">Neto banco: {formatMoney(d.monto_neto || 0)}</div>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                    {d.estado}
                    <div className="muted">{d.paid_at ? `Pagado: ${new Date(d.paid_at).toLocaleString('es-BO')}` : 'Pendiente'}</div>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {d.comprobante_url ? <a href={d.comprobante_signed_url || d.comprobante_url} target="_blank" rel="noreferrer">Ver comprobante</a> : <span className="muted">Sin comprobante</span>}
                      <label className="ops-file-upload-label">
                        <input className="ops-file-input-hidden" type="file" accept=".pdf,image/*" onChange={(e) => uploadDisbReceiptImmediate(d, e.target.files?.[0] || null)} />
                        Subir comprobante
                      </label>
                      {d.contract_url ? (
                        <a href={d.contract_signed_url || d.contract_url} target="_blank" rel="noreferrer">Contrato generado</a>
                      ) : (
                        <span className="muted">El contrato se generará automáticamente al registrar</span>
                      )}
                    </div>
                  </td>
                <td style={{ padding: 8, borderBottom: '1px solid #f3f3f3', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="btn btn--primary"
                    disabled={d.estado === 'pagado'}
                    onClick={() => registerDirectedPayment(d)}
                      title="Sube el comprobante del pago al banco (y opcionalmente el contrato) y luego pulsa aquí. Generaremos el contrato automático y notificaremos al prestatario e inversionistas."
                    >
                      Registrar pago dirigido
                    </button>
                    <span
                      title="Sube el comprobante del pago al banco antes de registrar. El contrato se genera automático y se notifican prestatario e inversionistas."
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: '#e5ecef',
                        color: '#1f2f38',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: 'help',
                      }}
                    >
                      ?
                    </span>
                  </td>
                </tr>
              ))}
              {disbursements.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#55747b' }}>No hay desembolsos registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOperations;
