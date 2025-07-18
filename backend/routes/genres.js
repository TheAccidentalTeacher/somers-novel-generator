import express from 'express';
import { getAvailableGenres, getGenreInstructions } from '../services/genreInstructions.js';

const router = express.Router();

// Get all available genres and subgenres
router.get('/genres', (req, res) => {
  try {
    const genres = getAvailableGenres();
    res.json({
      success: true,
      data: genres
    });
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch genre information'
    });
  }
});

// Get specific genre instructions
router.get('/genres/:genre/:subgenre/instructions', (req, res) => {
  try {
    const { genre, subgenre } = req.params;
    const instructions = getGenreInstructions(genre, subgenre);
    
    if (!instructions) {
      return res.status(404).json({
        success: false,
        error: 'Genre or subgenre not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        genre,
        subgenre,
        instructions
      }
    });
  } catch (error) {
    console.error('Error fetching genre instructions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch genre instructions'
    });
  }
});

export default router;
