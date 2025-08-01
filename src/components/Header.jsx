import React from 'react';
import { Link } from 'react-scroll';
import logo from '../assets/Logo-Tu-Prestamo.png';

const Header = () => {
  return (
    <header>
      <div className="container header__inner">
        {/* Logo */}
        <Link to="hero" smooth={true} duration={500} className="logo-link">
          <img src={logo} alt="Logo Tu Préstamo" className="logo" />
        </Link>

        {/* Botón hamburguesa (visible en móvil) */}
        <button className="hamburger" aria-label="Menú" aria-expanded="false">
          <span className="hamburger-box">
            <span className="hamburger-inner"></span>
          </span>
        </button>

        {/* Navegación principal */}
        <nav className="nav">
          <ul className="nav__list">
            <li className="nav__item"><Link to="hero" smooth={true} duration={500} className="nav__link">Inicio</Link></li>
            <li className="nav__item"><Link to="beneficios" smooth={true} duration={500} className="nav__link">Beneficios</Link></li>
            <li className="nav__item"><Link to="prestatarios" smooth={true} duration={500} className="nav__link">Prestatarios</Link></li>
            <li className="nav__item"><Link to="inversionistas" smooth={true} duration={500} className="nav__link">Inversionistas</Link></li>
            <li className="nav__item"><Link to="como-funciona" smooth={true} duration={500} className="nav__link">Cómo Funciona</Link></li>
            <li className="nav__item"><Link to="faq" smooth={true} duration={500} className="nav__link">FAQ</Link></li>
            <li className="nav__item"><Link to="contacto" smooth={true} duration={500} className="nav__link">Contacto</Link></li>
          </ul>
        </nav>

        {/* Menú móvil oculto inicialmente */}
        <nav className="nav--mobile">
          <ul>
            <li><Link to="hero" smooth={true} duration={500} className="nav--mobile__link">Inicio</Link></li>
            <li><Link to="beneficios" smooth={true} duration={500} className="nav--mobile__link">Beneficios</Link></li>
            <li><Link to="prestatarios" smooth={true} duration={500} className="nav--mobile__link">Prestatarios</Link></li>
            <li><Link to="inversionistas" smooth={true} duration={500} className="nav--mobile__link">Inversionistas</Link></li>
            <li><Link to="como-funciona" smooth={true} duration={500} className="nav--mobile__link">Cómo Funciona</Link></li>
            <li><Link to="faq" smooth={true} duration={500} className="nav--mobile__link">FAQ</Link></li>
            <li><Link to="contacto" smooth={true} duration={500} className="nav--mobile__link">Contacto</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
