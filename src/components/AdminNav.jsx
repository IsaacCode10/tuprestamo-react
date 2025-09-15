import React from 'react';
import { NavLink } from 'react-router-dom';
import './AdminNav.css';

const AdminNav = () => {
  return (
    <nav className="admin-nav">
      <div className="admin-nav-links">
        <NavLink 
          to="/admin-dashboard"
          className={({ isActive }) => isActive ? "active-link" : ""}
        >
          Centro de Operaciones
        </NavLink>
      </div>
    </nav>
  );
};

export default AdminNav;