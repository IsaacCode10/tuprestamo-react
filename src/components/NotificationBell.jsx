import React, { useState } from 'react';
import './NotificationBell.css';

const NotificationBell = ({ notifications, onOpen, onItemClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-bell">
      <div className="bell-icon-container" onClick={(e) => { e.stopPropagation(); const next = !isOpen; setIsOpen(next); if (next && typeof onOpen === 'function') { try { onOpen(); } catch {} } }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-bell"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </div>

      {isOpen && (
        <div className="notifications-panel">
          <div className="panel-header">
            <h3>Notificaciones</h3>
          </div>
          <div className="notifications-list">
            {notifications.length > 0 ? (
              notifications.map(notification => {
                const clickable = typeof onItemClick === 'function';
                return (
                  <div
                    key={notification.id}
                    className={`notification-item ${notification.read ? 'read' : ''}`}
                    onClick={() => clickable ? onItemClick(notification) : null}
                    style={{ cursor: clickable ? 'pointer' : 'default' }}
                  >
                    <div className="notification-content">
                      <p className="notification-message">{notification.message}</p>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="no-notifications">No tienes notificaciones nuevas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
