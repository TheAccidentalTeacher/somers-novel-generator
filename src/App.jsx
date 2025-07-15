import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ConflictDesigner from './components/ConflictDesigner';
import QuickGenerate from './components/QuickGenerate';
import AutoGenerate from './components/AutoGenerate';
import ProjectSettings from './components/ProjectSettings';
import ErrorFallback from './components/ErrorFallback';
import LoadingSpinner from './components/LoadingSpinner';
import NotificationSystem from './components/NotificationSystem';
import apiService from './services/apiService.js';
import './App.css';

const TABS = {
  CONFLICT: 'conflict',
  QUICK: 'quick',
  AUTO: 'auto',
  SETTINGS: 'settings'
};

function App() {
  const [activeTab, setActiveTab] = useState(TABS.AUTO);
  const [conflictData, setConflictData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [apiConfig, setApiConfig] = useState(() => {
    // Initialize API config from localStorage or defaults
    const savedBaseUrl = localStorage.getItem('api_base_url');
    const savedTimeout = localStorage.getItem('api_timeout');
    
    const config = {
      baseUrl: savedBaseUrl || apiService.getConfig().baseUrl,
      timeout: savedTimeout ? parseInt(savedTimeout) : apiService.getConfig().timeout
    };
    
    // Update API service with saved config
    apiService.updateConfig(config);
    
    return config;
  });

  // Backend health check function using the new API service
  const checkBackendHealth = async () => {
    try {
      await apiService.checkHealth();
      return true;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  };

  useEffect(() => {
    // App initialized - perform any startup checks
    checkBackendHealth().then(isHealthy => {
      if (!isHealthy) {
        addNotification('Backend connection check failed. Please verify your API settings.', 'warning');
      }
    });
  }, []);

  // Handle API configuration changes
  const handleConfigChange = (newConfig) => {
    // Update local state
    setApiConfig(newConfig);
    
    // Update API service
    apiService.updateConfig(newConfig);
    
    // Save to localStorage (already done in ProjectSettings, but good to be explicit)
    localStorage.setItem('api_base_url', newConfig.baseUrl);
    localStorage.setItem('api_timeout', newConfig.timeout.toString());
  };

  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleConflictComplete = (data) => {
    setConflictData(data);
    addNotification('Conflict structure created successfully!', 'success');
    // Don't auto-switch tabs - let user choose
  };

  const handleGenerationSuccess = (result) => {
    addNotification(`Novel generated successfully! ${result.chapters?.length || 'Multiple'} chapters created.`, 'success');
  };

  const handleGenerationError = (error) => {
    console.error('Generation error:', error);
    addNotification(`Generation failed: ${error.message}`, 'error', 10000);
  };

  const tabConfig = [
    {
      id: TABS.AUTO,
      label: 'Auto Generate',
      icon: '🤖',
      description: 'Complete automated novel generation with built-in story design and optional live streaming'
    },
    {
      id: TABS.QUICK,
      label: 'Quick Generate',
      icon: '⚡',
      description: 'Generate a complete novel structure quickly'
    },
    {
      id: TABS.CONFLICT,
      label: 'Story Bible Builder',
      icon: '📖',
      description: 'Optional advanced conflict and character design tool'
    },
    {
      id: TABS.SETTINGS,
      label: 'Settings',
      icon: '⚙️',
      description: 'Configure API and generation settings'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case TABS.CONFLICT:
        return (
          <ConflictDesigner
            onComplete={handleConflictComplete}
            onError={handleGenerationError}
            existingData={conflictData}
          />
        );
      
      case TABS.QUICK:
        return (
          <QuickGenerate
            conflictData={conflictData}
            apiConfig={apiConfig}
            onSuccess={handleGenerationSuccess}
            onError={handleGenerationError}
            onNotification={addNotification}
          />
        );
      
      case TABS.AUTO:
        return (
          <AutoGenerate
            conflictData={conflictData}
            apiConfig={apiConfig}
            onSuccess={handleGenerationSuccess}
            onError={handleGenerationError}
            onNotification={addNotification}
          />
        );
      
      case TABS.SETTINGS:
        return (
          <ProjectSettings
            apiConfig={apiConfig}
            onConfigChange={handleConfigChange}
            onTestConnection={checkBackendHealth}
            onNotification={addNotification}
          />
        );
      
      default:
        return <div className="error">Unknown tab: {activeTab}</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <LoadingSpinner message="Connecting to backend..." />
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleGenerationError}>
      <div className="app">
        <NotificationSystem
          notifications={notifications}
          onRemove={removeNotification}
        />
        
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title">
              <span className="title-icon">📚</span>
              Somers Novel Generator
            </h1>
            <p className="app-subtitle">
              AI-Powered Christian Fiction Novel Generator
            </p>
          </div>
        </header>

        <nav className="tab-navigation">
          <div className="nav-container">
            {tabConfig.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={tab.description}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <main className="app-main">
          <div className="tab-content">
            {renderTabContent()}
          </div>
        </main>

        <footer className="app-footer">
          <div className="footer-content">
            <p>&copy; 2024 Somers Novel Generator. Built with ❤️ for Christian fiction writers.</p>
            <div className="status-indicators">
              <span className={`status-indicator ${conflictData ? 'ready' : 'optional'}`}>
                {conflictData ? '✅ Story Bible Active' : '📖 Story Bible Available'}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
