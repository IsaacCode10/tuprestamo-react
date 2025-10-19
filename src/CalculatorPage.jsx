import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PublicSavingsCalculator from './components/PublicSavingsCalculator';
import LoanRequestForm from './LoanRequestForm'; // Para el CTA
import './CalculatorPage.css';

const CalculatorPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Calculadora de Ahorro - Tu Préstamo</title>
        <meta name="description" content="Calcula cuánto puedes ahorrar al refinanciar la deuda de tu tarjeta de crédito con Tu Préstamo. Compara tasas y obtén una mejor cuota mensual." />
      </Helmet>
      <div className="calculator-page-container">
        <header className="page-header">
          <h1>Calcula tu Ahorro y Libérate de la Deuda</h1>
          <p className="subtitle">Usa nuestra herramienta para simular tu nuevo crédito y descubre cuánto podrías estar ahorrando cada mes.</p>
        </header>
        
        <div className="calculator-wrapper">
          <PublicSavingsCalculator onApplyClick={handleOpenModal} />
        </div>

        <section className="cta-section">
          <h2>¿Listo para dar el siguiente paso?</h2>
          <p>¿El cálculo te convence? Inicia tu solicitud ahora. Es rápido, seguro y 100% en línea.</p>
          <button onClick={handleOpenModal} className="cta-button">
            Iniciar Solicitud
          </button>
        </section>
      </div>

      {isModalOpen && (
        <LoanRequestForm 
          onClose={handleCloseModal} 
          role="prestatario" 
        />
      )}
    </>
  );
};

export default CalculatorPage;
