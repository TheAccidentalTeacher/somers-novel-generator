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

// Legacy compatibility
router.post('/simple', async (req, res) => {
  const { premise, genre, wordCount, chapterCount } = req.body;
  
  const settings = {
    genre: genre || 'fantasy',
    wordCount: wordCount || 50000,
    chapterCount: chapterCount || 12
  };
  
  req.body = { premise, settings };
  
  // Forward to main endpoint
  return router.handle({ ...req, url: '/full-novel' }, res);
});

export default router;

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`AI service failed: ${error.message}`);
    }
  }
}

// Single endpoint for all outline generation
router.post('/', async (req, res) => {
  try {
    const { premise, storyType } = req.body;

    // Simple validation
    if (!premise || premise.trim().length < 50) {
      return res.status(400).json({ 
        success: false, 
        error: 'Premise must be at least 50 characters long' 
      });
    }

    if (premise.length > 50000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Premise is too long. Please keep it under 50,000 characters.' 
      });
    }

    console.log(`📝 Generating outline for ${premise.length} character premise...`);
    
    const aiService = new SimpleAIService();
    const outline = await aiService.createOutline(premise, storyType || 'fantasy');

    console.log(`✅ Generated ${outline.length} chapters successfully`);

    res.json({
      success: true,
      outline,
      characterCount: premise.length,
      chapterCount: outline.length,
      message: 'Outline generated successfully'
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to generate outline',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
