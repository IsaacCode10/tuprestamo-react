import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import useAnalytics from '@/hooks/useAnalytics'; // Importamos el hook de analítica
// import './OpportunityDetail.css'; // We can create this later if needed

const OpportunityDetail = () => {
  const { id } = useParams(); // Get the ID from the URL
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const analytics = useAnalytics(); // Inicializamos el hook

  // New state for the investment form
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  // --- Evento de Analítica: Viewed Loan Details ---
  useEffect(() => {
    if (opportunity && opportunity.id) {
      analytics.capture('viewed_loan_details', {
        loan_id: opportunity.id,
        loan_amount: opportunity.monto,
      });
    }
  }, [opportunity, analytics]);

  const fetchOpportunity = async () => {
    setLoading(true);
    setError(null);

    // Call the RPC function instead of a direct select
    const { data, error: rpcError } = await supabase
      .rpc('get_opportunity_details_with_funding', {
        p_opportunity_id: id
      })
      .single(); // The RPC returns a single record

    if (rpcError) {
      console.error('Error fetching opportunity details with funding:', rpcError);
      setError('Error al cargar los detalles de la oportunidad.');
      setOpportunity(null);
    } else if (!data) {
      setError('Oportunidad no encontrada.');
      setOpportunity(null);
    } else {
      setOpportunity(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      fetchOpportunity();
    }
  }, [id]);

  const handleInvestment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormMessage({ type: '', text: '' });

    const amount = parseFloat(investmentAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormMessage({ type: 'error', text: 'Por favor, ingresa un monto válido.' });
      setIsSubmitting(false);
      return;
    }

    if (amount < 700) {
      setFormMessage({ type: 'error', text: 'La inversión mínima es de 700 Bs.' });
      setIsSubmitting(false);
      return;
    }

    // Optional: Check if investment exceeds opportunity amount
    if (amount > (opportunity.monto - opportunity.total_funded)) {
        setFormMessage({ type: 'error', text: `El monto no puede exceder el saldo por invertir (Bs. ${(opportunity.monto - opportunity.total_funded).toLocaleString('es-BO')}).` });
        setIsSubmitting(false);
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        setFormMessage({ type: 'error', text: 'Debes iniciar sesión para invertir.' });
        setIsSubmitting(false);
        return;
    }

    try {
      const { error: insertError } = await supabase
        .from('inversiones')
        .insert({
          opportunity_id: id,
          investor_id: user.id,
          amount: amount,
        });

      if (insertError) {
        throw insertError;
      }

      // --- Evento de Analítica: Inversión completada ---
      analytics.capture('completed_investment', {
        investment_amount: amount,
        loan_id: id,
      });
      
      setFormMessage({ type: 'success', text: '¡Tu intención de inversión ha sido registrada con éxito! Actualizando...' });
      setInvestmentAmount('');
      // Refresh data after successful investment to update progress bar
      setTimeout(() => {
        fetchOpportunity();
        setFormMessage({ type: '', text: '' }); // Clear message after refresh
      }, 2000); // Wait 2 seconds to let user read the message

    } catch (error) {
      console.error('Error creating investment:', error);
      setFormMessage({ type: 'error', text: 'Hubo un error al registrar tu inversión. Por favor, intenta de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (loading) {
    return <p>Cargando detalles de la oportunidad...</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate('/investor-dashboard')}>Volver a Oportunidades</button>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div>
        <p>No se pudo cargar la oportunidad.</p>
        <button onClick={() => navigate('/investor-dashboard')}>Volver a Oportunidades</button>
      </div>
    );
  }

  const rendimientoBruto = opportunity.tasa_rendimiento_inversionista;
  const comisionServicio = opportunity.comision_servicio_inversionista_porcentaje;
  // NEW v3.0 CALCULATION: Net Rate ≈ (Gross Rate * 0.99) - 1%
  const rendimientoNeto = (rendimientoBruto * (1 - (comisionServicio / 100))) - comisionServicio;

  // Calculations for the progress bar
  const totalFunded = opportunity.total_funded || 0;
  const totalGoal = opportunity.monto;
  const fundedPercentage = totalGoal > 0 ? (totalFunded / totalGoal) * 100 : 0;
  const remainingAmount = totalGoal - totalFunded;

  return (
    <div className="opportunity-detail-container" style={{ maxWidth: '600px', margin: 'auto', padding: '20px' }}>
      <h2>Detalles de la Oportunidad ID: {opportunity.id}</h2>

      <div className="funding-progress" style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4>Progreso de Financiamiento</h4>
          <div style={{ backgroundColor: '#e9ecef', borderRadius: '5px', height: '24px', marginBottom: '10px', overflow: 'hidden' }}>
              <div style={{
                  width: `${Math.min(fundedPercentage, 100)}%`,
                  height: '100%',
                  backgroundColor: '#28a745',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  transition: 'width 0.5s ease-in-out'
              }}>
                  {fundedPercentage.toFixed(2)}%
              </div>
          </div>
          <p>
              <strong>Recaudado:</strong> Bs. {totalFunded.toLocaleString('es-BO')} de Bs. {totalGoal.toLocaleString('es-BO')}
          </p>
          {remainingAmount > 0 ? (
             <p><strong>Saldo por invertir:</strong> Bs. {remainingAmount.toLocaleString('es-BO')}</p>
          ) : (
             <p><strong>¡Esta oportunidad ha sido completamente financiada!</strong></p>
          )}
      </div>

      <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <p><strong>Monto Total de la Oportunidad:</strong> Bs. {opportunity.monto.toLocaleString('es-BO')}</p>
        <p><strong>Perfil de Riesgo:</strong> {opportunity.perfil_riesgo}</p>
        <p><strong>Rendimiento Anual Bruto:</strong> {rendimientoBruto.toFixed(2)}%</p>
        <p><strong>Plazo:</strong> {opportunity.plazo_meses} meses</p>
        <p><strong>Comisión de Servicio:</strong> {comisionServicio}%</p>
        <p><strong>Rendimiento Neto Estimado:</strong> {rendimientoNeto.toFixed(2)}%</p>
      </div>

      {remainingAmount > 0 ? (
        <div className="investment-form" style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3>Invertir en esta Oportunidad</h3>
          <form onSubmit={handleInvestment}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="investmentAmount">Monto a Invertir (Bs.):</label>
              <input
                type="number"
                id="investmentAmount"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                placeholder="Ej: 1000"
                required
                style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              />
            </div>
            <button type="submit" disabled={isSubmitting} style={{ padding: '10px 20px', cursor: 'pointer' }}>
              {isSubmitting ? 'Registrando...' : 'Quiero Invertir'}
            </button>
          </form>
          {formMessage.text && (
            <p style={{ color: formMessage.type === 'error' ? 'red' : 'green', marginTop: '15px' }}>
              {formMessage.text}
            </p>
          )}
        </div>
      ) : null}

      <button onClick={() => navigate('/investor-dashboard')} style={{ marginTop: '20px' }}>
        Volver a Oportunidades
      </button>
    </div>
  );
};

export default OpportunityDetail;
