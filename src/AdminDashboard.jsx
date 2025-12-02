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

// --- Componente Principal ---

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ 
    solicitudesHoy: 0, montoPreAprobadoHoy: 0,
    totalPendientes: 0, totalPreAprobados: 0, totalRechazados: 0,
    perfilA: 0, perfilB: 0, perfilC: 0
  });
  const [fundingStats, setFundingStats] = useState({
    monthCount: 0,
    monthAmount: 0,
    totalCount: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('todos');
  const [alertMessage, setAlertMessage] = useState('');
  const prevRejectionsRef = useRef(0);

  const normalizedStatus = (state) => {
    if (!state) return 'pendiente';
    const lower = state.toLowerCase().trim();
    if (lower === 'documentos-en-revision') return 'pre-aprobado';
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
        .eq('tipo_solicitud', 'prestatario');

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
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

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
        totalRechazados: statsPayload.estados.rechazado || 0,
        perfilA: statsPayload.perfiles.perfilA || 0,
        perfilB: statsPayload.perfiles.perfilB || 0,
        perfilC: statsPayload.perfiles.perfilC || 0,
      });

      // Fondeo: totales y mes actual (fondeada/activo/cerrado/en_mora)
      let funding = { monthCount: 0, monthAmount: 0, totalCount: 0, totalAmount: 0 };
      const { data: funded, error: fundErr } = await supabase
        .from('oportunidades')
        .select('id, monto, estado, created_at, updated_at')
        .in('estado', ['fondeada', 'activo', 'cerrado', 'en_mora']);
      if (fundErr) {
        console.warn('No se pudo cargar fondeo para KPIs', fundErr);
      } else if (funded) {
        funding = funded.reduce((acc, o) => {
          const refDate = o.updated_at ? new Date(o.updated_at) : new Date(o.created_at);
          acc.totalCount += 1;
          acc.totalAmount += Number(o.monto || 0);
          if (refDate >= monthStart) {
            acc.monthCount += 1;
            acc.monthAmount += Number(o.monto || 0);
          }
          return acc;
        }, funding);
      }
      setFundingStats(funding);

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
    todos: 'Ver todas las solicitudes activas',
    pendiente: 'Pendientes de iniciar evaluación documental',
    'documentos-en-revision': 'Documentos en análisis previo a la pre-aprobación',
    'pre-aprobado': 'Listas para desembolso o seguimiento del pago',
    rechazado: 'Rechazadas por riesgo o documentación incompleta'
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
              <KpiCard title="Total Pre-Aprobadas" value={stats.totalPreAprobados} type="total-approved" />
              <KpiCard title="Total Rechazadas" value={stats.totalRechazados} type="total-rejected" />
              <KpiCard
                title="Fondeadas (mes)"
                value={fundingStats.monthCount}
                subtitle={`${formatCurrency(fundingStats.monthAmount)} este mes`}
              />
              <KpiCard
                title="Fondeadas (total)"
                value={fundingStats.totalCount}
                subtitle={formatCurrency(fundingStats.totalAmount)}
              />
            </div>
          <RiskDistributionChart stats={stats} />
        </>
      )}

      <hr />

      <PendingInvestments />

      <hr />

      <h3>Detalle de Solicitudes</h3>
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
        <table>
          <thead>
            <tr>
              <th>Solicitud</th>
              <th>Fecha</th>
              <th>ID</th>
              <th>Nombre</th>
              <th>Monto Solicitado</th>
              <th>Ingresos Mensuales</th>
              <th>Perfil Riesgo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((req) => (
              <tr key={req.id}>
                <td>
                  <span className={`priority-tag ${req.estado === 'documentos-en-revision' ? 'priority-tag--hot' : ''}`}>
                    {req.estado === 'documentos-en-revision' ? 'Lead caliente' : 'Solicitud'}
                  </span>
                </td>
                <td>{new Date(req.created_at).toLocaleDateString()}</td>
                <td>{req.id}</td>
                <td>{req.nombre_completo}</td>
                <td>{formatCurrency(req.monto_solicitado)}</td>
                <td>{req.ingreso_mensual ? formatCurrency(req.ingreso_mensual) : '--'}</td>
                <td>
                  {req.perfil_riesgo ? (
                    <span className={`suggestion-label suggestion-${req.perfil_riesgo.toLowerCase()}`}>
                      {req.perfil_riesgo}
                    </span>
                  ) : '--'}
                </td>
                <td><span className={`status status-${req.estado}`}>{req.estado}</span></td>
                <td>
                  <button className="btn btn--ghost btn--xs" onClick={() => handleSelectRequest(req)}>
                    Ver solicitud
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {filteredRequests.length === 0 && !loading && <p>No hay solicitudes que coincidan con el filtro seleccionado.</p>}
      {selectedRequest && (
        <div className="request-detail-panel">
          <div className="request-detail-header">
            <h3>Solicitud #{selectedRequest.id}</h3>
            <button className="btn btn--ghost btn--xs" onClick={() => setSelectedRequest(null)}>Cerrar</button>
          </div>
          <div className="request-detail-grid">
            <div>
              <strong>Estado</strong>
              <p>{selectedRequest.estado}</p>
            </div>
            <div>
              <strong>Perfil de riesgo</strong>
              <p>{selectedRequest.perfil_riesgo ?? '--'}</p>
            </div>
            <div>
              <strong>Monto solicitado</strong>
              <p>{formatCurrency(selectedRequest.monto_solicitado)}</p>
            </div>
            <div>
              <strong>Ingresos mensuales</strong>
              <p>{selectedRequest.ingreso_mensual ? formatCurrency(selectedRequest.ingreso_mensual) : '--'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
