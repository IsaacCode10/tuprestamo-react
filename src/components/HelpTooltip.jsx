import React, { useState } from 'react';
import './HelpTooltip.css';

const HelpTooltip = ({ definition }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div 
      className="tooltip-container"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="tooltip-icon">❔</span>
      {visible && (
        <div className="tooltip-box">
          {definition}
        </div>
      )}
    </div>
  );
};

export default HelpTooltip;
