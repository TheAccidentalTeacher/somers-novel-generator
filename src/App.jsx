import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import SimpleGenerate from './components/SimpleGenerate.jsx';
import ErrorFallback from './components/ErrorFallback.jsx';
import NotificationSystem from './components/NotificationSystem.jsx';
import apiService from './services/apiService.js';
import './App.css';

function App() {
  const [notifications, setNotifications] = useState([]);

  // Initialize API service on app start
  useEffect(() => {
    console.log('🚀 Somers Novel Generator - Simple Edition');
    
    // Test connection to backend
    apiService.testConnection().catch(error => {
      console.warn('Initial connection test failed:', error.message);
    });
  }, []);

  // Notification system
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="App">
        <SimpleGenerate 
          onNotification={addNotification}
          onError={(error) => addNotification(error.message, 'error')}
        />
        
        <NotificationSystem 
          notifications={notifications}
          onRemove={removeNotification}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
