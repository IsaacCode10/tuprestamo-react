import React from 'react';

const Footer = () => {
  return (
    <footer className="footer footer--custom">
      <div className="container footer__inner">
        {/* Bloque superior: redes sociales + mensaje breve */}
        <div className="footer__top footer__top--custom">
          <div className="footer__socials">
            {/* Facebook SVG */}
            <a href="https://facebook.com/tuempresa" target="_blank" aria-label="Facebook">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.675 0H1.325C0.593 0 0 0.593 0 1.325V22.675C0 23.407 0.593 24 1.325 24H12.82V14.708H9.692V11.078H12.82V8.412C12.82 5.304 14.82 3.62 17.53 3.62C18.834 3.62 20.012 3.718 20.341 3.754V6.97H18.26C16.746 6.97 16.422 7.785 16.422 8.945V11.078H20.207L19.68 14.708H16.422V24H22.675C23.407 24 24 23.407 24 22.675V1.325C24 0.593 23.407 0 22.675 0Z"/>
              </svg>
            </a>

            {/* Instagram SVG */}
            <a href="https://instagram.com/tuempresa" target="_blank" aria-label="Instagram">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163C8.741 2.163 8.332 2.175 7.052 2.234C5.771 2.293 4.59 2.605 3.62 3.576C2.648 4.548 2.336 5.729 2.278 7.01C2.219 8.29 2.207 8.699 2.207 12C2.207 15.301 2.219 15.71 2.278 16.99C2.336 18.271 2.648 19.452 3.62 20.424C4.59 21.395 5.771 21.707 7.052 21.766C8.332 21.825 8.741 21.837 12 21.837C15.259 21.837 15.668 21.825 16.948 21.766C18.229 21.707 19.41 21.395 20.38 20.424C21.352 19.452 21.664 18.271 21.722 16.99C21.781 15.71 21.793 15.301 21.793 12C21.793 8.699 21.781 8.29 21.722 7.01C21.664 5.729 21.352 4.548 20.38 3.576C19.41 2.605 18.229 2.293 16.948 2.234C15.668 2.175 15.259 2.163 12 2.163ZM12 0C15.309 0 15.719 0.013 17 0.072C18.281 0.131 19.462 0.443 20.434 1.414C21.406 2.386 21.718 3.567 21.777 4.848C21.836 6.128 21.848 6.537 21.848 12C21.848 17.463 21.836 17.872 21.777 19.152C21.718 20.433 21.406 21.614 20.434 22.586C19.462 23.558 18.281 23.87 17 23.929C15.719 23.988 15.309 24 12 24C8.691 24 8.281 23.988 7 23.929C5.719 23.87 4.538 23.558 3.566 22.586C2.594 21.614 2.282 20.433 2.223 19.152C2.164 17.872 2.152 17.463 2.152 12C2.152 6.537 2.164 6.128 2.223 4.848C2.282 3.567 2.594 2.386 3.566 1.414C4.538 0.443 5.719 0.131 7 0.072C8.281 0.013 8.691 0 12 0Z"/>
                <path d="M12 5.838A6.162 6.162 0 0 0 5.838 12 6.162 6.162 0 0 0 12 18.162 6.162 6.162 0 0 0 18.162 12 6.162 6.162 0 0 0 12 5.838ZM12 15.587A4 4 0 1 1 16 11.587A4 4 0 0 1 12 15.587Z"/>
                <circle cx="18.406" cy="5.594" r="1.44"/>
              </svg>
            </a>

            {/* LinkedIn SVG */}
            <a href="https://linkedin.com/company/tuempresa" target="_blank" aria-label="LinkedIn">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.98 3.5C4.98 4.88071 3.88071 6 2.5 6C1.11929 6 0 4.88071 0 3.5C0 2.11929 1.11929 1 2.5 1C3.88071 1 4.98 2.11929 4.98 3.5ZM0.36 8H4.64V24H0.36V8ZM8.98 8H13.14V10.024H13.18C13.742 9.028 15.138 8 17.034 8C21.218 8 22 10.666 22 14.798V24H17.72V15.542C17.72 13.658 17.68 11.342 15.26 11.342C12.8 11.342 12.44 13.23 12.44 15.386V24H8.16V8H8.98Z"/>
              </svg>
            </a>
          </div>
          <p className="footer__slogan">
            Refinancia con tasas justas y vive sin deudas tóxicas.
          </p>
        </div>

        {/* Bloque medio: enlaces rápidos */}
        <div className="footer__links">
          <a href="#faq" className="footer__link">FAQ</a>
        </div>

        {/* Bloque inferior: derechos reservados */}
        <div className="footer__bottom footer__bottom--custom">
          <p className="footer__text">&copy; 2025 Tu Préstamo. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
