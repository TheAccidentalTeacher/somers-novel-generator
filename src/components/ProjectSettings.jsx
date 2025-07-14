import React, { useState } from 'react';

const ProjectSettings = ({ apiConfig, onConfigChange, onTestConnection, onNotification }) => {
  const [localConfig, setLocalConfig] = useState({
    ...apiConfig,
    openaiKey: localStorage.getItem('openai_api_key') || ''
  });
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const handleConfigChange = (field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveConfig = () => {
    // Save to localStorage
    if (localConfig.openaiKey) {
      localStorage.setItem('openai_api_key', localConfig.openaiKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }
    
    localStorage.setItem('api_base_url', localConfig.baseUrl);
    localStorage.setItem('api_timeout', localConfig.timeout.toString());

    // Update parent component
    onConfigChange(localConfig);
    onNotification('Settings saved successfully', 'success');
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      // Test backend connection
      const response = await fetch(`${localConfig.baseUrl.replace('/api', '')}/health`, {
        method: 'GET',
        timeout: localConfig.timeout
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus({
          backend: 'success',
          backendMessage: data.message || 'Backend connected successfully',
          openai: data.openai === 'configured' ? 'success' : 'warning',
          openaiMessage: data.openai === 'configured' 
            ? 'OpenAI API configured' 
            : 'OpenAI API key not configured'
        });
        onNotification('Connection test completed', 'success');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      setConnectionStatus({
        backend: 'error',
        backendMessage: `Connection failed: ${error.message}`,
        openai: 'unknown',
        openaiMessage: 'Could not verify OpenAI configuration'
      });
      onNotification(`Connection test failed: ${error.message}`, 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const resetToDefaults = () => {
    const defaultConfig = {
      baseUrl: 'http://localhost:3000/api',
      timeout: 30000,
      openaiKey: ''
    };
    
    setLocalConfig(defaultConfig);
    localStorage.removeItem('openai_api_key');
    localStorage.removeItem('api_base_url');
    localStorage.removeItem('api_timeout');
    
    onNotification('Settings reset to defaults', 'info');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="project-settings">
      <div className="settings-header">
        <h2>⚙️ Project Settings</h2>
        <p>Configure API connections and application preferences</p>
      </div>

      <div className="settings-section">
        <h3>🌐 API Configuration</h3>
        
        <div className="form-group">
          <label className="form-label">Backend API URL</label>
          <input
            type="url"
            className="form-input"
            value={localConfig.baseUrl}
            onChange={(e) => handleConfigChange('baseUrl', e.target.value)}
            placeholder="http://localhost:3000/api"
          />
          <div className="form-help">
            Base URL for the Somers Novel Generator backend API
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Request Timeout (milliseconds)</label>
          <input
            type="number"
            className="form-input"
            value={localConfig.timeout}
            onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 30000)}
            min="5000"
            max="300000"
            step="1000"
          />
          <div className="form-help">
            How long to wait for API responses (5 seconds to 5 minutes)
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">OpenAI API Key (Optional)</label>
          <input
            type="password"
            className="form-input"
            value={localConfig.openaiKey}
            onChange={(e) => handleConfigChange('openaiKey', e.target.value)}
            placeholder="sk-..."
          />
          <div className="form-help">
            If provided, this will be sent to the backend for OpenAI API calls. 
            Leave empty to use the backend's configured key.
          </div>
        </div>

        <div className="settings-actions">
          <button 
            className="btn btn-primary"
            onClick={saveConfig}
          >
            💾 Save Settings
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={resetToDefaults}
          >
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h3>🔍 Connection Test</h3>
        
        <div className="test-section">
          <button 
            className="btn btn-secondary"
            onClick={testConnection}
            disabled={isTestingConnection}
          >
            {isTestingConnection ? '🔄 Testing...' : '🧪 Test Connection'}
          </button>
          
          {connectionStatus && (
            <div className="connection-results">
              <div className={`test-result ${connectionStatus.backend}`}>
                <span className="result-icon">
                  {getStatusIcon(connectionStatus.backend)}
                </span>
                <div className="result-content">
                  <strong>Backend API:</strong>
                  <span>{connectionStatus.backendMessage}</span>
                </div>
              </div>
              
              <div className={`test-result ${connectionStatus.openai}`}>
                <span className="result-icon">
                  {getStatusIcon(connectionStatus.openai)}
                </span>
                <div className="result-content">
                  <strong>OpenAI API:</strong>
                  <span>{connectionStatus.openaiMessage}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h3>📊 Application Info</h3>
        
        <div className="app-info">
          <div className="info-grid">
            <div className="info-item">
              <strong>Application:</strong>
              <span>Somers Novel Generator</span>
            </div>
            <div className="info-item">
              <strong>Version:</strong>
              <span>1.0.0</span>
            </div>
            <div className="info-item">
              <strong>Frontend:</strong>
              <span>React 19.1.0 + Vite</span>
            </div>
            <div className="info-item">
              <strong>Backend:</strong>
              <span>Express.js + OpenAI API</span>
            </div>
            <div className="info-item">
              <strong>Current URL:</strong>
              <span>{window.location.origin}</span>
            </div>
            <div className="info-item">
              <strong>Configured Backend:</strong>
              <span>{localConfig.baseUrl}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>🛠️ Development Settings</h3>
        
        <div className="dev-settings">
          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={localStorage.getItem('debug_mode') === 'true'}
                onChange={(e) => {
                  localStorage.setItem('debug_mode', e.target.checked.toString());
                  onNotification(`Debug mode ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                }}
              />
              Enable debug mode (detailed console logging)
            </label>
          </div>

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={localStorage.getItem('persist_data') === 'true'}
                onChange={(e) => {
                  localStorage.setItem('persist_data', e.target.checked.toString());
                  onNotification(`Data persistence ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
                }}
              />
              Persist conflict data in browser storage
            </label>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>🗑️ Data Management</h3>
        
        <div className="data-actions">
          <button 
            className="btn btn-warning"
            onClick={() => {
              localStorage.clear();
              onNotification('All local data cleared', 'warning');
            }}
          >
            🗑️ Clear All Local Data
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={() => {
              const data = {
                timestamp: new Date().toISOString(),
                config: localConfig,
                debugMode: localStorage.getItem('debug_mode'),
                persistData: localStorage.getItem('persist_data')
              };
              
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'somers_novel_generator_settings.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              onNotification('Settings exported', 'success');
            }}
          >
            📤 Export Settings
          </button>
        </div>
      </div>

      <div className="settings-footer">
        <p>
          <strong>Need Help?</strong> Check the README.md file for setup instructions and troubleshooting.
        </p>
        <p>
          For Railway deployment, make sure your backend URL uses your Railway app domain.
        </p>
      </div>
    </div>
  );
};

export default ProjectSettings;
