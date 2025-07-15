import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import autoGenerateRouter from './routes/autoGenerate.js';
import generateNovelRouter from './routes/generateNovel.js';
import streamGenerationRouter from './routes/streamGeneration.js';
import advancedGenerationRouter from './routes/advancedGeneration.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
// BULLETPROOF CORS CONFIGURATION
// =====================================================================
// Completely rewritten from scratch for maximum reliability and security

class CORSManager {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Get frontend URL from environment variable or use default
    const frontendUrl = process.env.FRONTEND_URL || 'https://somers-novel-writer.netlify.app';
    
    this.productionDomains = new Set([
      frontendUrl, // Railway environment variable
      'https://somers-novel-writer.netlify.app' // Fallback
    ]);
    
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

    console.log(`🔧 CORS: Production domains configured:`, Array.from(this.productionDomains));
    console.log(`🔧 CORS: Environment: ${this.isDevelopment ? 'development' : 'production'}`);
  }

  isValidOrigin(origin) {
    // No origin means same-origin or tools like Postman/curl
    if (!origin) return true;

    // Production domains (exact match)
    if (this.productionDomains.has(origin)) return true;

    // Development domains (exact match)
    if (this.developmentDomains.has(origin)) return true;

    // Netlify preview/branch deploys (secure pattern matching)
    if (this.isValidNetlifyDomain(origin)) return true;

    // Development localhost with any port (secure pattern)
    if (this.isDevelopment && this.isValidDevelopmentDomain(origin)) return true;

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
        const isValid = this.isValidOrigin(origin);
        
        if (isValid) {
          console.log(`✅ CORS: Allowed origin: ${origin || 'same-origin'}`);
          callback(null, true);
        } else {
          console.error(`❌ CORS: Blocked origin: ${origin}`);
          callback(new Error(`CORS policy violation: Origin ${origin} is not allowed`), false);
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

// =====================================================================
// ADDITIONAL CORS PREFLIGHT HANDLER
// =====================================================================
// Handle complex preflight requests that might not be caught by standard CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Set CORS headers for all requests
  if (corsManager.isValidOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers', 'Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin, Cache-Control, Pragma');
    res.header('Access-Control-Max-Age', '86400');
  }
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log(`🔄 CORS: Preflight request from ${origin || 'same-origin'}`);
    return res.status(200).end();
  }
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', autoGenerateRouter);
app.use('/api', generateNovelRouter);
app.use('/api', streamGenerationRouter);
app.use('/api', advancedGenerationRouter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check API keys availability
    const apiStatus = {
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
      azure: process.env.AZURE_AI_FOUNDRY_KEY ? 'configured' : 'not configured',
      replicate: process.env.REPLICATE_API_TOKEN ? 'configured' : 'not configured',
      stability: process.env.STABILITY_AI_API_KEY ? 'configured' : 'not configured'
    };
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'somers-novel-generator-backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      apis: apiStatus,
      frontend: process.env.FRONTEND_URL || 'not configured',
      message: 'Somers Novel Generator backend is running'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
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
      health: '/health',
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
  console.log(`🚀 Somers Novel Generator backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
});

export default app;
