import express from 'express';
import advancedAI from '../services/advancedAI.js';

const router = express.Router();

// Create outline endpoint
router.post('/createOutline', async (req, res) => {
  try {
    console.log('📋 Creating outline...');
    
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

    // Validate required fields with proper types and ranges
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required and must be a non-empty string'
      });
    }
    
    if (!genre || typeof genre !== 'string' || genre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Genre is required and must be a non-empty string'
      });
    }
    
    if (!synopsis || typeof synopsis !== 'string' || synopsis.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Synopsis is required and must be at least 10 characters'
      });
    }
    
    if (!chapters || !Number.isInteger(chapters) || chapters < 1 || chapters > 100) {
      return res.status(400).json({
        success: false,
        error: 'Chapters must be an integer between 1 and 100'
      });
    }
    
    if (wordCount && (!Number.isInteger(wordCount) || wordCount < 1000 || wordCount > 500000)) {
      return res.status(400).json({
        success: false,
        error: 'Word count must be an integer between 1,000 and 500,000'
      });
    }

    if (!advancedAI.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured. Please check OpenAI API key.'
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

// Quick novel generation endpoint (compatibility)
router.post('/generateNovel', async (req, res) => {
  try {
    console.log('⚡ Quick novel generation...');
    
    const {
      synopsis,
      genre,
      subgenre,
      wordCount,
      chapterCount
    } = req.body;

    // Validate required fields
    if (!synopsis || typeof synopsis !== 'string' || synopsis.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Synopsis is required and must be at least 10 characters'
      });
    }
    
    if (!genre || typeof genre !== 'string' || genre.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Genre is required'
      });
    }

    if (!advancedAI.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured. Please check OpenAI API key.'
      });
    }

    // Create basic story data for quick generation
    const storyData = {
      title: 'Generated Novel',
      genre,
      subgenre: subgenre || genre,
      synopsis,
      wordCount: wordCount || 50000,
      chapters: chapterCount || 20,
      targetChapterLength: Math.floor((wordCount || 50000) / (chapterCount || 20)),
      fictionLength: 'novella'
    };

    console.log(`Quick generating: ${storyData.chapters} chapters, ${storyData.wordCount} words`);

    // Create outline first
    const outline = await advancedAI.createOutline(storyData);

    res.json({
      success: true,
      analysis: `Quick outline created with ${outline.length} chapters`,
      outline: outline,
      message: `Ready to generate ${outline.length} chapters`
    });

  } catch (error) {
    console.error('❌ Quick generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auto generation endpoint (starts background job)
router.post('/autoGenerateNovel', async (req, res) => {
  try {
    console.log('🤖 Auto generation starting...');
    
    const { mode, jobId, synopsis, genre, subgenre, wordCount, chapterCount, conflictStructure, chapterLength, useRomanceTemplate, selectedRomanceTemplate, primaryConflictType, useBatch } = req.body;

    // Handle status check mode
    if (mode === 'check' && jobId) {
      const job = advancedAI.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      return res.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentProcess,
        analysis: job.analysis || '',
        chapters: job.result?.chapters || [],
        fullNovel: job.result ? job.result.chapters?.map(ch => ch.content).join('\n\n') : '',
        conflictStructure: conflictStructure || {},
        errors: job.error ? [job.error] : [],
        createdAt: job.startTime?.toISOString() || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: job.status === 'completed' ? new Date().toISOString() : null
      });
    }

    // Handle start mode
    if (mode === 'start') {
      if (!synopsis || !genre) {
        return res.status(400).json({
          success: false,
          error: 'Synopsis and genre are required'
        });
      }

      if (!advancedAI.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'AI service not configured. Please check OpenAI API key.'
        });
      }

      // Create story data
      const storyData = {
        title: 'Auto Generated Novel',
        genre,
        subgenre: subgenre || genre,
        synopsis,
        wordCount: wordCount || 50000,
        chapters: chapterCount || 20,
        targetChapterLength: Math.floor((wordCount || 50000) / (chapterCount || 20)),
        fictionLength: wordCount > 80000 ? 'novel' : 'novella',
        conflictStructure,
        useRomanceTemplate,
        selectedRomanceTemplate,
        primaryConflictType
      };

      // Create job
      const newJobId = advancedAI.createJob(storyData, { 
        chapterLength: chapterLength || 'medium',
        useBatch: useBatch !== false 
      });
      
      console.log(`🤖 Auto generation job created: ${newJobId}`);

      // Start processing asynchronously
      advancedAI.processAdvancedGeneration(newJobId).catch(error => {
        console.error(`Auto job ${newJobId} processing error:`, error);
        advancedAI.updateJob(newJobId, {
          status: 'failed',
          error: error.message,
          currentProcess: 'Generation failed'
        });
      });

      return res.json({
        success: true,
        jobId: newJobId,
        message: 'Auto generation started',
        estimatedCompletion: new Date(Date.now() + 30 * 60000).toISOString() // 30 minutes
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid mode. Use "start" or "check"'
    });

  } catch (error) {
    console.error('❌ Auto generation error:', error);
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

    // Enhanced validation for story data
    if (!storyData || typeof storyData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Story data is required and must be an object'
      });
    }
    
    if (!storyData.title || typeof storyData.title !== 'string' || storyData.title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Story title is required and must be a non-empty string'
      });
    }
    
    if (!storyData.synopsis || typeof storyData.synopsis !== 'string' || storyData.synopsis.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Story synopsis is required and must be at least 10 characters'
      });
    }

    if (!advancedAI.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured. Please check OpenAI API key.'
      });
    }

    // Create job
    const jobId = advancedAI.createJob(storyData, preferences);
    
    console.log(`📝 Advanced generation job created: ${jobId}`);

    // Start processing asynchronously with proper error handling
    advancedAI.processAdvancedGeneration(jobId).catch(error => {
      console.error(`Job ${jobId} processing error:`, error);
      // Ensure job status is updated on failure
      advancedAI.updateJob(jobId, {
        status: 'failed',
        error: error.message,
        currentProcess: 'Generation failed'
      });
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

// Get advanced generation job status with validation
router.get('/advancedGeneration/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Validate job ID format (simple validation for single user)
    if (!jobId || typeof jobId !== 'string' || jobId.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid job ID is required'
      });
    }
    
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
        progress: job.progress || 0,
        chaptersCompleted: job.chaptersCompleted || 0,
        currentChapter: job.currentChapter || 0,
        currentProcess: job.currentProcess || 'Processing...',
        logs: job.logs || [],
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

// Cancel advanced generation job with validation
router.delete('/advancedGeneration/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Validate job ID format
    if (!jobId || typeof jobId !== 'string' || jobId.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid job ID is required'
      });
    }
    
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

    // Enhanced validation for streaming story data
    if (!storyData || typeof storyData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Story data is required and must be an object'
      });
    }
    
    if (!storyData.title || typeof storyData.title !== 'string' || storyData.title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Story title is required and must be a non-empty string'
      });
    }
    
    if (!storyData.synopsis || typeof storyData.synopsis !== 'string' || storyData.synopsis.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Story synopsis is required and must be at least 10 characters'
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

    // Start processing asynchronously with better error handling
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

// Advanced streaming SSE endpoint with validation
router.get('/advancedStreamGeneration/:streamId', (req, res) => {
  const { streamId } = req.params;
  
  // Validate stream ID
  if (!streamId || typeof streamId !== 'string' || streamId.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Valid stream ID is required'
    });
  }
  
  console.log(`📡 Client connected to advanced stream: ${streamId}`);

  // Set up SSE headers (simplified for single user)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Add client to stream
  advancedAI.addStreamClient(streamId, res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', streamId })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`📡 Client disconnected from advanced stream: ${streamId}`);
    advancedAI.removeStreamClient(streamId, res);
  });
});

