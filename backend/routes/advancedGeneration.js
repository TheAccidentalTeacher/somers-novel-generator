import express from 'express';
import advancedAI from '../services/advancedAI.js';

const router = express.Router();

// Create outline endpoint
router.post('/createOutline', async (req, res) => {
  try {
    console.log('📋 Creating outline...');
    console.log('🔍 Request body synopsis length:', req.body.synopsis?.length || 'undefined');
    console.log('🔍 Request body synopsis preview:', req.body.synopsis?.substring(0, 200) || 'undefined');
    
    const {
      title,
      genre,
      subgenre,
      genreInstructions,
      wordCount,
      chapters,
      targetChapterLength,
      synopsis,
      fictionLength
    } = req.body;

    console.log('🔍 After destructuring synopsis length:', synopsis?.length || 'undefined');

    // Validate required fields
    if (!title || !genre || !synopsis || !chapters) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, genre, synopsis, chapters'
      });
    }

    if (!advancedAI.isConfigured()) {
      // Provide mock outline for demo purposes
      console.log('⚠️  AI service not configured, providing demo outline');
      const mockOutline = Array.from({length: chapters}, (_, i) => ({
        chapter: i + 1,
        title: `Chapter ${i + 1}: [Demo Title]`,
        summary: `This is a demo chapter summary for chapter ${i + 1}. In a real implementation with an OpenAI API key, this would contain a detailed, genre-appropriate chapter outline based on your synopsis.`,
        wordCount: targetChapterLength,
        themes: ['Demo Theme'],
        keyEvents: [`Demo event for chapter ${i + 1}`]
      }));

      return res.json({
        success: true,
        outline: mockOutline,
        message: 'Demo outline generated (OpenAI API key not configured)'
      });
    }

    const storyData = {
      title,
      genre,
      subgenre,
      genreInstructions,
      wordCount,
      chapters,
      targetChapterLength,
      synopsis,
      fictionLength
    };

    console.log(`Creating outline for "${title}" - ${chapters} chapters, ${wordCount} words`);

    const outline = await advancedAI.createOutline(storyData);

    console.log(`✅ Outline created successfully with ${outline.length} chapters`);

    res.json({
      success: true,
      outline: outline,
      message: `Outline created with ${outline.length} chapters`
    });

  } catch (error) {
    console.error('❌ Outline creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Advanced batch generation endpoint
router.post('/advancedGeneration', async (req, res) => {
  try {
    console.log('🚀 Starting advanced generation...');
    
    const { storyData, preferences, useAdvancedIteration } = req.body;

    if (!storyData || !storyData.title || !storyData.synopsis) {
      return res.status(400).json({
        success: false,
        error: 'Missing required story data'
      });
    }

    if (!advancedAI.isConfigured()) {
      // Provide demo response for testing UI flow
      console.log('⚠️  AI service not configured, providing demo response');
      return res.status(503).json({
        success: false,
        error: 'Demo Mode: OpenAI API key not configured. This is a demonstration environment. To generate actual content, please configure your OpenAI API key in the environment variables.',
        isDemoMode: true
      });
    }

    // Create job
    const jobId = advancedAI.createJob(storyData, preferences);
    
    console.log(`📝 Advanced generation job created: ${jobId}`);

    // Start processing asynchronously
    advancedAI.processAdvancedGeneration(jobId).catch(error => {
      console.error(`Job ${jobId} processing error:`, error);
    });

    res.json({
      success: true,
      jobId: jobId,
      message: 'Advanced generation started'
    });

  } catch (error) {
    console.error('❌ Advanced generation start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get advanced generation job status
router.get('/advancedGeneration/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = advancedAI.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        chaptersCompleted: job.chaptersCompleted,
        currentChapter: job.currentChapter,
        currentProcess: job.currentProcess,
        logs: job.logs,
        result: job.result,
        error: job.error,
        elapsedTime: job.startTime ? Math.round((Date.now() - job.startTime.getTime()) / 1000) + 's' : '0s',
        estimatedRemaining: job.progress > 0 ? 
          Math.round(((Date.now() - job.startTime.getTime()) / job.progress) * (100 - job.progress) / 1000) + 's' : 
          'Calculating...'
      }
    });

  } catch (error) {
    console.error('❌ Job status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel advanced generation job
router.delete('/advancedGeneration/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = advancedAI.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    advancedAI.updateJob(jobId, {
      status: 'cancelled',
      currentProcess: 'Cancelled by user'
    });

    console.log(`🚫 Job ${jobId} cancelled`);

    res.json({
      success: true,
      message: 'Job cancelled'
    });

  } catch (error) {
    console.error('❌ Job cancellation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Advanced streaming generation endpoint
router.post('/advancedStreamGeneration', async (req, res) => {
  try {
    console.log('📡 Starting advanced streaming generation...');
    
    const { storyData, preferences } = req.body;

    if (!storyData || !storyData.title || !storyData.synopsis) {
      return res.status(400).json({
        success: false,
        error: 'Missing required story data'
      });
    }

    if (!advancedAI.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured. Please check OpenAI API key.'
      });
    }

    // Create stream
    const streamId = advancedAI.createStream(storyData, preferences);
    
    console.log(`📡 Advanced streaming generation created: ${streamId}`);

    // Start processing asynchronously
    processAdvancedStream(streamId).catch(error => {
      console.error(`Stream ${streamId} processing error:`, error);
      advancedAI.broadcastToStream(streamId, 'error', { error: error.message });
    });

    res.json({
      success: true,
      streamId: streamId,
      message: 'Advanced streaming generation started'
    });

  } catch (error) {
    console.error('❌ Advanced streaming start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add a health check endpoint for streaming
router.get('/streamHealth', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no'
  });
  
  res.write(`data: ${JSON.stringify({ type: 'health', status: 'ok' })}\n\n`);
  
  setTimeout(() => {
    res.end();
  }, 1000);
});

// Improved streaming endpoint with error handling
router.get('/advancedStreamGeneration/:streamId', (req, res) => {
  const { streamId } = req.params;
  
  console.log(`📡 Client connected to advanced stream: ${streamId}`);

  try {
    // Set up SSE headers with HTTP/1.1 compatibility
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'Access-Control-Allow-Methods': 'GET',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Transfer-Encoding': 'chunked'
    });

    // Add client to stream
    advancedAI.addStreamClient(streamId, res);

    // Send initial connection message with retry instructions
    const connectionMessage = {
      type: 'connected',
      streamId,
      fallback: {
        usePolling: true,
        endpoint: `/api/advancedGeneration/${streamId}`,
        interval: 2000
      }
    };
    
    res.write(`data: ${JSON.stringify(connectionMessage)}\n\n`);

    // Handle client disconnect
    req.on('close', () => {
      console.log(`📡 Client disconnected from advanced stream: ${streamId}`);
      advancedAI.removeStreamClient(streamId, res);
    });

    // Handle errors
    req.on('error', (error) => {
      console.error(`📡 Stream error for ${streamId}:`, error);
      advancedAI.removeStreamClient(streamId, res);
    });

  } catch (error) {
    console.error(`📡 Failed to setup stream ${streamId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup streaming connection',
      fallback: {
        usePolling: true,
        endpoint: `/api/advancedGeneration/${streamId}`,
        interval: 2000
      }
    });
  }
});

// Advanced streaming processing function
async function processAdvancedStream(streamId) {
  const stream = advancedAI.getStream(streamId);
  if (!stream) return;

  try {
    // Check if AI service is configured
    if (!advancedAI.isConfigured()) {
      // Provide mock response for demo purposes
      advancedAI.broadcastToStream(streamId, 'process_update', { 
        message: 'Demo Mode: AI service not configured (missing OpenAI API key)' 
      });
      
      advancedAI.broadcastToStream(streamId, 'error', { 
        error: 'OpenAI API key not configured. This is a demo environment. Please configure your API key to generate actual content.' 
      });
      return;
    }

    advancedAI.broadcastToStream(streamId, 'process_update', { 
      message: 'Creating detailed story outline...' 
    });

    // Create outline if not provided
    let outline = stream.storyData.outline;
    if (!outline || outline.length === 0) {
      outline = await advancedAI.createOutline(stream.storyData);
      advancedAI.broadcastToStream(streamId, 'process_update', { 
        message: 'Outline created, beginning chapter generation...' 
      });
    }

    const totalChapters = outline.length;
    const chapters = [];

    // Generate each chapter with streaming updates
    for (let i = 0; i < totalChapters; i++) {
      const chapterNumber = i + 1;
      const chapterOutline = outline[i];

      advancedAI.broadcastToStream(streamId, 'chapter_planning', {
        chapter: chapterNumber,
        title: chapterOutline.title
      });

      advancedAI.broadcastToStream(streamId, 'chapter_writing', {
        chapter: chapterNumber,
        title: chapterOutline.title
      });

      const chapter = await advancedAI.generateChapterAdvanced({
        chapterNumber,
        chapterOutline,
        storyData: stream.storyData,
        previousChapters: chapters,
        onProgress: (message) => {
          advancedAI.broadcastToStream(streamId, 'process_update', { message });
        }
      });

      chapters.push(chapter);

      advancedAI.broadcastToStream(streamId, 'chapter_complete', {
        chapter: chapterNumber,
        title: chapter.title,
        wordCount: chapter.wordCount,
        progress: (chapterNumber / totalChapters) * 100
      });

      // Small delay for streaming effect
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    advancedAI.broadcastToStream(streamId, 'complete', {
      title: stream.storyData.title,
      chapters: chapters,
      totalChapters: chapters.length,
      totalWords: totalWords
    });

    console.log(`✅ Advanced streaming generation completed: ${streamId}`);

  } catch (error) {
    console.error(`❌ Advanced streaming generation error:`, error);
    advancedAI.broadcastToStream(streamId, 'error', { error: error.message });
  }
}

// Legacy endpoints for compatibility with frontend apiService
router.post('/generateNovel', async (req, res) => {
  try {
    console.log('📚 Generating novel (legacy endpoint)...');
    const { storyData } = req.body;

    if (!storyData) {
      return res.status(400).json({
        success: false,
        error: 'Missing storyData'
      });
    }

    if (!advancedAI.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured. Please check OpenAI API key.'
      });
    }

    // Use advanced generation for better results
    const jobId = advancedAI.createJob(storyData, {});
    advancedAI.processAdvancedGeneration(jobId).catch(error => {
      console.error(`Legacy job ${jobId} processing error:`, error);
    });

    res.json({
      success: true,
      jobId: jobId,
      message: 'Novel generation started (using advanced system)'
    });

  } catch (error) {
    console.error('❌ Legacy generateNovel error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/autoGenerateNovel', async (req, res) => {
  try {
    console.log('🤖 Auto-generating novel (legacy endpoint)...');
    const { conflictData } = req.body;

    if (!conflictData) {
      return res.status(400).json({
        success: false,
        error: 'Missing conflictData'
      });
    }

    if (!advancedAI.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured. Please check OpenAI API key.'
      });
    }

    // Use advanced generation for better results
    const jobId = advancedAI.createJob(conflictData, {});
    advancedAI.processAdvancedGeneration(jobId).catch(error => {
      console.error(`Legacy auto-generation job ${jobId} processing error:`, error);
    });

    res.json({
      success: true,
      jobId: jobId,
      message: 'Auto-generation started (using advanced system)'
    });

  } catch (error) {
    console.error('❌ Legacy autoGenerateNovel error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
