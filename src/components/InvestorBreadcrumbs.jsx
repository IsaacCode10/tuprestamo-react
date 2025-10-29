import React from 'react';
import { NavLink } from 'react-router-dom';

const InvestorBreadcrumbs = ({ items = [] }) => {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <nav aria-label="breadcrumbs" style={{ fontSize: 12, color: '#60717c', margin: '4px 0 8px 0' }}>
      {items.map((it, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx}>
            {isLast || !it.to ? (
              <span style={{ fontWeight: 600, color: '#2e3b43' }}>{it.label}</span>
            ) : (
              <NavLink to={it.to} style={{ color: '#11696b', textDecoration: 'none' }}>{it.label}</NavLink>
            )}
            {!isLast && <span style={{ margin: '0 6px', opacity: 0.6 }}>&gt;</span>}
          </span>
        );
      })}
    </nav>
  );
};

export default InvestorBreadcrumbs;

