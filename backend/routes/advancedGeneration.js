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
    console.log(`🎯 Story data word targets:`, {
      wordCount: storyData.wordCount,
      chapters: storyData.chapters,
      targetChapterLength: storyData.targetChapterLength,
      calculatedTarget: storyData.wordCount / storyData.chapters
    });

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
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
    // Force HTTP/1.1 to avoid HTTP/2 protocol errors
    'HTTP': '1.1',
    'Transfer-Encoding': 'chunked',
    'X-HTTP-Method-Override': 'GET',
    'X-Forwarded-Proto': 'http'
  });
  
  res.write(`data: ${JSON.stringify({ 
    type: 'health', 
    status: 'ok', 
    protocol: 'HTTP/1.1',
    timestamp: Date.now() 
  })}\n\n`);
  
  setTimeout(() => {
    res.end();
  }, 1000);
});

// Improved streaming endpoint with error handling
router.get('/advancedStreamGeneration/:streamId', (req, res) => {
  const { streamId } = req.params;
  
  console.log(`📡 Client connected to advanced stream: ${streamId}`);

  try {
    // Force HTTP/1.1 with comprehensive protocol error prevention
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Expose-Headers': 'Content-Type',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'X-Content-Type-Options': 'nosniff',
      // Force HTTP/1.1 to avoid HTTP/2 protocol errors
      'HTTP': '1.1',
      'Transfer-Encoding': 'chunked',
      // Additional Railway/HTTP2 protocol error prevention
      'X-HTTP-Method-Override': 'GET',
      'X-Forwarded-Proto': 'http',
      'Upgrade-Insecure-Requests': '0'
    });

    // Add client to stream
    advancedAI.addStreamClient(streamId, res);

    // Send initial connection message with enhanced fallback
    const connectionMessage = {
      type: 'connected',
      streamId,
      timestamp: Date.now(),
      protocolVersion: 'HTTP/1.1',
      fallback: {
        usePolling: true,
        endpoint: `/api/advancedGeneration/${streamId}`,
        interval: 2000,
        reason: 'HTTP/2 protocol error prevention'
      }
    };
    
    res.write(`data: ${JSON.stringify(connectionMessage)}\n\n`);
    
    // Send immediate test message to verify connection
    setTimeout(() => {
      try {
        res.write(`data: ${JSON.stringify({ 
          type: 'process_update', 
          message: 'Stream connection established successfully with HTTP/1.1!',
          timestamp: Date.now(),
          protocol: 'HTTP/1.1'
        })}\n\n`);
      } catch (error) {
        console.error(`📡 Failed to send test message for stream ${streamId}:`, error.message);
        // Immediately fallback to polling if we can't write
        advancedAI.broadcastToStream(streamId, 'fallback_required', { 
          reason: 'Initial write test failed',
          error: error.message 
        });
      }
    }, 500); // Reduced delay for faster detection

    // Send heartbeat every 10 seconds (reduced for faster error detection)
    const heartbeatInterval = setInterval(() => {
      try {
        if (res.writableEnded || res.destroyed) {
          console.log(`📡 Stream ${streamId} already ended, cleaning up heartbeat`);
          clearInterval(heartbeatInterval);
          advancedAI.removeStreamClient(streamId, res);
          return;
        }
        
        res.write(`data: ${JSON.stringify({ 
          type: 'heartbeat', 
          timestamp: Date.now(),
          streamId,
          protocol: 'HTTP/1.1'
        })}\n\n`);
      } catch (error) {
        console.log(`📡 Heartbeat failed for stream ${streamId}, switching to polling:`, error.message);
        clearInterval(heartbeatInterval);
        advancedAI.removeStreamClient(streamId, res);
        // Notify the stream to use polling fallback
        advancedAI.broadcastToStream(streamId, 'fallback_required', { 
          reason: 'Heartbeat failed - HTTP/2 protocol error detected',
          error: error.message 
        });
      }
    }, 10000);

    // Handle client disconnect with better logging
    req.on('close', () => {
      console.log(`📡 Client disconnected from advanced stream: ${streamId}`);
      clearInterval(heartbeatInterval);
      advancedAI.removeStreamClient(streamId, res);
    });

    // Handle errors with detailed logging
    req.on('error', (error) => {
      console.error(`📡 Stream request error for ${streamId}:`, error.message);
      console.error(`📡 Error type: ${error.name}, Code: ${error.code}`);
      clearInterval(heartbeatInterval);
      advancedAI.removeStreamClient(streamId, res);
    });
    
    // Handle response errors
    res.on('error', (error) => {
      console.error(`📡 Stream response error for ${streamId}:`, error.message);
      console.error(`📡 Error type: ${error.name}, Code: ${error.code}`);
      clearInterval(heartbeatInterval);
      advancedAI.removeStreamClient(streamId, res);
    });

  } catch (error) {
    console.error(`📡 Failed to setup stream ${streamId}:`, error.message);
    console.error(`📡 Setup error type: ${error.name}, Stack:`, error.stack);
    
    // Try to send error response if headers not sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to setup streaming connection',
        details: error.message,
        fallback: {
          usePolling: true,
          endpoint: `/api/advancedGeneration/${streamId}`,
          interval: 2000
        }
      });
    }
  }
});

