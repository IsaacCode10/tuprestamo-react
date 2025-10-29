import React from 'react';
import { useNavigate } from 'react-router-dom';

const InvestorBackBar = ({ fallbackTo = '/investor-dashboard', label = 'Volver' }) => {
  const navigate = useNavigate();
  const goBack = () => {
    try {
      if (window.history.length > 1) navigate(-1);
      else navigate(fallbackTo);
    } catch {
      navigate(fallbackTo);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 0', marginBottom: 8, borderBottom: '1px solid #eee'
    }}>
      <button onClick={goBack} style={{
        background: 'none', border: 'none', color: '#11696b', cursor: 'pointer',
        fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6
      }}>
        <span style={{ fontSize: 18 }}>←</span> {label}
      </button>
    </div>
  );
};

export default InvestorBackBar;

