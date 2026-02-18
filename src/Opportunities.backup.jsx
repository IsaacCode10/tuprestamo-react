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

  const riskLabel = ({
    A: 'Conservador (A)',
    B: 'Balanceado (B)',
    C: 'DinÃƒÆ’Ã‚¡mico (C)'
  }[opp.perfil_riesgo]) || `Riesgo ${opp.perfil_riesgo}`;

  const handleViewDetails = () => {
    navigate(`/oportunidades/${opp.id}`);
  };

  return (
    <div className="opportunity-card">
      <div className="card-header">
        <h3>Bs. {opp.monto.toLocaleString('es-BO')}</h3>
        <span className={`risk-badge risk-${opp.perfil_riesgo}`}>{riskLabel}</span>
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
          <span>ComisiÃƒÆ’Ã‚Â³n de servicio: {comisionServicio}%</span>
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
  const [filters, setFilters] = useState({ minRate: '', maxMonths: '' });
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
        .order('tasa_rendimiento_inversionista', { ascending: false });

      if (error) {
        console.error('Error fetching opportunities:', error);
        setError('Error al cargar las oportunidades de inversiÃƒÆ’Ã‚Â³n.');
      } else {
        setOpportunities(data || []);
      }
      setLoading(false);
    };

    fetchOpportunities();
  }, []);

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
        .select('id, monto, plazo_meses, perfil_riesgo, tasa_rendimiento_inversionista, comision_servicio_inversionista_porcentaje')
        .eq('estado', 'disponible');

      if (filters.minRate) query = query.gte('tasa_rendimiento_inversionista', Number(filters.minRate));
      if (filters.maxMonths) query = query.lte('plazo_meses', Number(filters.maxMonths));

      query = query.order('tasa_rendimiento_inversionista', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      setOpportunities(data || []);
      trackEvent('Marketplace_Filter_Applied', { min_rate: filters.minRate, max_months: filters.maxMonths });
    } catch (e) {
      console.error('Filter fetch error:', e);
      setError('No se pudieron aplicar los filtros.');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setFilters({ minRate: '', maxMonths: '' });
    navigate('/oportunidades', { replace: true });
    setLoading(true);
    const { data } = await supabase
      .from('oportunidades')
      .select('id, monto, plazo_meses, perfil_riesgo, tasa_rendimiento_inversionista, comision_servicio_inversionista_porcentaje')
      .eq('estado', 'disponible')
      .order('tasa_rendimiento_inversionista', { ascending: false });
    setOpportunities(data || []);
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
      <h2>Oportunidades de InversiÃƒÆ’Ã‚Â³n</h2>
      <div className="filters-bar">
        <button className="btn btn--secondary" onClick={() => setShowFilters(v => !v)}>
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
        {showFilters && (
          <div className="filters-group">
            <span className="filters-label">Rendimiento mÃƒÆ’Ã‚Â­nimo:</span>
            <div className="segmented" role="tablist" aria-label="Rendimiento mÃƒÆ’Ã‚Â­nimo">
              {[10,12,15].map((r) => {
                const active = String(filters.minRate)===String(r);
                return (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    aria-pressed={active}
                    className={['segmented__item', active ? 'is-active' : ''].filter(Boolean).join(' ')}
                    onClick={() => { setFilters(f => ({ ...f, minRate: String(r) })); applyFilters(); }}
                  >{r}%</button>
                );
              })}
            </div>
            <span className="filters-label" style={{ marginLeft: '0.75rem' }}>Plazo mÃƒÆ’Ã‚¡ximo:</span>
            <div className="segmented" role="tablist" aria-label="Plazo mÃƒÆ’Ã‚¡ximo">
              {[12,18,24].map((m) => {
                const active = String(filters.maxMonths)===String(m);
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-pressed={active}
                    className={['segmented__item', active ? 'is-active' : ''].filter(Boolean).join(' ')}
                    onClick={() => { setFilters(f => ({ ...f, maxMonths: String(m) })); applyFilters(); }}
                  >{m}m</button>
                );
              })}
            </div>
            <button className="btn" onClick={resetFilters}>Limpiar</button>
          </div>
        )}
      </div>
      {showFilters && (
        <>
          <p style={{ fontSize: '0.95rem', color: '#444', margin: '0 0 0.5rem 0' }}>
            CÃƒÆ’Ã‚Â³mo elegir: Conservador ~10%, Balanceado ~12%, DinÃƒÆ’Ã‚¡mico ~15% anual.
          </p>
          {filters.minRate && (
            <p style={{ fontSize: '0.9rem', color: '#555', marginTop: 0 }}>
              SelecciÃƒÆ’Ã‚Â³n actual: {filters.minRate === '10' ? 'Conservador (~10%)' : filters.minRate === '12' ? 'Balanceado (~12%)' : filters.minRate === '15' ? 'DinÃƒÆ’Ã‚¡mico (~15%)' : `${filters.minRate}%`}.
            </p>
          )}
        </>
      )}
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

