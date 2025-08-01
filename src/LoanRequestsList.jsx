import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './LoanRequestsList.css';

const LoanRequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('loan_requests')
          .select('id, amount, purpose, created_at, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching loan requests:', error);
        } else {
          setRequests(data);
        }
      }
      setLoading(false);
    };

    fetchRequests();
  }, []);

  if (loading) {
    return <p>Cargando solicitudes...</p>;
  }

  return (
    <div className="loan-requests-list">
      <h2>Mis Solicitudes de Préstamo</h2>
      {requests.length === 0 ? (
        <p>No has realizado ninguna solicitud todavía.</p>
      ) : (
        <ul>
          {requests.map((request) => (
            <li key={request.id}>
              <p><strong>Monto:</strong> ${request.amount}</p>
              <p><strong>Propósito:</strong> {request.purpose}</p>
              <p><strong>Fecha:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
              <p><strong>Estado:</strong> <span className={`status status-${request.status}`}>{request.status}</span></p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LoanRequestsList;
