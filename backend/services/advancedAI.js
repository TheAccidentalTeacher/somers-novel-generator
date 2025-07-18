import OpenAI from 'openai';

class AdvancedAIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  OpenAI API key not configured. Advanced AI services will not be available.');
      this.openai = null;
    } else {
      console.log('✅ Advanced AI Service initialized successfully - v2.0 (2025-07-14)');
      this.openai = new OpenAI({
        apiKey: apiKey,
        timeout: 120000, // 2 minutes timeout for API calls
        maxRetries: 3,
      });
    }
    
    // Job storage (in production, use Redis or database)
    this.jobs = new Map();
    this.streams = new Map();
    
    // Add cleanup interval to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, 60000); // Cleanup every minute
  }

  // Cleanup old completed jobs to prevent memory leaks
  cleanupOldJobs() {
    const now = Date.now();
    const CLEANUP_AGE = 2 * 60 * 60 * 1000; // 2 hours
    
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        const jobAge = now - job.startTime.getTime();
        if (jobAge > CLEANUP_AGE) {
          console.log(`🧹 Cleaning up old job: ${jobId}`);
          this.jobs.delete(jobId);
        }
      }
    }
  }

  isConfigured() {
    return this.openai !== null;
  }

  // Robust OpenAI API request wrapper with retry logic and error handling
  async makeOpenAIRequest(requestFn, operation = 'API call', maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 OpenAI ${operation} attempt ${attempt}/${maxRetries}`);
        
        const result = await requestFn();
        
        console.log(`✅ OpenAI ${operation} succeeded on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Log the specific error
        console.error(`❌ OpenAI ${operation} attempt ${attempt} failed:`, {
          message: error.message,
          status: error.status,
          code: error.code,
          type: error.type
        });
        
        // Handle specific error types
        if (error.status === 429) {
          // Rate limit - wait longer before retry
          const waitTime = Math.min(5000 * attempt, 30000); // Up to 30 seconds
          console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
          continue;
        }
        
        if (error.status === 401) {
          // Authentication error - don't retry
          throw new Error(`OpenAI authentication failed: ${error.message}`);
        }
        
        if (error.status === 400) {
          // Bad request - don't retry
          throw new Error(`OpenAI request error: ${error.message}`);
        }
        
        if (error.status >= 500) {
          // Server error - retry with exponential backoff
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Up to 10 seconds
          console.log(`⏳ Server error, waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
          continue;
        }
        
        // For other errors, wait a bit before retry
        if (attempt < maxRetries) {
          const waitTime = 2000 * attempt;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
        }
      }
    }
    
    // All retries failed
    throw new Error(`${operation} failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate detailed outline from synopsis using GPT-4
  async createOutline(storyData) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const { title, genre, subgenre, genreInstructions, wordCount, chapters, targetChapterLength, synopsis, fictionLength } = storyData;

    const outlinePrompt = `You are a master storyteller and novel architect. Create a detailed chapter-by-chapter outline for a ${fictionLength} length ${genre} novel.

STORY DETAILS:
- Title: ${title}
- Genre: ${genre} (${subgenre})
- Total Word Count: ${wordCount.toLocaleString()}
- Number of Chapters: ${chapters}
- Target Chapter Length: ${targetChapterLength} words each
- Synopsis: ${synopsis}

GENRE GUIDELINES:
${genreInstructions}

REQUIREMENTS:
1. Create exactly ${chapters} chapter outlines
2. Each chapter outline should describe events and scenes substantial enough to fill ${targetChapterLength} words when written as full prose
3. Ensure proper story pacing and structure for ${fictionLength}
4. Include character development arcs
5. Build tension and conflicts appropriately
6. Follow genre conventions for ${genre}
7. Each chapter should have clear objectives and emotional beats

OUTPUT FORMAT:
Return a JSON array with this exact structure:
[
  {
    "title": "Chapter Title",
    "summary": "Brief but detailed chapter summary (2-3 sentences) describing the key events, character developments, conflicts, and emotional beats. Focus on WHAT HAPPENS in the chapter, not how long it should be."
  }
]

Be creative, engaging, and ensure each chapter builds toward a satisfying conclusion. The outline should feel like a complete, well-structured story.`;

    try {
      console.log(`🎯 Creating outline for "${title}" - ${chapters} chapters`);
      
      const response = await this.makeOpenAIRequest(async () => {
        return await this.openai.chat.completions.create({
          model: 'gpt-4o', // Use GPT-4 for best logical reasoning
          messages: [{ role: 'user', content: outlinePrompt }],
          max_tokens: 4000,
          temperature: 0.3, // Lower temperature for more structured outline
        });
      }, 'outline creation');

      const content = response.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Could not parse outline JSON from AI response');
      }

      const outline = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(outline) || outline.length !== chapters) {
        throw new Error(`Expected ${chapters} chapters, got ${outline.length}`);
      }

      return outline;
    } catch (error) {
      console.error('Error creating outline:', error);
      throw new Error(`Outline creation failed: ${error.message}`);
    }
  }

  // Advanced iterative chapter generation
  async generateChapterAdvanced(params) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      chapterNumber,
      chapterOutline,
      storyData,
      previousChapters = [],
      onProgress,
      isRetry = false,
      previousWordCount = null,
      targetWordCount = null
    } = params;

    const { title, genre, subgenre, genreInstructions, synopsis, targetChapterLength, chapterVariance } = storyData;
    
    // Use provided target or default to story settings
    const actualTargetLength = targetWordCount || targetChapterLength;
    const actualVariance = chapterVariance || Math.floor(actualTargetLength * 0.15); // 15% variance default
    
    // Calculate target word range with stricter enforcement for retries
    const minWords = isRetry ? actualTargetLength * 0.90 : actualTargetLength - actualVariance; // 90% minimum on retry
    const maxWords = actualTargetLength + actualVariance;

    // Create context from previous chapters (summarize if too long)
    let previousContext = '';
    if (previousChapters.length > 0) {
      if (previousChapters.length <= 3) {
        // Include full text for recent chapters
        previousContext = previousChapters.map((ch, idx) => 
          `CHAPTER ${idx + 1}: ${ch.title}\n${ch.content}\n`
        ).join('\n---\n\n');
      } else {
        // Summarize older chapters, include full text for last 2
        const olderChapters = previousChapters.slice(0, -2);
        const recentChapters = previousChapters.slice(-2);
        
        const olderSummary = olderChapters.map((ch, idx) => 
          `CHAPTER ${idx + 1}: ${ch.title}\nSummary: ${ch.summary || ch.content.substring(0, 300)}...`
        ).join('\n\n');

        const recentFull = recentChapters.map((ch, idx) => 
          `CHAPTER ${previousChapters.length - 1 + idx}: ${ch.title}\n${ch.content}`
        ).join('\n---\n\n');

        previousContext = `PREVIOUS CHAPTERS SUMMARY:\n${olderSummary}\n\n---\n\nRECENT CHAPTERS (FULL TEXT):\n${recentFull}`;
      }
    }

    if (onProgress) onProgress(`Planning Chapter ${chapterNumber}: ${chapterOutline.title}`);

    // Build retry context if this is a retry attempt
    let retryInstructions = '';
    if (isRetry && previousWordCount) {
      retryInstructions = `

⚠️ RETRY NOTICE: The previous attempt produced only ${previousWordCount} words, which was too short.
CRITICAL: This chapter MUST be at least ${minWords} words. Aim for exactly ${actualTargetLength} words.
- Expand scenes with more detail and dialogue
- Add more character development and internal thoughts
- Include richer descriptions and world-building
- Ensure complete story beats are fully developed`;
    }

    const chapterPrompt = `You are a master novelist writing Chapter ${chapterNumber} of "${title}".

STORY OVERVIEW:
- Genre: ${genre} (${subgenre})
- Synopsis: ${synopsis}

GENRE GUIDELINES:
${genreInstructions}

CHAPTER REQUIREMENTS:
- Title: ${chapterOutline.title}
- Story Content to Include: ${chapterOutline.summary}
- CRITICAL WORD COUNT TARGET: ${actualTargetLength} words (minimum: ${minWords}, maximum: ${maxWords})
- This is Chapter ${chapterNumber} of the novel${retryInstructions}

IMPORTANT: The "Story Content to Include" above is just a brief outline. You must expand it into a full ${actualTargetLength}-word chapter with rich prose, detailed scenes, dialogue, and character development.

${previousContext ? `STORY CONTEXT (Previous Chapters):\n${previousContext}\n\n` : ''}

WRITING INSTRUCTIONS:
1. Take the brief story outline and expand it into a full-length chapter of ${actualTargetLength} words
2. Write a complete, engaging chapter that covers all events mentioned in the outline
3. Maintain consistency with previous chapters and overall story
4. Show don't tell - use vivid scenes and dialogue
5. Follow ${genre} genre conventions
6. Ensure proper pacing and emotional beats
7. CRITICAL: Target exactly ${actualTargetLength} words - this is very important!
8. End with appropriate tension/resolution for chapter position
9. Use rich, immersive prose appropriate for the genre
10. If you're under the word count, expand with:
   - More detailed scene descriptions
   - Additional dialogue and character interactions
   - Internal character thoughts and emotions
   - Richer world-building details

${isRetry ? 'REMINDER: This is a retry - the chapter MUST meet the word count requirement!' : ''}

Write the complete chapter now. Do not include chapter headers or numbering - just the prose content.`;

    try {
      if (onProgress) onProgress(`Writing Chapter ${chapterNumber}: ${chapterOutline.title}`);

      const response = await this.makeOpenAIRequest(async () => {
        return await this.openai.chat.completions.create({
          model: 'gpt-4o', // Use GPT-4 for best creative writing
          messages: [{ role: 'user', content: chapterPrompt }],
          max_tokens: Math.min(4000, Math.ceil(maxWords * 1.3)), // Increased token allocation for longer content
          temperature: isRetry ? 0.7 : 0.8, // Slightly lower temperature on retry for more focused output
        });
      }, `chapter ${chapterNumber} generation`);

      const content = response.choices[0].message.content.trim();
      const wordCount = content.split(/\s+/).length;

      // Log word count results for monitoring
      if (isRetry) {
        console.log(`🔄 Chapter ${chapterNumber} retry result: ${wordCount} words (target: ${actualTargetLength}, previous: ${previousWordCount})`);
      } else {
        console.log(`📝 Chapter ${chapterNumber} first attempt: ${wordCount} words (target: ${actualTargetLength})`);
      }

      if (wordCount < minWords) {
        console.log(`⚠️ Chapter ${chapterNumber} word count off target: ${wordCount} words (expected: ${minWords}-${maxWords})`);
      }

      return {
        title: chapterOutline.title,
        content: content,
        wordCount: wordCount,
        summary: chapterOutline.summary,
        number: chapterNumber,
        targetMet: wordCount >= minWords
      };
    } catch (error) {
      console.error(`Error generating chapter ${chapterNumber}:`, error);
      throw new Error(`Chapter ${chapterNumber} generation failed: ${error.message}`);
    }
  }

  // Create and manage generation jobs
  createJob(storyData, preferences) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job = {
      id: jobId,
      status: 'initialized',
      storyData,
      preferences,
      progress: 0,
      chaptersCompleted: 0,
      currentChapter: 1,
      chapters: [],
      logs: [],
      startTime: new Date(),
      currentProcess: 'Initializing...'
    };

    this.jobs.set(jobId, job);
    return jobId;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      this.jobs.set(jobId, job);
    }
  }

  deleteJob(jobId) {
    this.jobs.delete(jobId);
  }

  // Process a generation job with timeout protection
  async processAdvancedGeneration(jobId) {
    const job = this.getJob(jobId);
    if (!job) throw new Error('Job not found');

    // Set up timeout protection (45 minutes max)
    const GENERATION_TIMEOUT = 45 * 60 * 1000; // 45 minutes
    const timeoutId = setTimeout(() => {
      console.error(`⏰ Job ${jobId} timed out after 45 minutes`);
      this.updateJob(jobId, {
        status: 'failed',
        error: 'Generation timed out after 45 minutes',
        currentProcess: 'Timed out'
      });
    }, GENERATION_TIMEOUT);

    try {
      this.updateJob(jobId, { 
        status: 'running', 
        currentProcess: 'Creating detailed story outline...' 
      });

      // Create outline if not provided
      let outline = job.storyData.outline;
      if (!outline || outline.length === 0) {
        outline = await this.createOutline(job.storyData);
        this.updateJob(jobId, { 
          currentProcess: 'Outline created, beginning chapter generation...',
          logs: [...job.logs, { message: 'Story outline created', type: 'success', timestamp: new Date() }]
        });
      }

      const totalChapters = outline.length;
      const chapters = [];

      // Generate each chapter iteratively
      for (let i = 0; i < totalChapters; i++) {
        const chapterNumber = i + 1;
        const chapterOutline = outline[i];

        this.updateJob(jobId, {
          currentChapter: chapterNumber,
          currentProcess: `Planning Chapter ${chapterNumber}: ${chapterOutline.title}`,
          logs: [...this.getJob(jobId).logs, { 
            message: `Starting Chapter ${chapterNumber}: ${chapterOutline.title}`, 
            type: 'info', 
            timestamp: new Date() 
          }]
        });

        let chapter = await this.generateChapterAdvanced({
          chapterNumber,
          chapterOutline,
          storyData: job.storyData,
          previousChapters: chapters,
          onProgress: (message) => {
            this.updateJob(jobId, { currentProcess: message });
          }
        });

        // Check if chapter meets word count requirements and retry if needed
        const targetWordCount = job.storyData.targetChapterLength || 1500;
        const minWordCount = targetWordCount * 0.75; // 75% of target minimum
        const maxRetries = 2;
        let retryCount = 0;

        while (chapter.wordCount < minWordCount && retryCount < maxRetries) {
          retryCount++;
          console.log(`⚠️ Chapter ${chapterNumber} word count too low: ${chapter.wordCount} words (target: ${targetWordCount}). Retry ${retryCount}/${maxRetries}`);
          
          this.updateJob(jobId, {
            currentProcess: `Chapter ${chapterNumber} too short (${chapter.wordCount} words), regenerating to meet ${targetWordCount} word target...`,
            logs: [...this.getJob(jobId).logs, { 
              message: `Chapter ${chapterNumber} retry ${retryCount}/${maxRetries} - ${chapter.wordCount} words too short`, 
              type: 'warning', 
              timestamp: new Date() 
            }]
          });

          chapter = await this.generateChapterAdvanced({
            chapterNumber,
            chapterOutline,
            storyData: job.storyData,
            previousChapters: chapters,
            isRetry: true,
            previousWordCount: chapter.wordCount,
            targetWordCount: targetWordCount,
            onProgress: (message) => {
              this.updateJob(jobId, { currentProcess: message });
            }
          });
        }

        if (chapter.wordCount < minWordCount) {
          console.log(`⚠️ Chapter ${chapterNumber} still under target after ${maxRetries} retries: ${chapter.wordCount} words`);
          this.updateJob(jobId, {
            logs: [...this.getJob(jobId).logs, { 
              message: `Chapter ${chapterNumber} completed at ${chapter.wordCount} words (below target but proceeding)`, 
              type: 'warning', 
              timestamp: new Date() 
            }]
          });
        }

        chapters.push(chapter);

        const progress = (chapterNumber / totalChapters) * 100;
        this.updateJob(jobId, {
          progress,
          chaptersCompleted: chapterNumber,
          currentProcess: `Chapter ${chapterNumber} completed (${chapter.wordCount} words)`,
          logs: [...this.getJob(jobId).logs, { 
            message: `Chapter ${chapterNumber} completed (${chapter.wordCount} words)`, 
            type: 'success', 
            timestamp: new Date() 
          }]
        });

        // Small delay to prevent rate limiting and reduce memory pressure
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        
        // Memory management: clear large data after each chapter to prevent accumulation
        if (global.gc) {
          global.gc(); // Force garbage collection if available
        }
      }

      const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
      const result = {
        title: job.storyData.title,
        chapters: chapters,
        totalChapters: chapters.length,
        wordCount: totalWords,
        completedAt: new Date().toISOString(),
        outline: outline
      };

      this.updateJob(jobId, {
        status: 'completed',
        progress: 100,
        result: result,
        currentProcess: 'Generation complete!',
        logs: [...this.getJob(jobId).logs, { 
          message: `Novel generation completed! ${chapters.length} chapters, ${totalWords.toLocaleString()} words`, 
          type: 'success', 
          timestamp: new Date() 
        }]
      });

      return result;
      return result;
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      this.updateJob(jobId, {
        status: 'failed',
        error: error.message,
        currentProcess: 'Generation failed',
        logs: [...this.getJob(jobId).logs, { 
          message: `Generation failed: ${error.message}`, 
          type: 'error', 
          timestamp: new Date() 
        }]
      });
      throw error;
    } finally {
      // Always clear the timeout
      clearTimeout(timeoutId);
    }
  }

  // Stream management for real-time generation
  createStream(storyData, preferences) {
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stream = {
      id: streamId,
      storyData,
      preferences,
      status: 'initialized',
      clients: new Set(),
      chapters: [],
      currentChapter: 1
    };

    this.streams.set(streamId, stream);
    return streamId;
  }

  getStream(streamId) {
    return this.streams.get(streamId);
  }

  addStreamClient(streamId, res) {
    const stream = this.getStream(streamId);
    if (stream) {
      stream.clients.add(res);
    }
  }

  removeStreamClient(streamId, res) {
    const stream = this.getStream(streamId);
    if (stream) {
      stream.clients.delete(res);
    }
  }

  broadcastToStream(streamId, event, data) {
    const stream = this.getStream(streamId);
    if (stream) {
      const message = `data: ${JSON.stringify({ type: event, ...data })}\n\n`;
      stream.clients.forEach(client => {
        try {
          client.write(message);
        } catch (error) {
          console.error('Error writing to stream client:', error);
          stream.clients.delete(client);
        }
      });
    }
  }
}

export default new AdvancedAIService();
