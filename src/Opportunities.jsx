import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import useAnalytics from '@/hooks/useAnalytics'; // Importamos el hook de analítica
import './Opportunities.css';

// --- Componente de Tarjeta de Oportunidad Individual ---
const OpportunityCard = ({ opp }) => {
  const rendimientoBruto = opp.tasa_rendimiento_inversionista;
  const comisionServicio = opp.comision_servicio_inversionista_porcentaje;
  const navigate = useNavigate(); // ADDED THIS LINE
  // NEW v3.0 CALCULATION: Net Rate ≈ (Gross Rate * 0.99) - 1%
  const rendimientoNeto = (rendimientoBruto * (1 - (comisionServicio / 100))) - comisionServicio;

  const handleViewDetails = () => { // ADDED THIS FUNCTION
    navigate(`/oportunidades/${opp.id}`); // Navigate to a detail page
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
          <span>Comisión de servicio: {comisionServicio}%</span>
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

// --- Componente Principal de la Página de Oportunidades ---
const Opportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const analytics = useAnalytics(); // Inicializamos el hook

  useEffect(() => {
    analytics.capture('viewed_marketplace'); // Capturamos el evento

    const fetchOpportunities = async () => {
      setLoading(true);
      setError(null);
      // Seleccionamos todos los campos que necesitamos del nuevo modelo de negocio
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
        setError('Error al cargar las oportunidades de inversión.');
      } else {
        setOpportunities(data);
      }
      setLoading(false);
    };

    fetchOpportunities();
  }, [analytics]);

  if (loading) {
    return <p>Cargando oportunidades...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div className="opportunities-container">
      <h2>Oportunidades de Inversión</h2>
      {opportunities.length === 0 ? (
        <p>No hay oportunidades de inversión disponibles en este momento. ¡Vuelve pronto!</p>
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