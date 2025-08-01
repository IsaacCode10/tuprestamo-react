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
          <a href="https://wa.me/59178271936?text=Hola%20Tu%20Pr%C3%A9stamo%2C%20tengo%20una%20consulta%20sobre%20refinanciamiento."
             target="_blank"
             rel="noopener noreferrer"
             className="contact-btn whatsapp-btn">
            <span className="icon">📱</span>
            Contáctanos por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};

export default Contacto;
