import React from 'react';
import avatar from '../assets/mi-avatar.jpg';

const Testimonio = () => {
  return (
    <section id="mi-testimonio" className="section section--light-alt section--compact">
      <div className="container">
        <h2 className="section__title">Por qu&eacute; nace Tu Pr&eacute;stamo</h2>

        <div className="testimony-card">
          <div className="testimony-avatar">
            <img
              src={avatar}
              alt="Fundador de Tu Préstamo"
              className="avatar-img"
            />
          </div>

          <div className="testimony-text">
            <p>
              <strong>Tu Pr&eacute;stamo nace de una experiencia real.</strong> En <strong>2014</strong>
              tuve una deuda de <strong>17.000 Bs</strong> en una tarjeta de cr&eacute;dito,
              con una tasa anual de <strong>24%</strong> y un mantenimiento mensual de <strong>120 Bs</strong>.
              Durante a&ntilde;os busqu&eacute; una forma m&aacute;s clara de ordenar esa deuda, pero no
              encontr&eacute; una alternativa real.
            </p>

            <p>
              Esa historia termin&oacute; reci&eacute;n en <strong>abril de 2025</strong>, despu&eacute;s
              de haber pagado m&aacute;s de <strong>4 veces</strong> el monto original. Ah&iacute; entend&iacute;
              algo simple: en Bolivia muchas personas viven atrapadas en una deuda de tarjeta de cr&eacute;dito
              que se vuelve cada vez m&aacute;s pesada, sin una alternativa real para salir de ah&iacute;.
            </p>

            <div className="testimony-highlight">
              <p>
                <strong>Por eso creamos Tu Pr&eacute;stamo:</strong> para ofrecer una alternativa m&aacute;s
                clara y transparente para pagar la deuda de tu tarjeta de cr&eacute;dito en Bolivia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonio;
