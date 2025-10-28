import React from 'react';

const Contacto = () => {
  return (
    <section id="contacto" className="section section--dark">
      <div className="container">
        <h2 className="section__title section__title--white">¿Tienes Preguntas? Contáctanos</h2>
        <p className="section__text section__text--white">
          Estamos aquí para resolver tus dudas y acompañarte en cada paso. Elige cómo prefieres comunicarte con nosotros:
        </p>

        <div className="contact-options">
          <a href="mailto:contacto@tuprestamobo.com"
             className="contact-btn email-btn">
            <span className="icon">📧</span>
            Escríbenos un Correo
          </a>
        </div>
      </div>
    </section>
  );
};

export default Contacto;
