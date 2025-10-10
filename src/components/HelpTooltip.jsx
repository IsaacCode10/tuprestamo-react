import React, { useState, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';
import './HelpTooltip.css';

const TooltipContent = ({ text, style }) => {
  return ReactDOM.createPortal(
    <div className="tooltip-box" style={style}>
      {text}
    </div>,
    document.body
  );
};

const HelpTooltip = ({ text }) => {
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState({});
  const iconRef = useRef(null);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setStyle({
        position: 'fixed',
        top: `${rect.bottom + 5}px`, // 5px de espacio debajo del ícono
        left: `${rect.left + rect.width / 2}px`, // Centrado horizontalmente
        transform: 'translateX(-50%)', // Ajuste final para centrar
      });
    }
    setVisible(true);
  };

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
      ref={iconRef}
    >
      <span className="tooltip-icon">❔</span>
      {visible && <TooltipContent text={text} style={style} />}
    </div>
  );
};

export default HelpTooltip;
