import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import autoGenerateRouter from './routes/autoGenerate.js';
import generateNovelRouter from './routes/generateNovel.js';
import streamGenerationRouter from './routes/streamGeneration.js';

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

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL || 'https://new-novel-generator.netlify.app',
    /\.netlify\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

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
    version: '1.0.0',
    endpoints: {
      health: '/health',
      quickGenerate: 'POST /api/generateNovel',
      autoGenerate: 'POST /api/autoGenerateNovel',
      streamGeneration: 'POST /api/streamGeneration'
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