// Advanced streaming processing function with timeout protection
async function processAdvancedStream(streamId) {
  const stream = advancedAI.getStream(streamId);
  if (!stream) {
    console.error(`Stream ${streamId} not found`);
    return;
  }

  // Set timeout for stream (30 minutes max)
  const STREAM_TIMEOUT = 30 * 60 * 1000;
  const timeoutId = setTimeout(() => {
    console.log(`⏰ Stream ${streamId} timed out`);
    advancedAI.broadcastToStream(streamId, 'error', { 
      error: 'Stream timed out after 30 minutes' 
    });
  }, STREAM_TIMEOUT);

  try {
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

      console.log(`🚀 Starting Chapter ${chapterNumber}: ${chapterOutline.title}`);

      advancedAI.broadcastToStream(streamId, 'chapter_planning', {
        chapter: chapterNumber,
        title: chapterOutline.title
      });

      advancedAI.broadcastToStream(streamId, 'chapter_writing', {
        chapter: chapterNumber,
        title: chapterOutline.title
      });

      let chapter;
      try {
        chapter = await advancedAI.generateChapterAdvanced({
          chapterNumber,
          chapterOutline,
          storyData: stream.storyData,
          previousChapters: chapters,
          onProgress: (message) => {
            advancedAI.broadcastToStream(streamId, 'process_update', { message });
          }
        });
      } catch (chapterError) {
        console.error(`❌ Chapter ${chapterNumber} generation failed:`, chapterError);
        advancedAI.broadcastToStream(streamId, 'error', { 
          error: `Chapter ${chapterNumber} generation failed: ${chapterError.message}` 
        });
        throw chapterError; // Re-throw to be caught by outer try-catch
      }

      // Check if chapter meets word count requirements and retry if needed
      const targetWordCount = stream.storyData.targetChapterLength || 1500;
      const minWordCount = targetWordCount * 0.75; // 75% of target minimum
      const maxRetries = 2;
      let retryCount = 0;

      while (chapter.wordCount < minWordCount && retryCount < maxRetries) {
        retryCount++;
        console.log(`⚠️ Chapter ${chapterNumber} word count too low: ${chapter.wordCount} words (target: ${targetWordCount}). Retry ${retryCount}/${maxRetries}`);
        
        advancedAI.broadcastToStream(streamId, 'process_update', { 
          message: `Chapter ${chapterNumber} too short (${chapter.wordCount} words), regenerating to meet ${targetWordCount} word target...` 
        });

        try {
          chapter = await advancedAI.generateChapterAdvanced({
            chapterNumber,
            chapterOutline,
            storyData: stream.storyData,
            previousChapters: chapters,
            isRetry: true,
            previousWordCount: chapter.wordCount,
            targetWordCount: targetWordCount,
            onProgress: (message) => {
              advancedAI.broadcastToStream(streamId, 'process_update', { message });
            }
          });
        } catch (retryError) {
          console.error(`❌ Chapter ${chapterNumber} retry ${retryCount} failed:`, retryError);
          advancedAI.broadcastToStream(streamId, 'process_update', { 
            message: `Chapter ${chapterNumber} retry ${retryCount} failed: ${retryError.message}. Proceeding with previous version...` 
          });
          break; // Exit retry loop if generation fails
        }
      }

      if (chapter.wordCount < minWordCount) {
        console.log(`⚠️ Chapter ${chapterNumber} still under target after ${maxRetries} retries: ${chapter.wordCount} words`);
        advancedAI.broadcastToStream(streamId, 'process_update', { 
          message: `Chapter ${chapterNumber} completed at ${chapter.wordCount} words (below target but proceeding)` 
        });
      }

      chapters.push(chapter);

      console.log(`✅ Chapter ${chapterNumber} completed: ${chapter.wordCount} words`);

      advancedAI.broadcastToStream(streamId, 'chapter_complete', {
        chapter: chapterNumber,
        title: chapter.title,
        wordCount: chapter.wordCount,
        targetWordCount: targetWordCount,
        onTarget: chapter.wordCount >= minWordCount,
        progress: (chapterNumber / totalChapters) * 100
      });

      // Reduce delay for single user (no rate limiting needed)
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`⏱️ Moving to next chapter (${chapterNumber + 1}/${totalChapters})`);
    }

    const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

    advancedAI.broadcastToStream(streamId, 'complete', {
      title: stream.storyData.title,
      chapters: chapters,
      totalChapters: chapters.length,
      totalWords: totalWords
    });

    console.log(`✅ Advanced streaming generation completed: ${streamId}`);
    clearTimeout(timeoutId); // Clear timeout on success

  } catch (error) {
    console.error(`❌ Advanced streaming generation error:`, error);
    clearTimeout(timeoutId); // Clear timeout on error
    advancedAI.broadcastToStream(streamId, 'error', { error: error.message });
  }
}



export default router;
