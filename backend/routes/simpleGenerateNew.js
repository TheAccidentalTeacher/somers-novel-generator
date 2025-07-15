import express from 'express';
import SimpleNovelGenerator from '../services/simpleNovelGenerator.js';

const router = express.Router();
const generator = new SimpleNovelGenerator();

/**
 * Simple Novel Generation API - Clean Foundation for Iteration
 */

// Main endpoint: Generate complete novel
router.post('/full-novel', async (req, res) => {
  try {
    const { premise, settings = {} } = req.body;
    
    if (!premise) {
      return res.status(400).json({
        success: false,
        error: 'Premise is required'
      });
    }
    
    const result = await generator.generateFullNovel(premise, settings);
    
    if (result.success) {
      res.json({
        success: true,
        outline: result.outline,
        chapters: result.chapters,
        fullNovel: result.fullNovel,
        stats: result.stats,
        message: 'Novel generated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Novel generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate just outline (for testing/iteration)
router.post('/outline', async (req, res) => {
  try {
    const { premise, settings = {} } = req.body;
    
    if (!premise) {
      return res.status(400).json({ 
        success: false, 
        error: 'Premise is required' 
      });
    }
    
    const outline = await generator.generateOutline(premise, settings);
    
    res.json({
      success: true,
      outline: outline
    });
    
  } catch (error) {
    console.error('Outline error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate single chapter
router.post('/chapter', async (req, res) => {
  try {
    const { chapterOutline, context = {} } = req.body;
    
    if (!chapterOutline) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chapter outline is required' 
      });
    }
    
    const chapter = await generator.generateChapter(chapterOutline, context);
    
    res.json({
      success: true,
      chapter: chapter
    });
    
  } catch (error) {
    console.error('Chapter error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// NEW: Live streaming endpoints
const activeStreams = new Map(); // Store active streaming sessions

// Start streaming generation
router.post('/stream-start', async (req, res) => {
  try {
    const { outline, settings = {} } = req.body;
    
    if (!outline || !Array.isArray(outline)) {
      return res.status(400).json({
        success: false,
        error: 'Valid outline array is required'
      });
    }
    
    // Generate unique stream ID
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store stream data
    activeStreams.set(streamId, {
      outline,
      settings,
      status: 'ready',
      currentChapter: 0,
      chapters: [],
      startTime: new Date().toISOString()
    });
    
    console.log(`📡 Stream started: ${streamId} for ${outline.length} chapters`);
    
    res.json({
      success: true,
      streamId,
      totalChapters: outline.length,
      message: 'Stream ready to begin'
    });
    
  } catch (error) {
    console.error('Stream start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Server-Sent Events stream for chapter generation
router.get('/stream/:streamId', async (req, res) => {
  const { streamId } = req.params;
  
  // Set up SSE headers with proper CORS for credentials
  const origin = req.headers.origin || 'https://somers-novel-writer.netlify.app';
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': origin, // Specific origin instead of wildcard
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  const streamData = activeStreams.get(streamId);
  
  if (!streamData) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream not found' })}\n\n`);
    res.end();
    return;
  }
  
  console.log(`🎥 Client connected to stream: ${streamId}`);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    message: 'Stream connected',
    totalChapters: streamData.outline.length 
  })}\n\n`);
  
  // Start generating chapters
  streamData.status = 'generating';
  generateChaptersStream(streamId, streamData, res);
  
  // Handle client disconnect
  req.on('close', () => {
    console.log(`🔌 Client disconnected from stream: ${streamId}`);
    activeStreams.delete(streamId);
  });
});

// Function to generate chapters with streaming
async function generateChaptersStream(streamId, streamData, res) {
  try {
    for (let i = 0; i < streamData.outline.length; i++) {
      const chapterOutline = streamData.outline[i];
      
      // Send chapter start event
      res.write(`data: ${JSON.stringify({
        type: 'chapter_start',
        chapterNumber: i + 1,
        chapterTitle: chapterOutline.title,
        progress: Math.round((i / streamData.outline.length) * 100)
      })}\n\n`);
      
      try {
        // Generate chapter content
        const chapter = await generator.generateChapter(chapterOutline, {
          previousChapters: streamData.chapters,
          fullPremise: streamData.settings.premise || '',
          genre: streamData.settings.genre || 'fantasy'
        });
        
        // Store completed chapter
        const completedChapter = {
          ...chapter,
          number: i + 1,
          title: chapterOutline.title
        };
        streamData.chapters.push(completedChapter);
        
        // Send chapter completion event
        res.write(`data: ${JSON.stringify({
          type: 'chapter_complete',
          chapterNumber: i + 1,
          chapter: completedChapter,
          progress: Math.round(((i + 1) / streamData.outline.length) * 100),
          wordCount: chapter.wordCount || 0
        })}\n\n`);
        
      } catch (chapterError) {
        // Send chapter error event
        res.write(`data: ${JSON.stringify({
          type: 'chapter_error',
          chapterNumber: i + 1,
          error: chapterError.message,
          progress: Math.round(((i + 1) / streamData.outline.length) * 100)
        })}\n\n`);
      }
      
      // Small delay between chapters
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      message: 'Novel generation complete!',
      totalChapters: streamData.chapters.length,
      totalWords: streamData.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0),
      progress: 100
    })}\n\n`);
    
    // Keep stream alive for a bit then close
    setTimeout(() => {
      res.end();
      activeStreams.delete(streamId);
    }, 5000);
    
  } catch (error) {
    console.error('Stream generation error:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
    res.end();
    activeStreams.delete(streamId);
  }
}

// Legacy compatibility endpoint
router.post('/simple', async (req, res) => {
  try {
    const { premise, genre, wordCount, chapterCount } = req.body;
    
    const settings = {
      genre: genre || 'fantasy',
      wordCount: wordCount || 50000,
      chapterCount: chapterCount || 12
    };
    
    const result = await generator.generateFullNovel(premise, settings);
    
    if (result.success) {
      res.json({
        success: true,
        outline: result.outline,
        chapters: result.chapters,
        fullNovel: result.fullNovel,
        stats: result.stats
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Legacy simple generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
