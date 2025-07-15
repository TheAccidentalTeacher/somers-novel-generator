import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// CORS configuration - FIXED for Netlify
app.use(cors({
  origin: 'https://somers-novel-writer.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Range'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Novel Generator Backend'
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Novel Generator API v1.0',
    endpoints: {
      health: '/health',
      api: '/api',
      createOutline: '/api/createOutline',
      advanced: '/api/advanced/*'
    }
  });
});

// ADD MISSING ENDPOINT - /api/createOutline
app.post('/api/createOutline', async (req, res) => {
  try {
    console.log('📝 CREATE OUTLINE REQUEST:', req.body);
    
    const { title, genre, wordCount, chapters } = req.body;
    
    // Basic validation
    if (!title || !genre || !wordCount || !chapters) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, genre, wordCount, chapters'
      });
    }
    
    // Mock response for now - replace with actual AI logic later
    const outline = {
      title,
      genre,
      wordCount: parseInt(wordCount),
      chapters: parseInt(chapters),
      outline: `This is a ${genre} novel titled "${title}" with ${chapters} chapters and approximately ${wordCount} words.`,
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ OUTLINE CREATED:', outline);
    
    res.json({
      success: true,
      data: outline
    });
    
  } catch (error) {
    console.error('❌ CREATE OUTLINE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create outline'
    });
  }
});

// Import and use advanced generation routes
import advancedRoutes from './routes/advancedGeneration.js';
app.use('/api/advanced', advancedRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Novel Generator Backend running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 API info: http://localhost:${PORT}/api`);
  
  // Check OpenAI configuration
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not configured. AI features will not be available.');
  } else {
    console.log('✅ OpenAI API key configured');
  }
});

export default app;