// Advanced streaming processing function
async function processAdvancedStream(streamId) {
  console.log(`📡 Processing advanced stream: ${streamId}`);
  const stream = advancedAI.getStream(streamId);
  if (!stream) {
    console.error(`❌ Stream not found: ${streamId}`);
    return;
  }

  try {
    console.log(`📡 Stream found, checking AI configuration...`);
    
    // Check if AI service is configured
    if (!advancedAI.isConfigured()) {
      console.log(`⚠️  AI service not configured for stream: ${streamId}`);
      // Provide mock response for demo purposes
      advancedAI.broadcastToStream(streamId, 'process_update', { 
        message: 'Demo Mode: AI service not configured (missing OpenAI API key)' 
      });
      
      advancedAI.broadcastToStream(streamId, 'error', { 
        error: 'OpenAI API key not configured. This is a demo environment. Please configure your API key to generate actual content.' 
      });
      return;
    }

    console.log(`✅ AI configured, starting outline creation for stream: ${streamId}`);
    advancedAI.broadcastToStream(streamId, 'process_update', { 
      message: 'Creating detailed story outline...' 
    });

    // Create outline if not provided
    let outline = stream.storyData.outline;
    if (!outline || outline.length === 0) {
      console.log(`📋 Creating outline for stream: ${streamId}`);
      outline = await advancedAI.createOutline(stream.storyData);
      console.log(`✅ Outline created with ${outline.length} chapters for stream: ${streamId}`);
      advancedAI.broadcastToStream(streamId, 'process_update', { 
        message: 'Outline created, beginning chapter generation...' 
      });
    } else {
      console.log(`📋 Using existing outline with ${outline.length} chapters for stream: ${streamId}`);
    }

    const totalChapters = outline.length;
    const chapters = [];

    console.log(`📝 Starting chapter generation for ${totalChapters} chapters in stream: ${streamId}`);

    // Generate each chapter with streaming updates
    for (let i = 0; i < totalChapters; i++) {
      const chapterNumber = i + 1;
      const chapterOutline = outline[i];

      console.log(`📝 Planning Chapter ${chapterNumber}: ${chapterOutline.title} for stream: ${streamId}`);
      advancedAI.broadcastToStream(streamId, 'chapter_planning', {
        chapter: chapterNumber,
        title: chapterOutline.title
      });

      console.log(`✍️  Writing Chapter ${chapterNumber}: ${chapterOutline.title} for stream: ${streamId}`);
      advancedAI.broadcastToStream(streamId, 'chapter_writing', {
        chapter: chapterNumber,
        title: chapterOutline.title
      });

      try {
        console.log(`🎯 Generating Chapter ${chapterNumber} with targets:`, {
          title: chapterOutline.title,
          targetLength: stream.storyData.targetChapterLength,
          variance: stream.storyData.chapterVariance,
          minWords: stream.storyData.targetChapterLength - (stream.storyData.chapterVariance || 300),
          maxWords: stream.storyData.targetChapterLength + (stream.storyData.chapterVariance || 300)
        });
        
        const chapter = await advancedAI.generateChapterAdvanced({
          chapterNumber,
          chapterOutline,
          storyData: stream.storyData,
          previousChapters: chapters,
          onProgress: (message) => {
            console.log(`📝 Chapter ${chapterNumber} progress: ${message}`);
            advancedAI.broadcastToStream(streamId, 'process_update', { message });
          }
        });

        chapters.push(chapter);
        console.log(`✅ Chapter ${chapterNumber} completed (${chapter.wordCount} words) for stream: ${streamId}`);

        // Calculate actual vs target for monitoring
        const targetLength = stream.storyData.targetChapterLength;
        const variance = stream.storyData.chapterVariance || 300;
        const withinTarget = chapter.wordCount >= (targetLength - variance) && chapter.wordCount <= (targetLength + variance);
        console.log(`📊 Chapter ${chapterNumber} word analysis: ${chapter.wordCount}/${targetLength} words (${withinTarget ? '✅ within target' : '⚠️ off target'})`);

        advancedAI.broadcastToStream(streamId, 'chapter_complete', {
          chapter: chapterNumber,
          title: chapter.title,
          wordCount: chapter.wordCount,
          progress: (chapterNumber / totalChapters) * 100
        });

        // Small delay for streaming effect
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (chapterError) {
        console.error(`❌ Error generating Chapter ${chapterNumber} for stream ${streamId}:`, chapterError);
        advancedAI.broadcastToStream(streamId, 'error', { 
          error: `Chapter ${chapterNumber} generation failed: ${chapterError.message}` 
        });
        return;
      }
    }

    const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    console.log(`✅ Advanced streaming generation completed for stream ${streamId}: ${chapters.length} chapters, ${totalWords} words`);
    advancedAI.broadcastToStream(streamId, 'complete', {
      title: stream.storyData.title,
      chapters: chapters,
      totalChapters: chapters.length,
      totalWords: totalWords
    });

    console.log(`✅ Advanced streaming generation completed: ${streamId}`);

  } catch (error) {
    console.error(`❌ Advanced streaming generation error for ${streamId}:`, error);
    console.error(`❌ Error stack:`, error.stack);
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
