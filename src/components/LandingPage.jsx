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

  // Abrir el formulario de interes para inversionistas via query (?open=investor-form)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const open = params.get('open');
    if (open === 'investor-form') {
      setModalRole('inversionista');
    }
  }, [location.search]);

  const siteOrigin = (typeof window !== 'undefined' ? window.location.origin : 'https://tuprestamobo.com');

  return (
    <>
      <Helmet>
        <title>Tu Pr&eacute;stamo Bolivia &mdash; Refinanci&aacute; e Invert&iacute;</title>
        <meta name="description" content="Refinanci&aacute; tus tarjetas con cuota fija y tasa menor al 24%. Invert&iacute; y recib&iacute; pagos mensuales. Comisi&oacute;n de originaci&oacute;n Bs 450 hasta Bs 10.000." />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Tu Pr\u00E9stamo',
            url: siteOrigin,
            logo: `${siteOrigin}/Logo-Tu-Prestamo.png`,
            sameAs: []
          })}
        </script>
        <link rel="canonical" href="https://tuprestamobo.com" />
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
