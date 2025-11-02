import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

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
