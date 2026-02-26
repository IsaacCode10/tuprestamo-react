import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { trackEvent } from '@/analytics.js';
import './Opportunities.css';
import InvestorBreadcrumbs from '@/components/InvestorBreadcrumbs.jsx';

const OpportunityCard = ({ opp, verificationStatus = 'no_iniciado' }) => {
  const rendimientoBruto = opp.tasa_rendimiento_inversionista;
  const comisionServicio = opp.comision_servicio_inversionista_porcentaje;
  const navigate = useNavigate();
  const rendimientoNeto = (rendimientoBruto * (1 - (comisionServicio / 100)));
  const formatMoney = (v) => `Bs ${Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalFunded = Number(opp.total_funded || 0);
  const totalGoal = Number(opp.monto || 0);
  const fundedPct = totalGoal > 0 ? Math.min(100, (totalFunded / totalGoal) * 100) : 0;
  const remainingAmount = opp.saldo_pendiente != null ? Number(opp.saldo_pendiente) : Math.max(totalGoal - totalFunded, 0);
  const remainingPct = totalGoal > 0 ? Math.max(0, (remainingAmount / totalGoal) * 100) : 0;
  const isFunded = remainingAmount <= 0;

  const riskLabel = ({
    A: 'Conservador (A)',
    B: 'Balanceado (B)',
    C: 'Dinámico (C)'
  }[opp.perfil_riesgo]) || `Riesgo ${opp.perfil_riesgo}`;

  const handleViewDetails = () => {
    if (verificationStatus !== 'verificado') {
      navigate('/verificar-cuenta');
      return;
    }
    navigate(`/oportunidades/${opp.id}`);
  };
  const kycBlocked = verificationStatus !== 'verificado';

  return (
    <div className={`opportunity-card ${isFunded ? 'is-funded' : ''}`}>
      {isFunded && <div className="funded-ribbon">FONDEADA</div>}
      <div className="card-top">
        <div>
          <h3>{formatMoney(opp.monto)}</h3>
          <p className="opportunity-id">ID #{opp.id}</p>
        </div>
        <span className={`risk-badge risk-${opp.perfil_riesgo}`}>{riskLabel}</span>
      </div>
      <div className="card-body">
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">Rend. anual</div>
            <div className="metric-value">{rendimientoBruto.toFixed(2)}%</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Plazo</div>
            <div className="metric-value">{opp.plazo_meses} meses</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Rend. neto est.</div>
            <div className="metric-value">{rendimientoNeto.toFixed(2)}%</div>
          </div>
        </div>
      </div>
      <div className="funding-bar">
        <div className="funding-track">
          <div className="funding-fill" style={{ width: `${fundedPct.toFixed(2)}%` }} />
        </div>
        <div className="funding-meta">
          <span>Recaudado: {formatMoney(totalFunded)} / {formatMoney(totalGoal)}</span>
          <span>{fundedPct.toFixed(1)}%</span>
        </div>
        {remainingAmount > 0 ? (
          <div className="urgency-line">Faltan {formatMoney(remainingAmount)} ({remainingPct.toFixed(1)}%)</div>
        ) : (
          <div className="urgency-line funded-pill">100% fondeada</div>
        )}
      </div>
      <div className="card-footer">
        <div className="cta-copy">
          <div className="label">Estado</div>
          <div className="value">{isFunded ? 'Fondeada' : 'Publicada'}</div>
        </div>
        {isFunded ? (
          <div className="pill-disabled">No disponible (100% fondeada)</div>
        ) : (
          <button className="invest-button" onClick={handleViewDetails}>
            {kycBlocked ? 'Completa verificación' : 'Invertir ahora'}
          </button>
        )}
      </div>
    </div>
  );
};

const Opportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [allOpportunities, setAllOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ minRate: '', maxMonths: '' });
  const [page, setPage] = useState(1);
  const [verificationStatus, setVerificationStatus] = useState('no_iniciado');
  const PAGE_SIZE = 9; // 3x3 en desktop
  const formatMoney = (v) => `Bs ${Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    trackEvent('Viewed Marketplace');

    const fetchOpportunities = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc('get_opportunities_publicadas');

      if (error) {
        console.error('Error fetching opportunities:', error);
        setError('Error al cargar las oportunidades de inversión.');
      } else {
        const list = (data || []).map(o => ({
          ...o,
          total_funded: Number(o?.total_funded || 0),
          saldo_pendiente: o?.saldo_pendiente != null ? Number(o.saldo_pendiente) : null,
          created_at: o?.created_at ? new Date(o.created_at) : null,
        }));
        setAllOpportunities(list);
        setOpportunities(list);
        setPage(1);
      }
      setLoading(false);
    };

    fetchOpportunities();
  }, []);

  useEffect(() => {
    const loadVerificationStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;
        const { data, error } = await supabase
          .from('profiles')
          .select('estado_verificacion')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && data?.estado_verificacion) {
          setVerificationStatus(data.estado_verificacion);
        }
      } catch (_) {}
    };
    loadVerificationStatus();
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);
    if (qs.get('filters') === '1') {
      setShowFilters(true);
    }
  }, [location.search]);

  // Reaplicar filtros en memoria cuando cambian filtros o base de datos
  useEffect(() => {
    let list = [...allOpportunities];
    if (filters.minRate) list = list.filter(o => Number(o.tasa_rendimiento_inversionista || 0) >= Number(filters.minRate));
    if (filters.maxMonths) list = list.filter(o => Number(o.plazo_meses || 0) <= Number(filters.maxMonths));
    setOpportunities(list);
    setPage(1);
  }, [filters, allOpportunities]);

  const handleFilterChange = (nextFilters) => {
    setFilters(nextFilters);
    trackEvent('Marketplace_Filter_Applied', { min_rate: nextFilters.minRate, max_months: nextFilters.maxMonths });
  };

  const resetFilters = async () => {
    setFilters({ minRate: '', maxMonths: '' });
    setOpportunities(allOpportunities);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil((opportunities || []).length / PAGE_SIZE));
  const paginated = opportunities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const availableCount = opportunities.filter((o) => {
    const goal = Number(o?.monto || 0);
    const funded = Number(o?.total_funded || 0);
    const remaining = o?.saldo_pendiente != null ? Number(o.saldo_pendiente) : Math.max(goal - funded, 0);
    return remaining > 0;
  }).length;

  const lastPublished = (() => {
    const withDate = opportunities.filter(o => o.created_at instanceof Date && !isNaN(o.created_at));
    if (withDate.length === 0) return null;
    const maxDate = new Date(Math.max(...withDate.map(o => o.created_at)));
    return maxDate;
  })();

  const summaryText = `${availableCount} oportunidad${availableCount === 1 ? '' : 'es'} disponible${availableCount === 1 ? '' : 's'}`;
  const totalText = allOpportunities.length > 0 && opportunities.length !== allOpportunities.length
    ? `Mostrando ${opportunities.length} de ${allOpportunities.length}`
    : null;

  if (loading) {
    return <p>Cargando oportunidades...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div className="opportunities-container">
      <div className="opportunities-nav-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <InvestorBreadcrumbs items={[
          { label: 'Inicio', to: '/investor-dashboard' },
          { label: 'Oportunidades' },
        ]} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--primary" onClick={() => navigate('/oportunidades')}>Oportunidades</button>
          <button className="btn" onClick={() => navigate('/mis-inversiones')}>Mis inversiones</button>
        </div>
      </div>
      <h2 className="opp-title">Oportunidades de Inversión</h2>
      {verificationStatus !== 'verificado' && (
        <div style={{ marginBottom: 14, padding: 12, borderRadius: 8, background: '#eef9f8', border: '1px solid #a8ede6', color: '#11696b' }}>
          <strong>Antes de invertir, verifica tu identidad.</strong> Es un paso de seguridad para proteger tu cuenta y habilitar tus inversiones.
          <div style={{ marginTop: 8 }}>
            <button className="btn btn--primary" onClick={() => navigate('/verificar-cuenta')}>Verificar mi identidad</button>
          </div>
        </div>
      )}
      <div className="opp-summary">
        <div className="summary-left">
          <div className="summary-count">{summaryText}</div>
          <div className="summary-sub">
            {lastPublished ? `Última publicada: ${lastPublished.toLocaleDateString('es-BO')}` : 'Publicaciones recientes disponibles'}
          </div>
        </div>
        {totalText && (
          <div className="summary-count" style={{ color: '#55747b', fontWeight: 600 }}>
            {totalText}
          </div>
        )}
      </div>
      <div className="filters-bar">
        <button className="btn btn--secondary" onClick={() => setShowFilters(v => !v)}>
          {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
        {showFilters && (
          <div className="filters-group">
            <span className="filters-label">Rendimiento mínimo:</span>
            <div className="segmented" role="tablist" aria-label="Rendimiento mínimo">
              {[10,12,15].map((r) => {
                const active = String(filters.minRate)===String(r);
                return (
                  <button
                    key={r}
                    type="button"
                    role="tab"
                    aria-pressed={active}
                    className={['segmented__item', active ? 'is-active' : ''].filter(Boolean).join(' ')}
                    onClick={() => handleFilterChange({ ...filters, minRate: String(r) })}
                  >{r}%</button>
                );
              })}
            </div>
            <span className="filters-label" style={{ marginLeft: '0.75rem' }}>Plazo máximo:</span>
            <div className="segmented" role="tablist" aria-label="Plazo máximo">
              {[12,18,24].map((m) => {
                const active = String(filters.maxMonths)===String(m);
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-pressed={active}
                    className={['segmented__item', active ? 'is-active' : ''].filter(Boolean).join(' ')}
                    onClick={() => handleFilterChange({ ...filters, maxMonths: String(m) })}
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
            Cómo elegir: Conservador ≈10%, Balanceado ≈12%, Dinámico ≈15% anual.
          </p>
          {(filters.minRate || filters.maxMonths) && (
            <p style={{ fontSize: '0.9rem', color: '#555', marginTop: 0 }}>
              Selección actual:
              {filters.minRate && <> {filters.minRate === '10' ? 'Conservador (~10%)' : filters.minRate === '12' ? 'Balanceado (~12%)' : filters.minRate === '15' ? 'Dinámico (~15%)' : `${filters.minRate}%`}</>}
              {filters.maxMonths && <> · Plazo máximo: {filters.maxMonths}m</>}
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
        <div className={['opportunities-grid', paginated.length <= 2 ? 'opportunities-grid--compact' : ''].filter(Boolean).join(' ')}>
          {paginated.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} verificationStatus={verificationStatus} />
          ))}
        </div>
      )}
      {opportunities.length > PAGE_SIZE && (
        <div className="pagination">
          <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
          <span className="page-info">Página {page} de {totalPages}</span>
          <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</button>
        </div>
      )}
    </div>
  );
};

export default Opportunities;
