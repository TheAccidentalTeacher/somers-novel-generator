import React from 'react';

const NotificationSystem = ({ notifications, onRemove }) => {
  if (!notifications || notifications.length === 0) {
    return null;
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info':
      default: return 'ℹ️';
    }
  };

  return (
    <div className="notification-system">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`notification notification-${notification.type}`}
        >
          <span className="notification-icon">
            {getNotificationIcon(notification.type)}
          </span>
          <span className="notification-message">
            {notification.message}
          </span>
          <button 
            className="notification-close"
            onClick={() => onRemove(notification.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
