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
