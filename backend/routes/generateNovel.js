import express from 'express';
import AIService from '../services/ai.js';

const router = express.Router();

// Quick novel generation with basic parameters
router.post('/generateNovel', async (req, res) => {
  try {
    const { synopsis, genre, subgenre, wordCount, chapterCount } = req.body;

    // Validate required fields
    if (!synopsis || !genre || !wordCount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Synopsis, genre, and word count are required' 
      });
    }

    // Validate word count
    if (wordCount < 1000 || wordCount > 200000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Word count must be between 1,000 and 200,000' 
      });
    }

    // Generate analysis only for quick generation
    const analysisParams = {
      synopsis,
      genre: genre.toUpperCase(),
      subgenre: subgenre || '',
      wordCount,
      chapterLength: 'medium',
      chapterCount: chapterCount || 'auto',
      conflictStructure: null,
      useRomanceTemplate: false,
      selectedRomanceTemplate: null
    };

    const analysis = await AIService.generateAnalysis(analysisParams);

    res.json({
      success: true,
      analysis,
      message: 'Novel structure generated successfully. Use Auto Generate for full novel creation.'
    });

  } catch (error) {
    console.error('Quick generate error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate novel structure',
      message: error.message 
    });
  }
});

export default router;
