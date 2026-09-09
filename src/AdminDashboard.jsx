import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import AdminNav from './components/AdminNav';
import './LoanRequestsList.css';
import './AdminDashboard.css';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';

// --- Componente para Inversiones Pendientes ---
const currencyFormatter = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'BOB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? currencyFormatter.format(number) : 'Bs 0.00';
};

const isWithin48h = (dateStr) => {
  return (Date.now() - new Date(dateStr).getTime()) < 48 * 60 * 60 * 1000;
};

// Sin cambios: activa de verdad (confirma pago de un inversionista), no tiene equivalente
// en ningun otro panel - 2026-09-09, confirmado con Isaac antes de tocar este archivo.
const PendingInvestments = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPendingInvestments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('inversiones')
        .select(`
          id,
          amount,
          created_at,
          opportunity_id
        `)
        .eq('status', 'pending');

      if (error) throw error;
      setInvestments(data || []);
    } catch (err) {
      console.error('Error fetching pending investments:', err);
      setError('Error al cargar las inversiones pendientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInvestments();
  }, []);

  const handleConfirm = async (investmentId) => {
    try {
      const { error } = await supabase
        .from('inversiones')
        .update({ status: 'confirmed' })
        .eq('id', investmentId);

      if (error) throw error;

      // Actualiza la UI eliminando la inversión confirmada de la lista
      setInvestments(currentInvestments =>
        currentInvestments.filter(inv => inv.id !== investmentId)
      );

    } catch (err) {
      console.error('Error confirming investment:', err);
      alert('Hubo un error al confirmar la inversión.');
    }
  };

  if (loading) return <p>Cargando inversiones pendientes...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="pending-investments-section">
      <h3>Inversiones Pendientes de Confirmación de Pago</h3>
      {investments.length === 0 ? (
        <p>No hay inversiones pendientes en este momento.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>ID Inversión</th>
              <th>ID Oportunidad</th>
              <th>Email Inversionista</th>
              <th>Monto</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((inv) => (
              <tr key={inv.id}>
                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                <td>{inv.id}</td>
                <td>{inv.opportunity_id}</td>
                <td>{inv.profiles?.email || 'N/A'}</td>
                <td>Bs {inv.amount.toLocaleString()}</td>
                <td>
                  <button onClick={() => handleConfirm(inv.id)} className="confirm-btn">
                    Confirmar Pago
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};


// --- Componentes de UI ---

const KpiCard = ({ title, value, subtitle, type = 'default' }) => (
  <div className={`kpi-card ${type}`}>
    <h3 className="card-title">{title}</h3>
    <p className="card-value">{value}</p>
    {subtitle && <p className="card-subtitle">{subtitle}</p>}
  </div>
);

const RiskDistributionChart = ({ stats }) => {
  const totalProfiles = stats.perfilA + stats.perfilB + stats.perfilC;
  if (totalProfiles === 0) {
    return (
        <div className="risk-chart">
            <h3>Distribución de Riesgo</h3>
            <p style={{textAlign: 'center', color: '#888'}}>Aún no hay perfiles de riesgo para mostrar.</p>
        </div>
    );
  }

  const getPercentage = (count) => (totalProfiles > 0 ? (count / totalProfiles) * 100 : 0);

  const segments = [
    { profile: 'A', count: stats.perfilA, className: 'profile-a', color: '#28a745' },
    { profile: 'B', count: stats.perfilB, className: 'profile-b', color: '#0275d8' },
    { profile: 'C', count: stats.perfilC, className: 'profile-c', color: '#f0ad4e' },
  ];

  return (
    <div className="risk-chart">
      <h3>Distribución de Riesgo</h3>
      <div className="risk-bar">
        {segments.map(seg => (
          <div
            key={seg.profile}
            className={`risk-segment ${seg.className}`}
            style={{ width: `${getPercentage(seg.count)}%` }}
            title={`Perfil ${seg.profile}: ${getPercentage(seg.count).toFixed(1)}%`}
          >
            {getPercentage(seg.count) > 10 ? `${getPercentage(seg.count).toFixed(0)}%` : ''}
          </div>
        ))}
      </div>
      <ul className="risk-legend">
        {segments.map(seg => (
          <li key={seg.profile}>
            <span className="legend-dot" style={{ backgroundColor: seg.color }}></span>
            Perfil {seg.profile}: {seg.count}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Nombres legibles para cada estado real (el literal que vive en solicitudes.estado) - se usan
// para la insignia de la fila y en el panel de detalle. No agrupan nada, son 1 a 1.
const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  'documentos-en-revision': 'Documentos en revisión',
  'pre-aprobado': 'Pre-aprobado',
  aprobado_para_oferta: 'Aprobado (para oferta)',
  desembolsado: 'Desembolsado',
  rechazado: 'Rechazado',
};

// Mismos 3 umbrales que corre el scorecard automático al decidir de verdad
// (supabase/functions/handle-new-solicitud/index.ts, función runRiskScorecard) - duplicados
// a propósito acá, en el frontend, para poder mostrar "por qué" sin tocar ese archivo
// compartido (usado también por Análisis de Riesgo y Operaciones). Es un cálculo EN VIVO
// sobre los datos actuales de la solicitud, no un registro histórico guardado - hoy esa razón
// no se persiste en ningún lado en el momento de la decisión real, así que si los datos
// declarados se editaron después, el motivo mostrado acá puede no coincidir exacto con el
// que se aplicó en su momento. Cubre el caso más común (rechazo/aprobación automática por
// scorecard) y el chequeo de CI duplicada; no cubre un rechazo manual con motivo propio de
// un analista, que tampoco se guarda hoy en ningún lado.
const ESTADOS_ACTIVOS_CI = ['pendiente', 'pre-aprobado', 'documentos-en-revision', 'aprobado_para_oferta'];

function evaluarMotivo(req, todasLasSolicitudes) {
  const estado = (req.estado || '').toLowerCase().trim();

  if (estado === 'rechazado' && req.cedula_identidad) {
    const duplicada = todasLasSolicitudes.some(o =>
      o.id !== req.id &&
      o.cedula_identidad === req.cedula_identidad &&
      ESTADOS_ACTIVOS_CI.includes((o.estado || '').toLowerCase().trim())
    );
    if (duplicada) return 'Ya existe otra solicitud activa con esta misma Cédula (posible duplicado)';
  }

  const ingresos = parseFloat(req.ingreso_mensual);
  const saldoDeuda = parseFloat(req.saldo_deuda_tc);
  const tasaAnual = parseFloat(req.tasa_interes_tc);
  const antiguedad = parseInt(req.antiguedad_laboral, 10);

  if ([ingresos, saldoDeuda, tasaAnual, antiguedad].some(Number.isNaN)) {
    return 'Datos incompletos o inválidos en la solicitud';
  }

  if (ingresos < 3000) {
    return `Ingreso mensual ${formatCurrency(ingresos)} (mínimo Bs 3.000)`;
  }

  const interesMensual = (saldoDeuda * (tasaAnual / 100)) / 12;
  const amortizacion = saldoDeuda * 0.01;
  const dti = ((interesMensual + amortizacion) / ingresos) * 100;

  if (dti > 50) {
    return `DTI ${dti.toFixed(1)}% (máximo 50%)`;
  }

  let score = 0;
  if (ingresos > 8000) score += 3;
  else if (ingresos >= 5000) score += 2;
  else if (ingresos >= 3000) score += 1;

  if (dti < 20) score += 3;
  else if (dti <= 30) score += 2;
  else if (dti <= 50) score += 1;

  if (antiguedad >= 24) score += 2;
  else if (antiguedad >= 12) score += 1;

  let perfil = null;
  if (score >= 7) perfil = 'A';
  else if (score >= 5) perfil = 'B';
  else if (score >= 2) perfil = 'C';

  if (!perfil) return `Score insuficiente (${score} pts)`;
  return `Perfil ${perfil} · DTI ${dti.toFixed(1)}% · score ${score} pts`;
}

// --- Componente Principal ---

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    solicitudesHoy: 0, montoPreAprobadoHoy: 0,
    totalPendientes: 0, totalPreAprobados: 0, totalAprobados: 0, totalRechazados: 0,
    perfilA: 0, perfilB: 0, perfilC: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [alertMessage, setAlertMessage] = useState('');
  const prevRejectionsRef = useRef(0);

  // Agrupa los 6 estados reales en 4 baldes para el resumen y los filtros ("documentos-en-
  // revision" cuenta como pre-aprobado - ya paso el scorecard -, "aprobado_para_oferta" y
  // "desembolsado" cuentan como aprobado). La insignia de cada fila sigue mostrando el
  // estado real, esto solo agrupa para el KPI/filtro.
  const normalizedStatus = (state) => {
    if (!state) return 'pendiente';
    const lower = state.toLowerCase().trim();
    if (lower === 'documentos-en-revision') return 'pre-aprobado';
    if (lower === 'aprobado_para_oferta' || lower === 'desembolsado') return 'aprobado';
    return lower;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Unimos solicitudes con oportunidades para obtener el perfil de riesgo
      const { data: requestsData, error: requestsError } = await supabase
        .from('solicitudes')
        .select('*')
        .eq('tipo_solicitud', 'prestatario')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      const requestIds = (requestsData || []).map(r => r.id);
      let oppsMap = {};
      if (requestIds.length > 0) {
        const { data: oppsData, error: oppsError } = await supabase
          .from('oportunidades')
          .select('solicitud_id, perfil_riesgo')
          .in('solicitud_id', requestIds);
        if (oppsError) throw oppsError;
        oppsMap = (oppsData || []).reduce((acc, opp) => {
          acc[opp.solicitud_id] = opp.perfil_riesgo;
          return acc;
        }, {});
      }

      const processedRequests = (requestsData || []).map(r => ({
        ...r,
        perfil_riesgo: oppsMap[r.id] || null
      }));
      setRequests(processedRequests);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statsPayload = processedRequests.reduce((acc, r) => {
        const memoEstado = normalizedStatus(r.estado);
        const isToday = new Date(r.created_at) >= today;

        acc.estados[memoEstado] = (acc.estados[memoEstado] || 0) + 1;

        if (isToday) {
          acc.solicitudesHoy += 1;
          if (memoEstado === 'pre-aprobado') {
            acc.montoPreAprobadoHoy += r.monto_solicitado;
          }
        }

        if (r.perfil_riesgo) {
          const perfilKey = `perfil${r.perfil_riesgo}`;
          acc.perfiles[perfilKey] = (acc.perfiles[perfilKey] || 0) + 1;
        }

        return acc;
      }, {
        solicitudesHoy: 0, montoPreAprobadoHoy: 0,
        estados: {}, perfiles: {}
      });

      setStats({
        solicitudesHoy: statsPayload.solicitudesHoy,
        montoPreAprobadoHoy: statsPayload.montoPreAprobadoHoy,
        totalPendientes: statsPayload.estados.pendiente || 0,
        totalPreAprobados: statsPayload.estados['pre-aprobado'] || 0,
        totalAprobados: statsPayload.estados.aprobado || 0,
        totalRechazados: statsPayload.estados.rechazado || 0,
        perfilA: statsPayload.perfiles.perfilA || 0,
        perfilB: statsPayload.perfiles.perfilB || 0,
        perfilC: statsPayload.perfiles.perfilC || 0,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Error al cargar los datos del panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (stats.totalRechazados > prevRejectionsRef.current) {
      setAlertMessage('Rechazos diarios en aumento. Revisá las solicitudes con más atención.');
      const timer = setTimeout(() => setAlertMessage(''), 4000);
      return () => clearTimeout(timer);
    }
    prevRejectionsRef.current = stats.totalRechazados;
    return undefined;
  }, [stats.totalRechazados]);

  useEffect(() => {
    const subscription = supabase.channel('solicitudes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' },
        () => fetchDashboardData()
      ).subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const handleSelectRequest = (request) => setSelectedRequest(request);

  const statusFilters = useMemo(() => {
    const states = new Set();
    requests.forEach(req => {
      states.add(normalizedStatus(req.estado));
    });
    return ['todos', ...Array.from(states)];
  }, [requests]);

  const filterTooltips = {
    todos: 'Ver todas las solicitudes',
    pendiente: 'Recién ingresadas, todavía sin evaluar',
    'pre-aprobado': 'Pasaron el scorecard automático o están subiendo documentos',
    aprobado: 'Aprobadas para oferta o ya desembolsadas',
    rechazado: 'Rechazadas por el scorecard automático o por Cédula duplicada',
  };

  const filteredRequests = useMemo(() => {
    if (filter === 'todos') return requests;
    return requests.filter(req => normalizedStatus(req.estado) === filter);
  }, [filter, requests]);

  return (
    <div className="loan-requests-list admin-dashboard">
      <AdminNav />
      <InvestorBreadcrumbs items={[{ label: 'Inicio', to: '/admin-dashboard' }, { label: 'Centro de Operaciones' }]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Centro de Operaciones</h2>
        <button className="btn btn--primary" onClick={() => window.location.href = '/admin/operaciones'}>
          Ir a Operaciones (Pagos)
        </button>
      </div>
      {alertMessage && (
        <div className="alert-banner" role="status">
          {alertMessage}
        </div>
      )}

      {loading ? <p>Cargando métricas...</p> : (
        <>
          <div className="kpi-dashboard">
            <KpiCard title="Solicitudes Hoy" value={stats.solicitudesHoy} />
            <KpiCard title="Monto Pre-Aprobado Hoy" value={formatCurrency(stats.montoPreAprobadoHoy)} />
            <KpiCard title="Pendientes" value={stats.totalPendientes} />
            <KpiCard title="Pre-Aprobadas" value={stats.totalPreAprobados} type="total-approved" />
            <KpiCard title="Aprobadas" value={stats.totalAprobados} type="total-approved" />
            <KpiCard title="Rechazadas" value={stats.totalRechazados} type="total-rejected" />
          </div>
          <RiskDistributionChart stats={stats} />
        </>
      )}

      {(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const hoy = requests.filter(r => new Date(r.created_at) >= todayStart);
        if (hoy.length === 0) return null;
        return (
          <div className="nuevas-hoy-banner">
            <div className="nuevas-hoy-header">
              <span className="nuevas-hoy-count">
                {hoy.length} nueva{hoy.length !== 1 ? 's' : ''} hoy
              </span>
              <span className="nuevas-hoy-subtitle">Ingresadas desde las 00:00 de hoy</span>
            </div>
            <div className="nuevas-hoy-list">
              {hoy.map(r => (
                <div key={r.id} className="nuevas-hoy-item">
                  <span className="nuevas-hoy-hora">
                    {new Date(r.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="nuevas-hoy-nombre">{r.nombre_completo}</span>
                  <span className="nuevas-hoy-monto">{formatCurrency(r.monto_solicitado)}</span>
                  <span className={`status status-${r.estado}`}>{ESTADO_LABELS[r.estado] || r.estado}</span>
                  <button className="btn btn--ghost btn--xs" onClick={() => handleSelectRequest(r)}>Ver</button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <h3>Solicitudes</h3>
      <div className="filter-buttons">
        {statusFilters.map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={filter === status ? 'filter-btn filter-btn--active' : 'filter-btn'}
            title={filterTooltips[status] || ''}
          >
            {status === 'todos' ? 'Todos' : status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>
      <div className="filter-helper">
        <span className="filter-helper-label">Estado seleccionado:</span>
        <span className="filter-helper-value">{filter === 'todos' ? 'Todos los estados' : filterTooltips[filter] || filter.replace('-', ' ')}</span>
      </div>

      {loading && <p>Cargando solicitudes...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>ID</th>
                <th>Nombre</th>
                <th>Monto Solicitado</th>
                <th>Estado</th>
                <th>Motivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td>
                    {new Date(req.created_at).toLocaleDateString()}
                    {isWithin48h(req.created_at) && <span className="new-badge">Nuevo</span>}
                  </td>
                  <td>{req.id}</td>
                  <td>{req.nombre_completo}</td>
                  <td>{formatCurrency(req.monto_solicitado)}</td>
                  <td>
                    <span className={`status status-${req.estado}`}>{ESTADO_LABELS[req.estado] || req.estado}</span>
                    {req.estado === 'documentos-en-revision' && (
                      <span className="priority-tag priority-tag--hot" style={{ marginLeft: 6 }}>🔥 Lead caliente</span>
                    )}
                  </td>
                  <td>
                    <span className="motivo-cell" title={evaluarMotivo(req, requests)}>
                      {evaluarMotivo(req, requests)}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn--ghost btn--xs" onClick={() => handleSelectRequest(req)}>
                      Ver solicitud
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filteredRequests.length === 0 && !loading && <p>No hay solicitudes que coincidan con el filtro seleccionado.</p>}
      {selectedRequest && (
        <div className="request-detail-panel">
          <div className="request-detail-header">
            <h3>Solicitud #{selectedRequest.id} — {selectedRequest.nombre_completo}</h3>
            <button className="btn btn--ghost btn--xs" onClick={() => setSelectedRequest(null)}>Cerrar</button>
          </div>
          <div className="request-detail-grid">
            <div>
              <strong>Estado</strong>
              <p>{ESTADO_LABELS[selectedRequest.estado] || selectedRequest.estado}</p>
            </div>
            <div>
              <strong>Fecha de solicitud</strong>
              <p>{new Date(selectedRequest.created_at).toLocaleString('es-BO')}</p>
            </div>
            <div>
              <strong>Cédula de Identidad</strong>
              <p>{selectedRequest.cedula_identidad || '--'}</p>
            </div>
            <div>
              <strong>Email</strong>
              <p>{selectedRequest.email || '--'}</p>
            </div>
            <div>
              <strong>Teléfono</strong>
              <p>{selectedRequest.telefono || '--'}</p>
            </div>
            <div>
              <strong>Situación laboral</strong>
              <p>{selectedRequest.situacion_laboral || '--'}{selectedRequest.antiguedad_laboral ? ` · ${selectedRequest.antiguedad_laboral} meses` : ''}</p>
            </div>
            <div>
              <strong>Ingreso mensual</strong>
              <p>{selectedRequest.ingreso_mensual ? formatCurrency(selectedRequest.ingreso_mensual) : '--'}</p>
            </div>
            <div>
              <strong>Deuda de tarjeta declarada</strong>
              <p>{selectedRequest.saldo_deuda_tc ? formatCurrency(selectedRequest.saldo_deuda_tc) : '--'}{selectedRequest.tasa_interes_tc ? ` · ${selectedRequest.tasa_interes_tc}% anual` : ''}</p>
            </div>
            <div>
              <strong>Plazo solicitado</strong>
              <p>{selectedRequest.plazo_meses ? `${selectedRequest.plazo_meses} meses` : '--'}</p>
            </div>
            <div>
              <strong>Monto solicitado</strong>
              <p>{formatCurrency(selectedRequest.monto_solicitado)}</p>
            </div>
            <div>
              <strong>Perfil de riesgo asignado</strong>
              <p>{selectedRequest.perfil_riesgo || '--'}</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Motivo (recalculado con los datos actuales)</strong>
              <p>{evaluarMotivo(selectedRequest, requests)}</p>
            </div>
          </div>
        </div>
      )}

      <hr style={{ margin: '32px 0' }} />
      <PendingInvestments />
    </div>
  );
};

export default AdminDashboard;
