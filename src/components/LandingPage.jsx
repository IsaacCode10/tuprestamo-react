import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Hero from './Hero';
import Beneficios from './Beneficios';
import Prestatarios from './Prestatarios';
import Inversionistas from './Inversionistas';
import ComoFunciona from './ComoFunciona';
import Testimonio from './Testimonio';
import FAQ from './FAQ';
import Contacto from './Contacto';
import LoanRequestForm from '../LoanRequestForm';
import InvestorInterestForm from '../InvestorInterestForm';

const LandingPage = () => {
  const [modalRole, setModalRole] = useState(null); // null, 'prestatario', o 'inversionista'
  const location = useLocation();

  const handleOpenModal = (role) => {
    setModalRole(role);
  };

  const handleCloseModal = () => {
    setModalRole(null);
  };

  // Abrir el formulario de interés para inversionistas vía query (?open=investor-form)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const open = params.get('open');
    if (open === 'investor-form') {
      setModalRole('inversionista');
    }
  }, [location.search]);

  return (
    <>
      <Helmet>
        <title>Tu Préstamo – MVP Fintech Bolivia</title>
        <meta name="description" content="Tu Préstamo: refinancia tus tarjetas de crédito o invierte con seguridad en Bolivia." />
      </Helmet>
      <Hero />
      <Beneficios />
      <Prestatarios onSolicitudClick={() => handleOpenModal('prestatario')} />
      <Inversionistas onSolicitudClick={() => handleOpenModal('inversionista')} />
      <ComoFunciona />
      <Testimonio />
      <FAQ />
      <Contacto />

      {modalRole === 'prestatario' && (
        <LoanRequestForm 
          onClose={handleCloseModal} 
          role={modalRole} 
        />
      )}
      {modalRole === 'inversionista' && (
        <InvestorInterestForm 
          onClose={handleCloseModal} 
          role={modalRole} 
        />
      )}
    </>
  );
};

export default LandingPage;
