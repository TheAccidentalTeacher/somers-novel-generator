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
    
    // Get frontend URL from CORS_ORIGINS environment variable (Railway)
    const corsOrigins = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'https://somers-novel-writer.netlify.app';
    
    // Handle multiple origins (comma-separated)
    const originsList = corsOrigins.split(',').map(origin => origin.trim());
    
    this.productionDomains = new Set([
      ...originsList, // Railway CORS_ORIGINS environment variable
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
    console.log(`🔧 CORS: Raw CORS_ORIGINS env:`, process.env.CORS_ORIGINS);
    console.log(`🔧 CORS: Raw FRONTEND_URL env:`, process.env.FRONTEND_URL);
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
  console.log(`🚀 Somers Novel Generator backend running on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📡 CORS Origins: ${process.env.CORS_ORIGINS || 'Not set'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`🔒 CORS Configuration: ✅ Bulletproof CORS enabled`);
});

export default app;
