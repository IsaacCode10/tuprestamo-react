import React from 'react';
import avatar from '../assets/mi-avatar.jpg';

const Testimonio = () => {
  return (
    <section id="mi-testimonio" className="section section--light-alt section--compact">
      <div className="container">
        <h2 className="section__title">Mi Testimonio</h2>

        <div className="testimony-card">
          {/* Avatar personal */}
          <div className="testimony-avatar">
            <img
              src={avatar}
              alt="Foto de perfil"
              className="avatar-img"
            />
          </div>

          {/* Texto del testimonio */}
          <div className="testimony-text">
            <p>
              Como muchos en Bolivia, he experimentado de primera mano la carga de una tarjeta de crédito. En <strong>2014</strong>, contraje una deuda de <strong>17.000 Bs</strong> con una tasa anual del <strong>24%</strong> y un costo de mantenimiento de <strong>150 Bs</strong> mensuales.
              <br />
              Durante años, busqué sin éxito una opción para refinanciar esta "deuda tóxica", terminando por pagar más de <strong>4 veces</strong> el monto original del crédito. Esta experiencia personal, finalizada recién en <strong>abril de 2025</strong>, me reveló una necesidad urgente en nuestro país.
            </p>

            <p>
              Por eso, nace <strong>Tu Préstamo</strong>: una plataforma creada para ofrecer a los bolivianos una alternativa real y justa para refinanciar sus tarjetas de crédito. Nuestro objetivo es que tú también puedas vivir mejor, especialmente en este contexto económico donde los precios suben y los salarios no siempre alcanzan.
            </p>

            <div className="testimony-highlight">
              <p>
                <strong>Con Tu Préstamo puedes lograr un ahorro de <span className="highlight">hasta la mitad</span> en los intereses que pagas actualmente en tu banco,</strong>
                permitiéndote sobrellevar la situación económica actual sin sacrificar tu calidad de vida.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonio;
