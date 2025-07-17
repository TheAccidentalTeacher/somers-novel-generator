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
        apiKey: apiKey
      });
    }
    
    // Job storage (in production, use Redis or database)
    this.jobs = new Map();
    this.streams = new Map();
  }

  isConfigured() {
    return this.openai !== null;
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
2. Each chapter should be substantial enough for ${targetChapterLength} words
3. Ensure proper story pacing and structure for ${fictionLength}
4. Include character development arcs WITH SETBACKS AND REGRESSION
5. Build tension and conflicts appropriately - let conflicts LINGER across chapters
6. Follow genre conventions for ${genre}
7. Each chapter should have clear objectives and emotional beats
8. AVOID AI TELLTALES: Allow for messiness, unresolved tensions, and imperfect character growth
9. Include moments that don't serve the theme - details that just make the world feel real
10. Let antagonists score meaningful victories, not just temporary setbacks

HUMAN AUTHENTICITY GUIDELINES:
- Character growth is NOT linear - include backsliding and old patterns resurfacing
- Conflicts between characters should simmer and flare up unexpectedly
- Include sensory details that ground the reader (smells, textures, specific sounds)
- Add "useless" worldbuilding details that don't advance plot but add richness
- Dialogue should be imperfect - interruptions, trailing off, misunderstandings
- Vary pacing - some chapters rush with action, others linger on quiet moments

OUTPUT FORMAT:
Return a JSON array with this exact structure:
[
  {
    "title": "Chapter Title",
    "summary": "Detailed chapter summary including key events, character developments, conflicts, and emotional beats. Should be 2-3 sentences explaining what happens and why it matters to the overall story."
  }
]

Be creative, engaging, and ensure each chapter builds toward a satisfying conclusion. The outline should feel like a complete, well-structured story.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06', // Use latest GPT-4o model
        messages: [{ role: 'user', content: outlinePrompt }],
        max_tokens: 4000,
        temperature: 0.3, // Lower temperature for more structured outline
      });

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
      onProgress
    } = params;

    const { title, genre, subgenre, genreInstructions, synopsis, targetChapterLength, chapterVariance = 300 } = storyData;
    
    // Calculate target word range with proper variance
    const minWords = Math.max(500, targetChapterLength - chapterVariance);
    const maxWords = targetChapterLength + chapterVariance;

    console.log(`🎯 Chapter ${chapterNumber} word target: ${minWords}-${maxWords} words (target: ${targetChapterLength})`);

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

    const chapterPrompt = `You are a master novelist writing Chapter ${chapterNumber} of "${title}".

STORY OVERVIEW:
- Genre: ${genre} (${subgenre})
- Synopsis: ${synopsis}

GENRE GUIDELINES:
${genreInstructions}

CHAPTER REQUIREMENTS:
- Title: ${chapterOutline.title}
- Planned Content: ${chapterOutline.summary}
- Target Length: ${minWords}-${maxWords} words
- This is Chapter ${chapterNumber} of the novel

${previousContext ? `STORY CONTEXT (Previous Chapters):\n${previousContext}\n\n` : ''}

WRITING INSTRUCTIONS:
1. Write a complete, engaging chapter that fits the outline
2. Maintain consistency with previous chapters and overall story
3. Show don't tell - use vivid scenes and dialogue
4. Follow ${genre} genre conventions
5. Ensure proper pacing and emotional beats
6. CRITICAL: This chapter MUST be ${targetChapterLength} words (±${chapterVariance}). Write ${minWords}-${maxWords} words.
7. End with appropriate tension/resolution for chapter position
8. Use rich, immersive prose appropriate for the genre
9. DO NOT write short chapters - reach the target word count with detailed scenes, dialogue, and descriptions

ADVANCED WRITING TECHNIQUES FOR AUTHENTICITY:
- VARY SENTENCE RHYTHM: Use fragments during action/emotion ("Ropes. Tight. Can't breathe.")
- ADD SENSORY GRIT: Include specific smells, textures, sounds that ground the reader
- LET CONFLICTS LINGER: Don't resolve everything neatly within the chapter
- INCLUDE "USELESS" DETAILS: Add texture with details that exist just to make the world feel real
- SHOW CHARACTER BACKSLIDING: Characters can revert to old patterns after growth
- ALLOW AMBIGUOUS MOMENTS: Not everything needs to teach a clear lesson
- MAKE DIALOGUE MESSY: People interrupt, trail off, speak imperfectly
- CREATE UNEVEN PACING: Some moments rush, others linger naturally

WORD COUNT REQUIREMENT: Write exactly ${targetChapterLength} words. This is essential for the overall novel structure.

Write the complete chapter now. Prioritize emotional authenticity and human messiness over perfect prose. Do not include chapter headers or numbering - just the prose content.`;

    try {
      if (onProgress) onProgress(`Writing Chapter ${chapterNumber}: ${chapterOutline.title}`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-2024-08-06', // Use latest GPT-4o model
        messages: [{ role: 'user', content: chapterPrompt }],
        max_tokens: Math.min(16000, Math.ceil(maxWords * 1.8)), // Increased token allocation (GPT-4 tokens ≈ 0.75 words)
        temperature: 0.8, // Higher creativity for writing
      });

      const content = response.choices[0].message.content.trim();
      const wordCount = content.split(/\s+/).length;

      console.log(`📝 Chapter ${chapterNumber} generated: ${wordCount} words (target: ${targetChapterLength})`);

      // Analyze chapter for human authenticity markers
      const fragmentCount = (content.match(/\.\s*[A-Z][^.]{1,15}\./g) || []).length;
      const dialogueLines = (content.match(/["'`][^"'`]*["'`]/g) || []).length;
      const sensoryWords = (content.match(/\b(smell|stench|aroma|texture|rough|smooth|sound|echo|taste|bitter|sweet)\w*\b/gi) || []).length;
      
      console.log(`📊 Chapter ${chapterNumber} authenticity analysis:`, {
        fragments: fragmentCount,
        dialogueLines: dialogueLines,
        sensoryWords: sensoryWords,
        avgSentenceLength: Math.round(wordCount / (content.split('.').length - 1))
      });

      // Log if significantly off target
      if (wordCount < minWords || wordCount > maxWords) {
        console.warn(`⚠️  Chapter ${chapterNumber} word count off target: ${wordCount} words (expected: ${minWords}-${maxWords})`);
      }

      return {
        title: chapterOutline.title,
        content: content,
        wordCount: wordCount,
        summary: chapterOutline.summary,
        number: chapterNumber
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

  // Process a generation job
  async processAdvancedGeneration(jobId) {
    const job = this.getJob(jobId);
    if (!job) throw new Error('Job not found');

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

        const chapter = await this.generateChapterAdvanced({
          chapterNumber,
          chapterOutline,
          storyData: job.storyData,
          previousChapters: chapters,
          onProgress: (message) => {
            this.updateJob(jobId, { currentProcess: message });
          }
        });

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

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
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
      const message = `data: ${JSON.stringify({ 
        type: event, 
        timestamp: Date.now(),
        streamId,
        ...data 
      })}\n\n`;
      
      // Keep track of failed clients to remove them
      const failedClients = new Set();
      
      stream.clients.forEach(client => {
        try {
          // Check if the response is still writable
          if (client.writable && !client.destroyed) {
            client.write(message);
            console.log(`📡 Broadcasted ${event} to stream ${streamId}`);
          } else {
            console.log(`📡 Client no longer writable for stream ${streamId}, removing`);
            failedClients.add(client);
          }
        } catch (error) {
          console.error(`📡 Error writing to stream client ${streamId}:`, error.message);
          console.error(`📡 Error type: ${error.name}, Code: ${error.code}`);
          failedClients.add(client);
        }
      });
      
      // Remove failed clients
      failedClients.forEach(client => {
        stream.clients.delete(client);
      });
      
      console.log(`📡 Stream ${streamId} has ${stream.clients.size} active clients after broadcast`);
    } else {
      console.error(`📡 Cannot broadcast to stream ${streamId}: stream not found`);
    }
  }
}

export default new AdvancedAIService();
