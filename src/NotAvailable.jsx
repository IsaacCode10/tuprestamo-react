import React from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100vh - 200px)', // Altura de la pantalla menos header/footer
    textAlign: 'center',
    padding: '20px',
    fontFamily: 'var(--font-family)',
    color: 'var(--primary-color)'
  },
  title: {
    fontFamily: 'var(--font-head)',
    fontSize: '2.5rem',
    color: 'var(--primary-color)',
    marginBottom: '1rem'
  },
  message: {
    fontSize: '1.2rem',
    maxWidth: '600px',
    lineHeight: '1.6'
  },
  logo: {
    width: '150px',
    marginBottom: '2rem'
  }
};

const NotAvailable = () => {
  return (
    <div style={styles.container}>
      <img src="/Logo-Tu-Prestamo.png" alt="Tu Préstamo Logo" style={styles.logo} />
      <h1 style={styles.title}>Servicio No Disponible</h1>
      <p style={styles.message}>
        Lo sentimos, Tu Préstamo es una plataforma diseñada exclusivamente para el mercado de Bolivia.
        Actualmente no ofrecemos nuestros servicios en tu país.
      </p>
    </div>
  );
};

export default NotAvailable;
