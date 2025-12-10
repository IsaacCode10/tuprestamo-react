import React from 'react';
import { Outlet } from 'react-router-dom';

// Layout simple para mantener el shell del prestatario y evitar re-montajes completos entre vistas hijas.
const BorrowerLayout = () => {
  return <Outlet />;
};

export default BorrowerLayout;
