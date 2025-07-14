import express from 'express';
import AIService from '../services/ai.js';

const router = express.Router();

// Streaming novel generation endpoint
router.post('/streamGeneration', async (req, res) => {
  try {
    const { type, ...params } = req.body;

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendEvent = (eventType, data) => {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      if (type === 'analysis') {
        sendEvent('status', { message: 'Generating novel analysis...', progress: 0 });
        
        const analysis = await AIService.generateAnalysis(params);
        
        sendEvent('analysis', { analysis });
        sendEvent('complete', { message: 'Analysis complete' });
        
      } else if (type === 'chapter') {
        sendEvent('status', { message: `Generating chapter ${params.chapterNumber}...`, progress: 0 });
        
        const chapter = await AIService.generateChapter(params);
        
        sendEvent('chapter', { 
          number: params.chapterNumber,
          title: params.chapterTitle,
          content: chapter 
        });
        sendEvent('complete', { message: 'Chapter complete' });
        
      } else {
        sendEvent('error', { error: 'Invalid generation type' });
      }
    } catch (error) {
      console.error('Streaming generation error:', error);
      sendEvent('error', { error: error.message });
    }

    res.end();

  } catch (error) {
    console.error('Stream setup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to setup streaming generation',
      message: error.message 
    });
  }
});

export default router;
