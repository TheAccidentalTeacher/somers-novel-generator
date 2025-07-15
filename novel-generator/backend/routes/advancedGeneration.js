import express from 'express';
import advancedAI from '../services/advancedAI.js';

const router = express.Router();

// POST /api/advanced/createOutline - Create story outline
router.post('/createOutline', async (req, res) => {
  try {
    console.log('📝 OUTLINE REQUEST RECEIVED:', {
      timestamp: new Date().toISOString(),
      hasStoryData: !!req.body.storyData,
      storyTitle: req.body.storyData?.title,
      storyGenre: req.body.storyData?.genre,
      wordCount: req.body.storyData?.wordCount,
      chapters: req.body.storyData?.chapters
    });

    const { storyData } = req.body;

    if (!storyData) {
      console.log('❌ No story data provided');
      return res.status(400).json({ error: 'Story data is required' });
    }

    // Validate required fields
    const required = ['title', 'genre', 'subgenre', 'synopsis', 'wordCount', 'chapters'];
    const missing = required.filter(field => !storyData[field]);
    
    if (missing.length > 0) {
      console.log('❌ Missing required fields:', missing);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing: missing 
      });
    }

    if (!advancedAI.isConfigured()) {
      console.log('❌ OpenAI not configured - returning error');
      return res.status(503).json({ 
        error: 'AI service not available', 
        message: 'OpenAI API key not configured' 
      });
    }

    console.log(`📝 Creating outline for "${storyData.title}" (${storyData.genre})`);
    console.log('📝 Starting OpenAI outline generation...');
    
    const outline = await advancedAI.createOutline(storyData);
    
    console.log(`✅ Outline created successfully: ${outline.length} chapters`);
    
    res.json({
      success: true,
      outline: outline,
      message: `Created ${outline.length} chapter outline for "${storyData.title}"`
    });

  } catch (error) {
    console.error('💥 OUTLINE ERROR:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      error: 'Outline creation failed', 
      message: error.message 
    });
  }
});

// POST /api/advanced/generation - Start advanced generation job
router.post('/generation', async (req, res) => {
  try {
    const { storyData, preferences = {} } = req.body;

    if (!storyData) {
      return res.status(400).json({ error: 'Story data is required' });
    }

    if (!advancedAI.isConfigured()) {
      return res.status(503).json({ 
        error: 'AI service not available', 
        message: 'OpenAI API key not configured' 
      });
    }

    // Create generation job
    const jobId = advancedAI.createJob(storyData, preferences);
    
    console.log(`🚀 Started generation job ${jobId} for "${storyData.title}"`);
    
    // Start processing asynchronously
    advancedAI.processAdvancedGeneration(jobId).catch(error => {
      console.error(`Job ${jobId} processing error:`, error);
    });

    res.json({
      success: true,
      jobId: jobId,
      message: 'Generation job started',
      statusUrl: `/api/advanced/status/${jobId}`
    });

  } catch (error) {
    console.error('Generation job creation error:', error);
    res.status(500).json({ 
      error: 'Failed to start generation job', 
      message: error.message 
    });
  }
});

// GET /api/advanced/status/:jobId - Get job status
router.get('/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = advancedAI.getJob(jobId);

    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found', 
        jobId: jobId 
      });
    }

    // Return job status without sensitive data
    const status = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      chaptersCompleted: job.chaptersCompleted,
      currentChapter: job.currentChapter,
      currentProcess: job.currentProcess,
      startTime: job.startTime,
      logs: job.logs,
      error: job.error
    };

    // Include result if completed
    if (job.status === 'completed' && job.result) {
      status.result = job.result;
    }

    res.json(status);

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Failed to get job status', 
      message: error.message 
    });
  }
});

// DELETE /api/advanced/job/:jobId - Cancel/delete job
router.delete('/job/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = advancedAI.getJob(jobId);

    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found', 
        jobId: jobId 
      });
    }

    advancedAI.deleteJob(jobId);
    
    console.log(`🗑️ Deleted job ${jobId}`);
    
    res.json({
      success: true,
      message: 'Job deleted successfully',
      jobId: jobId
    });

  } catch (error) {
    console.error('Job deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete job', 
      message: error.message 
    });
  }
});

// POST /api/advanced/streamGeneration - Start streaming generation
router.post('/streamGeneration', (req, res) => {
  try {
    const { storyData, preferences = {} } = req.body;

    if (!storyData) {
      return res.status(400).json({ error: 'Story data is required' });
    }

    if (!advancedAI.isConfigured()) {
      return res.status(503).json({ 
        error: 'AI service not available', 
        message: 'OpenAI API key not configured' 
      });
    }

    // Create streaming generation
    const streamId = advancedAI.createStream(storyData, preferences);
    
    console.log(`📡 Created stream ${streamId} for "${storyData.title}"`);
    
    res.json({
      success: true,
      streamId: streamId,
      message: 'Stream created successfully',
      streamUrl: `/api/advanced/stream/${streamId}`
    });

  } catch (error) {
    console.error('Stream creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create stream', 
      message: error.message 
    });
  }
});

// GET /api/advanced/stream/:streamId - Server-Sent Events stream
router.get('/stream/:streamId', (req, res) => {
  try {
    const { streamId } = req.params;
    const stream = advancedAI.getStream(streamId);

    if (!stream) {
      return res.status(404).json({ 
        error: 'Stream not found', 
        streamId: streamId 
      });
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Add client to stream
    advancedAI.addStreamClient(streamId, res);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      streamId: streamId,
      message: 'Connected to generation stream' 
    })}\n\n`);

    console.log(`📡 Client connected to stream ${streamId}`);

    // Start generation process if not already running
    if (stream.status === 'initialized') {
      // Create a job for the stream and start processing
      const jobId = advancedAI.createJob(stream.storyData, stream.preferences);
      
      advancedAI.processAdvancedGeneration(jobId).then(result => {
        advancedAI.broadcastToStream(streamId, 'completed', { result });
      }).catch(error => {
        advancedAI.broadcastToStream(streamId, 'error', { error: error.message });
      });
    }

    // Handle client disconnect
    req.on('close', () => {
      console.log(`📡 Client disconnected from stream ${streamId}`);
      advancedAI.removeStreamClient(streamId, res);
    });

  } catch (error) {
    console.error('Stream connection error:', error);
    res.status(500).json({ 
      error: 'Failed to connect to stream', 
      message: error.message 
    });
  }
});

// GET /api/advanced/health - Service health check
router.get('/health', (req, res) => {
  const isConfigured = advancedAI.isConfigured();
  
  res.json({
    service: 'Advanced AI Generation',
    status: isConfigured ? 'healthy' : 'degraded',
    openai: {
      configured: isConfigured,
      model: 'gpt-4o'
    },
    features: {
      outlineCreation: isConfigured,
      chapterGeneration: isConfigured,
      jobManagement: true,
      streaming: isConfigured
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
