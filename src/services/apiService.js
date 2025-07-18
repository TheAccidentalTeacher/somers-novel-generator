// =====================================================================
// BULLETPROOF API SERVICE - v3.4 (Clean Environment Variable Usage)
// =====================================================================
// Completely rewritten from scratch to work perfectly with the new CORS setup

class APIService {
  constructor() {
    this.defaultConfig = {
      baseUrl: this.getDefaultBaseUrl(),
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    this.config = { ...this.defaultConfig };
  }

  getDefaultBaseUrl() {
    // Detect environment and set appropriate base URL
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // Production (Netlify) - use environment variable
      if (hostname.includes('netlify.app')) {
        return import.meta.env.VITE_API_BASE_URL || 'https://somers-novel-generator-production.up.railway.app/api';
      }
      
      // Local development
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      }
    }
    
    // Fallback - use environment variable or Railway URL
    return import.meta.env.VITE_API_BASE_URL || 'https://somers-novel-generator-production.up.railway.app/api';
  }

  updateConfig(newConfig) {
    this.config = {
      ...this.defaultConfig,
      ...newConfig
    };
  }

  async makeRequest(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      timeout = this.config.timeout,
      retryAttempts = this.config.retryAttempts,
      retryDelay = this.config.retryDelay
    } = options;

    // Prepare request configuration
    const requestConfig = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers
      },
      credentials: 'include', // Critical for CORS
      mode: 'cors' // Explicit CORS mode
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      requestConfig.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Build full URL
    const url = `${this.config.baseUrl}${endpoint}`;

    // Retry logic
    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      let timeoutId;
      try {
        console.log(`🚀 API Request [Attempt ${attempt + 1}]: ${method} ${url}`);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), timeout);
        
        requestConfig.signal = controller.signal;

        const response = await fetch(url, requestConfig);
        clearTimeout(timeoutId);

        // Log response details
        console.log(`📡 API Response: ${response.status} ${response.statusText}`);

        // Handle response
        if (!response.ok) {
          throw new APIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            await this.safeResponseText(response)
          );
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`✅ API Success: ${method} ${endpoint}`);
          return data;
        } else {
          const text = await response.text();
          console.log(`✅ API Success (text): ${method} ${endpoint}`);
          return text;
        }

      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        
        // Don't retry on client errors (4xx) or final attempt
        if (attempt === retryAttempts || (error.status && error.status >= 400 && error.status < 500)) {
          console.error(`❌ API Error [Final]: ${method} ${endpoint}`, error);
          throw error;
        }

        // Wait before retry
        console.warn(`⚠️ API Error [Attempt ${attempt + 1}]: ${method} ${endpoint}`, error.message);
        await this.sleep(retryDelay * (attempt + 1)); // Exponential backoff
      }
    }
  }

  async safeResponseText(response) {
    try {
      return await response.text();
    } catch {
      return 'Unable to read response body';
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =====================================================================
  // CONNECTION TEST METHODS
  // =====================================================================

  async testConnection() {
    try {
      // Test connection using the health endpoint
      const response = await this.makeRequest('/health', {
        method: 'GET'
      });

      console.log('🔍 Backend health check result:', response);

      if (response.success) {
        return {
          status: 'connected',
          message: response.message || 'Backend connected successfully',
          timestamp: response.timestamp,
          details: {
            openai: response.openai?.status || 'unknown',
            environment: response.environment || 'unknown',
            version: response.version || 'unknown'
          }
        };
      } else {
        throw new APIError('Health check returned unsuccessful status', 0, response);
      }
    } catch (error) {
      console.error('❌ Backend connection test failed:', error);
      
      // Provide more detailed error information
      if (error.status === 0) {
        throw new APIError('Cannot reach backend server - check if backend is running', 0, 'Connection refused');
      } else if (error.status >= 500) {
        throw new APIError('Backend server error', error.status, error.details);
      } else {
        throw new APIError('Backend connection failed', error.status || 0, error.message);
      }
    }
  }

  // =====================================================================
  // NOVEL GENERATION METHODS
  // =====================================================================

  async createOutline(storyData) {
    return this.makeRequest('/createOutline', {
      method: 'POST',
      body: storyData
    });
  }

  async generateNovel(storyData) {
    return this.makeRequest('/generateNovel', {
      method: 'POST',
      body: storyData,
      timeout: 300000 // 5 minutes for generation
    });
  }

  async autoGenerateNovel(conflictData) {
    return this.makeRequest('/autoGenerateNovel', {
      method: 'POST',
      body: conflictData,
      timeout: 300000 // 5 minutes for generation
    });
  }

  async advancedGeneration(storyData) {
    return this.makeRequest('/advancedGeneration', {
      method: 'POST',
      body: storyData,
      timeout: 600000 // 10 minutes for advanced generation
    });
  }

  async getGenerationStatus(jobId) {
    return this.makeRequest(`/advancedGeneration/${jobId}`, {
      method: 'GET'
    });
  }

  async cancelGeneration(jobId) {
    return this.makeRequest(`/advancedGeneration/${jobId}`, {
      method: 'DELETE'
    });
  }

  // =====================================================================
  // STREAMING METHODS
  // =====================================================================

  createEventSource(endpoint) {
    const url = `${this.config.baseUrl}${endpoint}`;
    console.log(`🔄 Creating EventSource: ${url}`);
    
    const eventSource = new EventSource(url, {
      withCredentials: true
    });
    
    return eventSource;
  }

  // =====================================================================
  // UTILITY METHODS
  // =====================================================================

  validateConfig() {
    if (!this.config.baseUrl) {
      throw new Error('API base URL is required');
    }
    
    if (this.config.timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms');
    }
    
    return true;
  }

  getConfig() {
    return { ...this.config };
  }

  reset() {
    this.config = { ...this.defaultConfig };
  }
}

// =====================================================================
// CUSTOM ERROR CLASS
// =====================================================================

class APIError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.details = details;
  }

  toString() {
    return `${this.name}: ${this.message} (Status: ${this.status})`;
  }
}

// =====================================================================
// SINGLETON INSTANCE
// =====================================================================

const apiService = new APIService();

export default apiService;
export { APIError };
