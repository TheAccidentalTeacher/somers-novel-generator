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
// FIXED: Use the working simple generator
import simpleGenerateRouter from './routes/simpleGenerateFixed.js';
// NEW: Simple, clean novel generator
import simpleGenerateNewRouter from './routes/simpleGenerateNew.js';

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
    
    // Fallback for safety
    this.productionDomains.add('https://somers-novel-writer.netlify.app');
    
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
app.use('/api/simple-generate', simpleGenerateRouter);
app.use('/api/simple-generate-new', simpleGenerateNewRouter);

// Health check endpoint for connection testing
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Somers Novel Generator API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
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
  console.log(`🚀 Somers Novel Generator backend running on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📡 CORS Origins: ${process.env.CORS_ORIGINS || 'Not set'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`🔒 CORS Configuration: ✅ Bulletproof CORS enabled`);
});

export default app;
