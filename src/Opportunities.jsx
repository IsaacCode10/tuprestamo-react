import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { trackEvent } from '@/analytics.js';
import './Opportunities.css';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';

const OpportunityCard = ({ opp }) => {
  const rendimientoBruto = opp.tasa_rendimiento_inversionista;
  const comisionServicio = opp.comision_servicio_inversionista_porcentaje;
  const navigate = useNavigate();
  const rendimientoNeto = (rendimientoBruto * (1 - (comisionServicio / 100)));

  const handleViewDetails = () => {
    navigate(`/oportunidades/${opp.id}`);
  };

  return (
    <div className="opportunity-card">
      <div className="card-header">
        <h3>Bs. {opp.monto.toLocaleString('es-BO')}</h3>
        <span className={`risk-badge risk-${opp.perfil_riesgo}`}>
          Riesgo {opp.perfil_riesgo}
        </span>
      </div>
      <p className="opportunity-id">ID: {opp.id}</p>
      <div className="card-body">
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="label">Rendimiento Anual</div>
            <div className="value">{rendimientoBruto.toFixed(2)}%</div>
          </div>
          <div className="metric-item">
            <div className="label">Plazo</div>
            <div className="value">{opp.plazo_meses}</div>
            <div className="label">meses</div>
          </div>
        </div>
        <div className="returns-breakdown">
          <span>Comision de servicio: {comisionServicio}%</span>
          <br />
          <span>Tu rendimiento neto estimado: <strong>{rendimientoNeto.toFixed(2)}%</strong></span>
        </div>
      </div>
      <div className="card-footer">
        <button className="invest-button" onClick={handleViewDetails}>Ver Detalles y Invertir</button>
      </div>
    </div>
  );
};

const Opportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ risk: '', minRate: '', maxMonths: '', minAmount: '' });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    trackEvent('Viewed Marketplace');

    const fetchOpportunities = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('oportunidades')
        .select(`
          id, monto, plazo_meses, perfil_riesgo,
          tasa_rendimiento_inversionista, comision_servicio_inversionista_porcentaje
        `)
        .eq('estado', 'disponible')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching opportunities:', error);
        setError('Error al cargar las oportunidades de inversion.');
      } else {
        setOpportunities(data || []);
      }
      setLoading(false);
    };

    fetchOpportunities();
  }, []);

  // Abrir filtros si viene ?filters=1
  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    if (qs.get('filters') === '1') {
      setShowFilters(true);
    }
  }, [location.search]);

  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('oportunidades')
        .select(`id, monto, plazo_meses, perfil_riesgo, tasa_rendimiento_inversionista, comision_servicio_inversionista_porcentaje`)
        .eq('estado', 'disponible');

      if (filters.risk) query = query.eq('perfil_riesgo', filters.risk);
      if (filters.minRate) query = query.gte('tasa_rendimiento_inversionista', Number(filters.minRate));
      if (filters.maxMonths) query = query.lte('plazo_meses', Number(filters.maxMonths));
      
      query = query.order('tasa_rendimiento_inversionista', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      setOpportunities(data || []);
      trackEvent('Marketplace_Filter_Applied', { ...filters });
    } catch (e) {
      console.error('Filter fetch error:', e);
      setError('No se pudieron aplicar los filtros.');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setFilters({ risk: '', minRate: '', maxMonths: '', minAmount: '' });
    navigate('/oportunidades', { replace: true });
    // Reusar carga inicial sin filtros
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('oportunidades')
      .select('id, monto, plazo_meses, perfil_riesgo, tasa_rendimiento_inversionista, comision_servicio_inversionista_porcentaje')
      .eq('estado', 'disponible')
      .order('created_at', { ascending: false });
    if (!error) setOpportunities(data || []);
    setLoading(false);
  };

  if (loading) {
    return <p>Cargando oportunidades...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div className="opportunities-container">
      <InvestorBreadcrumbs items={[
        { label: 'Inicio', to: '/investor-dashboard' },
        { label: 'Oportunidades' },
      ]} />
      <h2>Oportunidades de Inversion</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 16px 0' }}>
        <button className="btn" onClick={() => setShowFilters(v => !v)}>
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
        {showFilters && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={filters.risk} onChange={(e) => setFilters(f => ({ ...f, risk: e.target.value }))}>
              <option value="">Riesgo (todos)</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
            <input type="number" min="0" step="0.1" placeholder="Tasa mínima %" value={filters.minRate} onChange={(e) => setFilters(f => ({ ...f, minRate: e.target.value }))} />
            <select value={filters.maxMonths} onChange={(e) => setFilters(f => ({ ...f, maxMonths: e.target.value }))}>
              <option value="">Plazo máximo</option>
              <option value="12">12</option>
              <option value="18">18</option>
              <option value="24">24</option>
            </select>
            <input type="number" min="0" step="100" placeholder="Monto mínimo" value={filters.minAmount} onChange={(e) => setFilters(f => ({ ...f, minAmount: e.target.value }))} />
            <button className="btn btn--primary" onClick={applyFilters}>Aplicar</button>
            <button className="btn" onClick={resetFilters}>Limpiar</button>
          </div>
        )}
      </div>
      {opportunities.length === 0 ? (
        <div>
          <p>
            EN ESTE MOMENTO NO TENEMOS OPORTUNIDADES. TE ENVIAREMOS UNA ALERTA CUANDO TENGAMOS UNA OPORTUNIDAD.
          </p>
          <button className="btn" onClick={() => navigate('/investor-dashboard')}>Volver al Panel</button>
        </div>
      ) : (
        <div className="opportunities-grid">
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Opportunities;
