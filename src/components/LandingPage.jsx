import React, { useState } from 'react';
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

  const handleOpenModal = (role) => {
    setModalRole(role);
  };

  const handleCloseModal = () => {
    setModalRole(null);
  };

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