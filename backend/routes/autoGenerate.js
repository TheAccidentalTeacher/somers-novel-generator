import express from 'express';
import AIService from '../services/ai.js';
import ConflictService from '../services/conflict.js';

const router = express.Router();

// In-memory job storage (in production, use Redis or database)
const jobs = new Map();

// Generate unique job ID
function generateJobId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Start background novel generation
router.post('/autoGenerateNovel', async (req, res) => {
  try {
    const { mode } = req.body;

    if (mode === 'start') {
      return await handleStartGeneration(req, res);
    } else if (mode === 'check') {
      return await handleCheckStatus(req, res);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid mode. Use "start" or "check"' 
      });
    }
  } catch (error) {
    console.error('Auto generate error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

async function handleStartGeneration(req, res) {
  const {
    synopsis,
    genre,
    subgenre,
    wordCount,
    conflictStructure,
    chapterLength,
    chapterCount,
    useRomanceTemplate,
    selectedRomanceTemplate,
    primaryConflictType,
    useBatch
  } = req.body;

  // Validate required fields
  if (!synopsis || !genre || !wordCount) {
    return res.status(400).json({ 
      success: false, 
      error: 'Synopsis, genre, and word count are required' 
    });
  }

  // Validate conflict structure if provided
  if (conflictStructure) {
    const validationErrors = ConflictService.validateConflictStructure(conflictStructure);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid conflict structure',
        details: validationErrors
      });
    }
  }

  const jobId = generateJobId();
  const job = {
    id: jobId,
    status: 'pending',
    progress: 0,
    currentStep: 'Initializing generation',
    
    // Input parameters
    synopsis,
    genre,
    subgenre,
    wordCount,
    conflictStructure: ConflictService.processConflictStructure(conflictStructure, genre, subgenre),
    chapterLength: chapterLength || 'medium',
    chapterCount: chapterCount || 'auto',
    useRomanceTemplate: useRomanceTemplate || false,
    selectedRomanceTemplate: selectedRomanceTemplate || 'ALANA_TERRY_CLASSIC',
    primaryConflictType,
    useBatch: useBatch || false,
    
    // Results
    analysis: '',
    chapters: [],
    fullNovel: '',
    errors: [],
    
    // Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  };

  jobs.set(jobId, job);

  // Start background generation
  generateNovelBackground(jobId).catch(error => {
    console.error(`Background generation failed for job ${jobId}:`, error);
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.errors.push(error.message);
      job.updatedAt = new Date().toISOString();
    }
  });

  res.json({
    success: true,
    jobId,
    message: 'Novel generation started',
    estimatedCompletion: calculateEstimatedCompletion(wordCount, chapterCount)
  });
}

async function handleCheckStatus(req, res) {
  const { jobId } = req.body;
  
  if (!jobId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Job ID is required' 
    });
  }

  const job = jobs.get(jobId);
  if (!job) {
    return res.status(404).json({ 
      success: false, 
      error: 'Job not found' 
    });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    currentStep: job.currentStep,
    analysis: job.analysis,
    chapters: job.chapters,
    fullNovel: job.fullNovel,
    conflictStructure: job.conflictStructure,
    errors: job.errors,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt
  });
}

async function generateNovelBackground(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    // Step 1: Generate analysis
    job.status = 'analysis';
    job.currentStep = 'Analyzing synopsis and creating novel structure';
    job.progress = 10;
    job.updatedAt = new Date().toISOString();

    const analysisParams = {
      synopsis: job.synopsis,
      genre: job.genre,
      wordCount: job.wordCount,
      chapterLength: job.chapterLength,
      chapterCount: job.chapterCount,
      conflictStructure: job.conflictStructure,
      useRomanceTemplate: job.useRomanceTemplate,
      selectedRomanceTemplate: job.selectedRomanceTemplate
    };

    job.analysis = await AIService.generateAnalysis(analysisParams);
    job.progress = 25;
    job.updatedAt = new Date().toISOString();

    // Step 2: Extract chapters from analysis
    job.currentStep = 'Processing chapter structure';
    const extractedChapters = ConflictService.extractChaptersFromAnalysis(job.analysis);
    
    if (extractedChapters.length === 0) {
      throw new Error('No chapters could be extracted from analysis');
    }

    job.progress = 30;
    job.updatedAt = new Date().toISOString();

    // Step 3: Generate chapters
    job.status = 'generating';
    const totalChapters = extractedChapters.length;
    let previousContext = job.synopsis;

    for (let i = 0; i < totalChapters; i++) {
      const chapter = extractedChapters[i];
      job.currentStep = `Generating Chapter ${chapter.number}: ${chapter.title}`;
      
      const chapterParams = {
        chapterNumber: chapter.number,
        chapterTitle: chapter.title,
        genre: job.genre,
        chapterDescription: chapter.description,
        wordCount: chapter.wordCount,
        previousContext: previousContext.slice(-2000), // Keep last 2000 chars for context
        conflictStructure: job.conflictStructure,
        useRomanceTemplate: job.useRomanceTemplate,
        selectedRomanceTemplate: job.selectedRomanceTemplate
      };

      try {
        const chapterContent = await AIService.generateChapter(chapterParams);
        
        const generatedChapter = {
          number: chapter.number,
          title: chapter.title,
          content: chapterContent,
          wordCount: chapterContent.split(' ').length,
          generatedAt: new Date().toISOString()
        };

        job.chapters.push(generatedChapter);
        previousContext += ' ' + chapterContent;
        
        // Update progress
        job.progress = 30 + ((i + 1) / totalChapters) * 60;
        job.updatedAt = new Date().toISOString();

      } catch (error) {
        console.error(`Error generating chapter ${chapter.number}:`, error);
        job.errors.push(`Chapter ${chapter.number}: ${error.message}`);
        
        // Continue with next chapter
        job.chapters.push({
          number: chapter.number,
          title: chapter.title,
          content: `[Error generating chapter: ${error.message}]`,
          wordCount: 0,
          error: error.message,
          generatedAt: new Date().toISOString()
        });
      }
    }

    // Step 4: Combine into full novel
    job.currentStep = 'Finalizing novel';
    job.fullNovel = job.chapters
      .map(ch => `# Chapter ${ch.number}: ${ch.title}\n\n${ch.content}`)
      .join('\n\n---\n\n');

    job.status = 'completed';
    job.progress = 100;
    job.currentStep = 'Novel generation completed';
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();

  } catch (error) {
    console.error(`Novel generation failed for job ${jobId}:`, error);
    job.status = 'error';
    job.errors.push(error.message);
    job.updatedAt = new Date().toISOString();
  }
}

function calculateEstimatedCompletion(wordCount, chapterCount) {
  // Rough estimation: 1 minute per 1000 words + processing time
  const baseMinutes = Math.ceil(wordCount / 1000);
  const processingMinutes = 5; // For analysis and processing
  const totalMinutes = baseMinutes + processingMinutes;
  
  const completionTime = new Date();
  completionTime.setMinutes(completionTime.getMinutes() + totalMinutes);
  
  return completionTime.toISOString();
}

export default router;
