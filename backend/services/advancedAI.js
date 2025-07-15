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

    const outlinePrompt = `You are a master storyteller and novel architect creating an exceptionally detailed chapter-by-chapter outline for a ${fictionLength} length ${genre} novel. Each chapter outline must be rich, specific, and vivid enough to guide an AI novelist to write compelling ${targetChapterLength}-word chapters.

STORY DETAILS:
- Title: ${title}
- Genre: ${genre} (${subgenre})
- Total Word Count: ${wordCount.toLocaleString()}
- Number of Chapters: ${chapters}
- Target Chapter Length: ${targetChapterLength} words each
- Synopsis: ${synopsis}

GENRE GUIDELINES:
${genreInstructions}

CRITICAL REQUIREMENTS FOR RICH OUTLINES:
1. Each chapter outline must be 150-300 words (not 2-3 sentences!)
2. Include specific scene descriptions with sensory details (sights, sounds, smells, textures)
3. Provide actual dialogue samples in character voices
4. Detail specific character actions, reactions, and internal thoughts
5. Describe the physical environment and atmosphere vividly
6. Include specific plot points, conflicts, and resolutions within the chapter
7. Show character growth through specific moments and realizations
8. Detail the emotional journey and beats throughout the chapter
9. Include genre-specific elements (magic systems, technology, historical details, etc.)
10. Provide specific hooks, cliffhangers, or transitions to next chapters

STRUCTURE EACH CHAPTER OUTLINE WITH:
- Opening Scene: Specific setting, character state, immediate situation
- Key Events: 3-5 specific plot points with details about how they unfold
- Character Development: Specific moments of growth, realization, or change
- Dialogue Samples: 2-3 lines of actual dialogue that capture character voice
- Sensory Details: Specific descriptions of environment, atmosphere, physical sensations
- Conflict/Tension: Specific obstacles, challenges, or emotional struggles
- Emotional Journey: How characters feel at beginning vs. end of chapter
- Chapter Conclusion: Specific resolution or cliffhanger leading to next chapter

OUTPUT FORMAT:
Return a JSON array with this exact structure:
[
  {
    "title": "Chapter Title (compelling and specific)",
    "summary": "RICH, DETAILED 150-300 word chapter outline including: opening scene with specific setting and character state, 3-5 key plot events with sensory details, sample dialogue in character voices, specific character development moments, environmental descriptions, conflict details, emotional journey, and chapter conclusion/transition. Write as if describing a vivid movie scene to someone who needs to recreate it perfectly."
  }
]

EXAMPLE OF DESIRED DETAIL LEVEL:
Instead of: "The protagonists meet the sages and learn about their quest."
Write: "Dawn breaks over the crystalline peaks of Mount Serenity as Penny, her clothes still dusty from three days of desperate travel, pounds on the monastery's ancient oak doors. The sound echoes through stone corridors where Brother Marcus, his weathered hands trembling as he lights the morning candles, mutters 'They've come at last, just as the prophecy foretold.' When the doors swing open with a groan that seems to carry centuries of secrets, Sage Elara's silver eyes immediately fix on the pendant hanging around Penny's neck - the same pendant her missing brother wore. 'Child,' Elara says, her voice carrying both warmth and urgency, 'the shadow has already begun to swallow the eastern kingdoms. Your brother saw this day coming.' As morning mist swirls around the trio, carrying the scent of mountain herbs and something darker - smoke from distant fires - the sage explains how only those bearing the bloodline of the First Guardians can breach the Veil of Sorrows and reach the Heart of Elements before the next moon..."

Create outlines rich enough for a novelist to write compelling, detailed chapters that will captivate readers. Each chapter should feel essential to the story and leave readers eager for the next one.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4 for best logical reasoning
        messages: [{ role: 'user', content: outlinePrompt }],
        max_tokens: 8000, // Increased for detailed outlines
        temperature: 0.4, // Slightly higher for creative detail while maintaining structure
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

    const { title, genre, subgenre, genreInstructions, synopsis, targetChapterLength, chapterVariance } = storyData;
    
    // Calculate target word range
    const minWords = targetChapterLength - chapterVariance;
    const maxWords = targetChapterLength + chapterVariance;

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
6. Target ${targetChapterLength} words (±${chapterVariance})
7. End with appropriate tension/resolution for chapter position
8. Use rich, immersive prose appropriate for the genre

Write the complete chapter now. Do not include chapter headers or numbering - just the prose content.`;

    try {
      if (onProgress) onProgress(`Writing Chapter ${chapterNumber}: ${chapterOutline.title}`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4 for best creative writing
        messages: [{ role: 'user', content: chapterPrompt }],
        max_tokens: Math.min(4000, Math.ceil(maxWords * 1.2)), // Dynamic token allocation
        temperature: 0.8, // Higher creativity for writing
      });

      const content = response.choices[0].message.content.trim();
      const wordCount = content.split(/\s+/).length;

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

  // Detect if synopsis contains detailed premise information
  detectDetailedPremise(synopsis) {
    const detailIndicators = [
      'world-building', 'character arc', 'symbolism', 'theological', 'trinitarian',
      'dialogue sample', 'scene description', 'backstory', 'biological authenticity',
      'magical system', 'geography', 'climate', 'architecture', 'culture',
      'sample prayer', 'narrative note', 'enhanced goal', 'quirk', 'physical manifestation'
    ];
    
    const wordCount = synopsis.split(/\s+/).length;
    const hasDetailIndicators = detailIndicators.some(indicator => 
      synopsis.toLowerCase().includes(indicator.toLowerCase())
    );
    
    // Consider it detailed if over 1000 words OR contains multiple detail indicators
    return wordCount > 1000 || (wordCount > 500 && hasDetailIndicators);
  }

  // Enhanced outline creation for detailed premises
  async createDetailedOutline(storyData) {
    const isDetailedPremise = this.detectDetailedPremise(storyData.synopsis);
    
    if (isDetailedPremise) {
      console.log('🎨 Detected detailed premise - using enhanced outline generation');
      return this.createOutlineFromDetailedPremise(storyData);
    } else {
      console.log('📝 Standard premise - using standard outline generation');
      return this.createOutline(storyData);
    }
  }

  // Specialized outline creation for detailed premises
  async createOutlineFromDetailedPremise(storyData) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const { title, genre, subgenre, genreInstructions, wordCount, chapters, targetChapterLength, synopsis, fictionLength } = storyData;

    const enhancedOutlinePrompt = `You are a master storyteller working with an exceptionally detailed and rich premise. The author has provided comprehensive world-building, character development, and thematic elements. Your task is to create chapter outlines that honor this depth while providing the specific detail needed for ${targetChapterLength}-word chapters.

AUTHOR'S DETAILED PREMISE:
${synopsis}

STORY SPECIFICATIONS:
- Title: ${title}
- Genre: ${genre} (${subgenre})
- Total Word Count: ${wordCount.toLocaleString()}
- Number of Chapters: ${chapters}
- Target Chapter Length: ${targetChapterLength} words each

GENRE GUIDELINES:
${genreInstructions}

CRITICAL INSTRUCTIONS FOR PREMISE-BASED OUTLINES:
1. Extract specific characters, locations, and concepts from the premise
2. Use the author's established world-building elements, terminology, and rules
3. Incorporate the author's character names, quirks, and development arcs
4. Reference specific locations, magical systems, and cultural elements provided
5. Maintain the author's established tone, themes, and theological framework
6. Build on the sample scenes and dialogue styles shown in the premise
7. Each chapter outline must be 200-400 words with premise-specific details
8. Include direct references to elements from the premise (characters, places, concepts)
9. Follow the narrative structure suggested in the premise
10. Expand on but don't contradict the author's established world

DETAILED OUTLINE REQUIREMENTS:
- Opening Scene: Use specific characters, locations, and situations from premise
- Character Actions: Reference established character traits, quirks, and goals
- World Elements: Incorporate magical systems, geography, and cultural details provided
- Dialogue Style: Match the voice and style demonstrated in premise samples
- Thematic Integration: Weave in the theological, philosophical, or genre themes established
- Plot Progression: Build toward the climax and resolution suggested in premise
- Sensory Details: Use environmental and atmospheric details that fit the established world
- Transitions: Connect chapters using premise-established relationships and conflicts

OUTPUT FORMAT:
Return a JSON array with this exact structure:
[
  {
    "title": "Chapter Title (using premise terminology and style)",
    "summary": "COMPREHENSIVE 200-400 word outline that directly incorporates characters, locations, concepts, and thematic elements from the detailed premise. Reference specific premise elements by name. Include: opening scene with premise-established characters and settings, 4-6 key plot events using premise world-building, sample dialogue matching premise character voices, specific character development moments based on premise arcs, environmental descriptions using premise geography/culture, conflicts rooted in premise-established tensions, emotional journey reflecting premise themes, chapter conclusion advancing premise narrative structure."
  }
]

Remember: You are adapting the author's rich, detailed vision - not creating a generic story. Every chapter should feel like it belongs in the specific world and story the author has carefully crafted.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4 for best logical reasoning
        messages: [{ role: 'user', content: enhancedOutlinePrompt }],
        max_tokens: 10000, // Extra tokens for detailed premise outlines
        temperature: 0.35, // Balanced for detail and creativity while respecting premise
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

      console.log('✅ Enhanced outline created with premise-specific details');
      return outline;
    } catch (error) {
      console.error('Error creating enhanced outline:', error);
      throw new Error(`Enhanced outline creation failed: ${error.message}`);
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
