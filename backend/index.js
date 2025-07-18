import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Import routes
import advancedGenerationRouter from './routes/advancedGeneration.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Railway/production environments (must be before other middleware)
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// =====================================================================
// BULLETPROOF CORS CONFIGURATION - v2.0
// =====================================================================
// Rewritten to handle the exact Netlify URL correctly

class CORSManager {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Get production domains from environment variables
    const corsOrigins = process.env.CORS_ORIGINS;
    const frontendUrl = process.env.FRONTEND_URL;
    
    // EXACT production domains - from environment variables first, then fallback
    this.productionDomains = new Set();
    
    // Add from CORS_ORIGINS environment variable
    if (corsOrigins) {
      corsOrigins.split(',').forEach(origin => {
        this.productionDomains.add(origin.trim());
      });
    }
    
    // Add from FRONTEND_URL environment variable
    if (frontendUrl) {
      this.productionDomains.add(frontendUrl.trim());
    }
    
    // Fallback for safety - add both possible Netlify URLs
    this.productionDomains.add('https://somers-novel-writer.netlify.app');
    this.productionDomains.add('https://somers-novel-generator.netlify.app');
    
    // Also add any URL that follows the pattern for your repo
    this.productionDomains.add('https://new-novel-generator.netlify.app');
    
    // Development domains
    this.developmentDomains = new Set([
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:3000',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4173'
    ]);

    console.log(`🔧 CORS: Production domains:`, Array.from(this.productionDomains));
    console.log(`🔧 CORS: Development domains:`, Array.from(this.developmentDomains));
    console.log(`🔧 CORS: Environment: ${this.isDevelopment ? 'development' : 'production'}`);
  }

  isValidOrigin(origin) {
    // No origin means same-origin requests or tools like Postman
    if (!origin) {
      console.log(`✅ CORS: No origin (same-origin request)`);
      return true;
    }

    // Check production domains (exact match)
    if (this.productionDomains.has(origin)) {
      console.log(`✅ CORS: Production domain matched: ${origin}`);
      return true;
    }

    // Check development domains (exact match)
    if (this.developmentDomains.has(origin)) {
      console.log(`✅ CORS: Development domain matched: ${origin}`);
      return true;
    }

    // In development, allow Netlify preview domains
    if (this.isDevelopment && this.isValidNetlifyDomain(origin)) {
      console.log(`✅ CORS: Netlify preview domain allowed: ${origin}`);
      return true;
    }

    console.log(`❌ CORS: Origin not allowed: ${origin}`);
    console.log(`❌ CORS: Production domains:`, Array.from(this.productionDomains));
    console.log(`❌ CORS: Development domains:`, Array.from(this.developmentDomains));
    return false;
  }

  isValidNetlifyDomain(origin) {
    // Strict Netlify domain validation
    const netlifyPattern = /^https:\/\/[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?--[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.netlify\.app$/;
    const mainNetlifyPattern = /^https:\/\/[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.netlify\.app$/;
    
    return netlifyPattern.test(origin) || mainNetlifyPattern.test(origin);
  }

  isValidDevelopmentDomain(origin) {
    // Only allow localhost and 127.0.0.1 with ports 3000-9999
    const devPattern = /^https?:\/\/(localhost|127\.0\.0\.1):[3-9]\d{3}$/;
    return devPattern.test(origin);
  }

  getCORSOptions() {
    return {
      origin: (origin, callback) => {
        console.log(`🔍 CORS: Checking origin: ${origin || 'no-origin'}`);
        
        const isValid = this.isValidOrigin(origin);
        
        if (isValid) {
          console.log(`✅ CORS: Origin approved: ${origin || 'same-origin'}`);
          callback(null, true);
        } else {
          console.error(`❌ CORS: Origin rejected: ${origin}`);
          // Don't callback with error - just deny
          callback(null, false);
        }
      },
      
      credentials: true,
      
      methods: [
        'GET', 
        'POST', 
        'PUT', 
        'DELETE', 
        'OPTIONS', 
        'PATCH', 
        'HEAD'
      ],
      
      allowedHeaders: [
        'Accept',
        'Accept-Language',
        'Content-Language',
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Origin',
        'Cache-Control',
        'Pragma'
      ],
      
      exposedHeaders: [
        'Content-Length',
        'Content-Range',
        'X-Content-Range'
      ],
      
      maxAge: 86400, // 24 hours
      
      optionsSuccessStatus: 200 // For legacy browser support
    };
  }
}

// Initialize CORS manager
const corsManager = new CORSManager();
const corsOptions = corsManager.getCORSOptions();

app.use(cors(corsOptions));

// Body parsing middleware (no rate limiting needed for single user)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', advancedGenerationRouter);

// Health check endpoint for connection testing
app.get('/api/health', async (req, res) => {
  try {
    const healthData = {
      success: true,
      message: 'Somers Novel Generator API is running',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      status: 'healthy',
      environment: process.env.NODE_ENV || 'development',
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        status: process.env.OPENAI_API_KEY ? 'ready' : 'not_configured'
      },
      cors: {
        allowedOrigins: Array.from(corsManager.productionDomains),
        mode: corsManager.isDevelopment ? 'development' : 'production'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      },
      uptime: Math.round(process.uptime()) + 's'
    };

    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Somers Novel Generator API',
    version: '2.0.0',
    endpoints: {
      quickGenerate: 'POST /api/generateNovel',
      autoGenerate: 'POST /api/autoGenerateNovel',
      streamGeneration: 'POST /api/streamGeneration',
      // Advanced endpoints
      createOutline: 'POST /api/createOutline',
      advancedGeneration: 'POST /api/advancedGeneration',
      advancedStreaming: 'POST /api/advancedStreamGeneration'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Somers Novel Generator backend running on port ' + PORT);
  console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
  console.log('🤖 OpenAI API:', process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured');
  console.log('📡 CORS Origins:', process.env.CORS_ORIGINS || 'Not set');
  console.log('🌐 Frontend URL:', process.env.FRONTEND_URL || 'Not set');
  console.log('🔒 CORS Configuration: ✅ Bulletproof CORS enabled');
  console.log('⚡ Rate Limiting: ❌ Disabled (single-user app)');
});

export default app;
