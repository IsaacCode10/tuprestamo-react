import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import AdminNav from './components/AdminNav'; // Importar navegación
import './LoanRequestsList.css'; // Reutilizamos los estilos

const InvestorDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pendiente'); // Filtro inicial

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    
    let query = supabase
      .from('solicitudes')
      .select('*')
      .eq('tipo_solicitud', 'inversionista');

    if (filter !== 'todos') {
      query = query.eq('status', filter);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching investor requests:', error);
      setError('Error al cargar las solicitudes de inversionistas.');
    } else {
      setRequests(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('solicitudes')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar el estado: ' + error.message);
    } else {
      fetchRequests(); 
    }
  };

  const handleInviteInvestor = async (email, solicitudId) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-investor-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` // Usamos la anon key para llamar a la función
          },
          body: JSON.stringify({ email: email, solicitud_id: solicitudId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al invitar al inversionista.');
      }

      alert('Invitación enviada con éxito y estado actualizado.');
      // Actualizar el estado de la solicitud a 'invitado' en el frontend
      handleStatusChange(solicitudId, 'invitado');

    } catch (error) {
      console.error('Error al invitar al inversionista:', error);
      alert('Error al invitar al inversionista: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loan-requests-list admin-dashboard">
      <AdminNav />
      <h2>Panel de Administración de Inversionistas</h2>
      
      <div className="filter-buttons">
        <button onClick={() => setFilter('pendiente')} className={filter === 'pendiente' ? 'active' : ''}>Nuevos</button>
        <button onClick={() => setFilter('invitado')} className={filter === 'invitado' ? 'active' : ''}>Invitados</button>
        <button onClick={() => setFilter('contactado')} className={filter === 'contactado' ? 'active' : ''}>Contactados</button>
        <button onClick={() => setFilter('activo')} className={filter === 'activo' ? 'active' : ''}>Activos</button>
        <button onClick={() => setFilter('descartado')} className={filter === 'descartado' ? 'active' : ''}>Descartados</button>
        <button onClick={() => setFilter('todos')} className={filter === 'todos' ? 'active' : ''}>Todos</button>
      </div>

      {loading && <p>Cargando inversionistas...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!loading && !error && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Monto Interesado (Bs)</th>
              <th>Experiencia</th>
              <th>Estado Actual</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{req.nombre_completo}</td>
                <td>{req.email}</td>
                <td>{req.telefono}</td>
                <td>{req.monto_interes_invertir?.toLocaleString('es-BO') || 'N/A'}</td>
                <td>{req.experiencia_inversion || 'N/A'}</td>
                <td><span className={`status status-${req.status}`}>{req.status}</span></td>
                <td>
                  {req.status === 'pendiente' && (
                    <button onClick={() => handleInviteInvestor(req.email, req.id)} disabled={loading} className="approve-button">Invitar Inversionista</button>
                  )}
                  {req.status !== 'pendiente' && (
                    <>
                      <button onClick={() => handleStatusChange(req.id, 'contactado')} className="action-button">Contactado</button>
                      <button onClick={() => handleStatusChange(req.id, 'activo')} className="approve-button">Activo</button>
                      <button onClick={() => handleStatusChange(req.id, 'descartado')} className="reject-button">Descartar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {requests.length === 0 && !loading && <p>No hay inversionistas que coincidan con el filtro seleccionado.</p>}
    </div>
  );
};

export default InvestorDashboard;