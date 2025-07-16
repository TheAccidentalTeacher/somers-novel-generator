// =====================================================================
// BULLETPROOF API SERVICE - v3.4 (Clean Environment Variable Usage)
// =====================================================================
// Completely rewritten from scratch to work perfectly with the new CORS setup

class APIService {
  constructor() {
    this.defaultConfig = {
      baseUrl: this.getDefaultBaseUrl(),
      timeout: 120000, // 2 minutes default timeout for AI generation
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
      retryDelay = this.config.retryDelay,
      signal = null // External abort signal
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
        console.log(`🚀 API Request [Attempt ${attempt + 1}]: ${method} ${url} (timeout: ${timeout}ms)`);
        
        // Create abort controller for timeout, but respect external signal
        if (signal) {
          // If external signal is already aborted, don't even start the request
          if (signal.aborted) {
            throw new DOMException('Request was aborted', 'AbortError');
          }
          requestConfig.signal = signal;
        } else {
          const controller = new AbortController();
          timeoutId = setTimeout(() => {
            console.log(`⏰ Request timeout triggered after ${timeout}ms for ${method} ${endpoint}`);
            controller.abort();
          }, timeout);
          requestConfig.signal = controller.signal;
        }

        const response = await fetch(url, requestConfig);
        clearTimeout(timeoutId);

        // Log response details
        console.log(`📡 API Response: ${response.status} ${response.statusText}`);

        // Handle response
        if (!response.ok) {
          // Get response body for better error details
          let errorDetails = await this.safeResponseText(response);
          let parsedError = null;
          
          try {
            parsedError = JSON.parse(errorDetails);
          } catch {
            // Not JSON, use as is
          }
          
          const apiError = new APIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            parsedError || errorDetails
          );
          
          // Add specific error context
          apiError.url = url;
          apiError.method = method;
          apiError.timestamp = new Date().toISOString();
          
          console.error('❌ API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            url: url,
            method: method,
            errorDetails: parsedError || errorDetails,
            headers: Object.fromEntries(response.headers.entries())
          });
          
          throw apiError;
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
        
        // Don't retry on abort errors, client errors (4xx) or final attempt
        if (error.name === 'AbortError' || attempt === retryAttempts || (error.status && error.status >= 400 && error.status < 500)) {
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

      return {
        status: 'connected',
        message: 'Backend connected successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Even if the request fails, if we get a proper API response (like validation error),
      // it means the connection is working
      if (error.status && error.status >= 400 && error.status < 500) {
        return {
          status: 'connected',
          message: 'Backend connected (API validation as expected)',
          timestamp: new Date().toISOString()
        };
      }
      throw new APIError('Backend connection failed', 0, error.message);
    }
  }

  // =====================================================================
  // NOVEL GENERATION METHODS
  // =====================================================================

  async createOutline(storyData, signal = null) {
    // SIMPLE FIX: Route old outline calls to new simple system
    const { synopsis, genre = 'fantasy', wordCount = 50000, chapters } = storyData;
    
    // Use provided chapter count if available, otherwise calculate
    const chapterCount = chapters || Math.max(5, Math.min(25, Math.round(wordCount / 2000)));
    
    const settings = {
      genre,
      wordCount,
      chapterCount
    };
    
    const response = await this.makeRequest('/simple-generate-new/outline', {
      method: 'POST',
      body: JSON.stringify({ 
        premise: synopsis,
        settings 
      }),
      timeout: 180000, // 3 minutes for outline generation
      signal
    });
    
    return response;
  }

  // =====================================================================
  // SIMPLE GENERATION METHODS (ONLY WORKING SYSTEM)
  // =====================================================================

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

  // NEW: Simple outline generation (streamlined approach)
  async generateSimpleOutline(premise, storyType = 'fantasy') {
    console.log(`🚀 Starting simple outline generation (${premise.length} characters)...`);
    
    try {
      const response = await this.makeRequest('/simple-generate', {
        method: 'POST',
        body: JSON.stringify({
          premise: premise.trim(),
          storyType
        }),
        timeout: 60000 // 1 minute timeout for outline generation
      });

      if (response.success) {
        console.log(`✅ Simple outline generated: ${response.outline.length} chapters`);
        return response;
      } else {
        throw new Error(response.error || 'Failed to generate outline');
      }
    } catch (error) {
      console.error('❌ Simple outline generation failed:', error);
      throw error;
    }
  }

  // NEW: Simple generation endpoints
  async generateSimpleOutlineNew(premise, settings = {}) {
    return this.makeRequest('/simple-generate-new/outline', {
      method: 'POST',
      body: JSON.stringify({ premise, settings }),
      timeout: 180000 // 3 minutes for outline generation
    });
  }

  async generateSimpleNovel(premise, settings = {}, signal = null) {
    console.log(`🚀 Starting full novel generation (${premise.length} characters)...`);
    
    return this.makeRequest('/simple-generate-new/full-novel', {
      method: 'POST',
      body: JSON.stringify({ premise, settings }),
      timeout: 600000, // 10 minutes timeout for full novel generation
      signal
    });
  }

  // NEW: Live streaming chapter generation
  async startStreamingGeneration(outline, settings = {}) {
    console.log(`🎥 Starting streaming generation for ${outline.length} chapters...`);
    
    const response = await this.makeRequest('/simple-generate-new/stream-start', {
      method: 'POST',
      body: JSON.stringify({ 
        outline, 
        settings,
        timestamp: new Date().toISOString()
      }),
      timeout: 10000 // 10 seconds to start the stream
    });
    
    return response;
  }

  // Create streaming connection for chapter generation
  createChapterStream(streamId) {
    const url = `${this.config.baseUrl}/simple-generate-new/stream/${streamId}`;
    console.log(`🎥 Creating chapter stream: ${url}`);
    
    // Don't use credentials for EventSource to avoid CORS issues
    const eventSource = new EventSource(url);
    
    // Add debugging
    eventSource.addEventListener('open', () => {
      console.log('🔗 EventSource opened successfully');
    });
    
    eventSource.addEventListener('error', (error) => {
      console.error('❌ EventSource error:', error);
      console.log('❌ EventSource readyState:', eventSource.readyState);
    });
    
    return eventSource;
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
    this.timestamp = new Date().toISOString();
  }

  toString() {
    return `${this.name}: ${this.message} (Status: ${this.status})`;
  }

  getDetailedInfo() {
    return {
      error: this.message,
      status: this.status,
      timestamp: this.timestamp,
      details: this.details,
      url: this.url,
      method: this.method,
      suggestions: this.getSuggestions()
    };
  }

  getSuggestions() {
    const suggestions = [];
    
    if (this.status === 0) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify the backend server is running');
    } else if (this.status === 400) {
      suggestions.push('Check the request data format');
      suggestions.push('Ensure all required fields are provided');
    } else if (this.status === 401) {
      suggestions.push('Check API authentication');
      suggestions.push('Verify API keys are correctly set');
    } else if (this.status === 403) {
      suggestions.push('Check API permissions');
      suggestions.push('Verify you have access to this resource');
    } else if (this.status === 404) {
      suggestions.push('Check the API endpoint URL');
      suggestions.push('Verify the backend is deployed correctly');
    } else if (this.status === 429) {
      suggestions.push('You are being rate limited');
      suggestions.push('Wait a moment and try again');
    } else if (this.status >= 500) {
      suggestions.push('Server error - try again in a moment');
      suggestions.push('Check backend logs for more details');
    }
    
    // Add specific suggestions based on error details
    if (this.details && typeof this.details === 'object') {
      if (this.details.errorCode === 'MISSING_API_KEY') {
        suggestions.push('Set OPENAI_API_KEY environment variable');
      } else if (this.details.errorCode === 'JSON_PARSE_ERROR') {
        suggestions.push('AI response was malformed - try again');
      } else if (this.details.errorCode === 'TIMEOUT_ERROR') {
        suggestions.push('Try with a shorter premise');
        suggestions.push('Use batch mode instead of streaming');
      }
    }
    
    return suggestions;
  }
}

// =====================================================================
// SINGLETON INSTANCE
// =====================================================================

const apiService = new APIService();

export default apiService;
export { APIError };
