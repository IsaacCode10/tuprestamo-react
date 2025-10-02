import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import AdminNav from './components/AdminNav';
import './LoanRequestsList.css';
import './AdminDashboard.css';

// --- Componente para Inversiones Pendientes ---
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
  const [synthesizing, setSynthesizing] = useState(null); // State to track which request is being synthesized
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('todos');

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
      
      // El join en Supabase devuelve oportunidades como un array. Lo aplanamos.
      const processedRequests = requestsData.map(r => ({
        ...r,
        perfil_riesgo: r.oportunidades?.length > 0 ? r.oportunidades[0].perfil_riesgo : null
      }));
      setRequests(processedRequests);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statsPayload = processedRequests.reduce((acc, r) => {
        const isToday = new Date(r.created_at) >= today;

        acc.estados[r.estado] = (acc.estados[r.estado] || 0) + 1;

        if (isToday) {
          acc.solicitudesHoy += 1;
          if (r.estado === 'pre-aprobado') {
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
    const subscription = supabase.channel('solicitudes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes' }, 
        () => fetchDashboardData()
      ).subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const handleSynthesize = async (solicitudId) => {
    setSynthesizing(solicitudId);
    try {
      const response = await fetch('/api/sintetizar-perfil-riesgo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ solicitud_id: solicitudId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido del servidor');
      }

      alert('¡Perfil de riesgo sintetizado con éxito!');
      // Re-fetch data to show updated profile info
      fetchDashboardData(); 

    } catch (error) {
      console.error('Error al sintetizar el perfil:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSynthesizing(null);
    }
  };

  const filteredRequests = useMemo(() => {
    if (filter === 'todos') return requests;
    return requests.filter(req => req.estado === filter);
  }, [filter, requests]);

  return (
    <div className="loan-requests-list admin-dashboard">
      <AdminNav />
      <h2>Centro de Operaciones</h2>
      
      {loading ? <p>Cargando métricas...</p> : (
        <>
          <div className="kpi-dashboard">
            <KpiCard title="Solicitudes Hoy" value={stats.solicitudesHoy} />
            <KpiCard title="Monto Pre-Aprobado Hoy" value={`Bs ${stats.montoPreAprobadoHoy.toLocaleString()}`} />
            <KpiCard title="Total Pre-Aprobadas" value={stats.totalPreAprobados} type="total-approved" />
            <KpiCard title="Total Rechazadas" value={stats.totalRechazados} type="total-rejected" />
          </div>
          <RiskDistributionChart stats={stats} />
        </>
      )}

      <hr />

      <PendingInvestments />

      <hr />

      <h3>Detalle de Solicitudes</h3>
      <div className="filter-buttons">
        <button onClick={() => setFilter('todos')} className={filter === 'todos' ? 'active' : ''}>Todos</button>
        <button onClick={() => setFilter('pre-aprobado')} className={filter === 'pre-aprobado' ? 'active' : ''}>Pre-Aprobados</button>
        <button onClick={() => setFilter('rechazado')} className={filter === 'rechazado' ? 'active' : ''}>Rechazados</button>
      </div>

      {loading && <p>Cargando solicitudes...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Monto Solicitado</th>
              <th>Ingresos Mensuales</th>
              <th>Deudas Mensuales</th>
              <th>Perfil Riesgo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((req) => (
              <tr key={req.id}>
                <td>{new Date(req.created_at).toLocaleDateString()}</td>
                <td>{req.nombre_completo}</td>
                <td>Bs {req.monto_solicitado}</td>
                <td>Bs {req.ingresos_mensuales}</td>
                <td>Bs {req.deudas_mensuales}</td>
                <td>
                  {req.perfil_riesgo ? (
                     <span className={`suggestion-label suggestion-${req.perfil_riesgo.toLowerCase()}`}>
                        {req.perfil_riesgo}
                      </span>
                  ) : '--'}
                </td>
                <td><span className={`status status-${req.estado}`}>{req.estado}</span></td>
                <td>
                  <button 
                    onClick={() => handleSynthesize(req.id)} 
                    className="confirm-btn"
                    disabled={synthesizing === req.id}
                  >
                    {synthesizing === req.id ? 'Sintetizando...' : 'Sintetizar Perfil'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {filteredRequests.length === 0 && !loading && <p>No hay solicitudes que coincidan con el filtro seleccionado.</p>}
    </div>
  );
};

export default AdminDashboard;
