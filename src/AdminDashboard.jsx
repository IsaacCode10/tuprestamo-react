import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './LoanRequestsList.css'; // Reutilizamos los estilos

const AdminDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    // Obtenemos las solicitudes y el email del usuario asociado
    const { data, error } = await supabase
      .from('loan_requests')
      .select(`
        id, 
        amount, 
        purpose, 
        created_at, 
        status,
        user_id,
        profiles ( email )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching loan requests:', error);
      alert('Error al cargar las solicitudes.');
    } else {
      // Supabase devuelve el perfil como un objeto, lo aplanamos para un acceso más fácil
      const formattedData = data.map(r => ({...r, email: r.profiles?.email || 'Usuario no encontrado'}));
      setRequests(formattedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateRequest = async (id, newStatus) => {
    const { error } = await supabase
      .from('loan_requests')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar la solicitud: ' + error.message);
    } else {
      // Refrescamos la lista para mostrar el cambio
      fetchRequests();
    }
  };

  if (loading) {
    return <p>Cargando panel de administración...</p>;
  }

  return (
    <div className="loan-requests-list">
      <h2>Panel de Administración de Préstamos</h2>
      {requests.length === 0 ? (
        <p>No hay solicitudes para revisar.</p>
      ) : (
        <ul>
          {requests.map((request) => (
            <li key={request.id}>
              <p><strong>Usuario:</strong> {request.email}</p>
              <p><strong>Monto:</strong> ${request.amount}</p>
              <p><strong>Propósito:</strong> {request.purpose}</p>
              <p><strong>Fecha:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
              <p><strong>Estado:</strong> <span className={`status status-${request.status}`}>{request.status}</span></p>
              <div style={{ marginTop: '10px' }}>
                <button onClick={() => handleUpdateRequest(request.id, 'aprobado')} style={{ marginRight: '10px' }}>Aprobar</button>
                <button onClick={() => handleUpdateRequest(request.id, 'rechazado')}>Rechazar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminDashboard;
