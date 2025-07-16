import OpenAI from 'openai';

/**
 * Simple Novel Generator - Clean, Iterative Design
 * 
 * Philosophy: Start simple, iterate easily
 * Each method does ONE thing and can be improved independently
 */
class SimpleNovelGenerator {
  constructor() {
    // Don't initialize OpenAI client immediately - do it lazily when needed
    this.openai = null;
  }

  // Lazy initialization of OpenAI client
  getOpenAIClient() {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        const error = new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
        error.code = 'MISSING_API_KEY';
        error.details = {
          environmentVariables: Object.keys(process.env).filter(key => key.includes('OPENAI')),
          suggestion: 'Set OPENAI_API_KEY in your environment variables'
        };
        throw error;
      }
      
      if (process.env.OPENAI_API_KEY.length < 20) {
        const error = new Error('OpenAI API key appears to be invalid (too short).');
        error.code = 'INVALID_API_KEY';
        error.details = {
          keyLength: process.env.OPENAI_API_KEY.length,
          expected: 'Should start with sk- and be at least 20 characters',
          suggestion: 'Check your OpenAI API key format'
        };
        throw error;
      }
      
      try {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('✅ OpenAI client initialized successfully');
      } catch (initError) {
        const error = new Error(`Failed to initialize OpenAI client: ${initError.message}`);
        error.code = 'CLIENT_INIT_FAILED';
        error.originalError = initError;
        throw error;
      }
    }
    return this.openai;
  }

  /**
   * STEP 1: Generate basic outline from premise
   * Input: premise, basic settings
   * Output: array of chapter summaries
   * 
   * This will be bad at first - that's OK! Easy to improve the prompt.
   */
  async generateOutline(premise, settings = {}) {
    const {
      genre = 'fantasy',
      wordCount = 50000,
      chapterCount = 12
    } = settings;

    // IMPROVED PROMPT - More explicit JSON formatting instructions
    const prompt = `You are a professional novel outline generator. Create a detailed ${chapterCount} chapter outline for a ${genre} novel.

Story premise:
${premise}

Target word count: ${wordCount} words (approximately ${Math.round(wordCount/chapterCount)} words per chapter)

IMPORTANT: You must respond with ONLY a valid JSON array in this exact format:
[
  {
    "number": 1,
    "title": "Chapter Title Here",
    "summary": "Detailed description of what happens in this chapter",
    "wordTarget": ${Math.round(wordCount/chapterCount)}
  },
  {
    "number": 2,
    "title": "Chapter Title Here", 
    "summary": "Detailed description of what happens in this chapter",
    "wordTarget": ${Math.round(wordCount/chapterCount)}
  }
]

Create ${chapterCount} chapters. Return ONLY the JSON array, no other text.`;

    try {
      console.log('🤖 Calling OpenAI for outline generation...', {
        model: 'gpt-4o-mini',
        promptLength: prompt.length,
        maxTokens: 2000,
        chapterCount,
        timestamp: new Date().toISOString()
      });
      
      const response = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini', // CHEAP model for outlining - just structure
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000, // Increased for longer outlines
        temperature: 0.3 // Lower temp for better JSON compliance
      });

      if (!response || !response.choices || !response.choices[0]) {
        throw new Error('Invalid response structure from OpenAI');
      }

      const content = response.choices[0].message.content.trim();
      console.log('🤖 OpenAI response received:', {
        contentLength: content.length,
        finishReason: response.choices[0].finish_reason,
        usage: response.usage,
        firstChars: content.substring(0, 200),
        lastChars: content.substring(content.length - 200)
      });

      // Check for truncated response
      if (response.choices[0].finish_reason === 'length') {
        console.warn('⚠️ OpenAI response was truncated due to token limit');
      }

      // Try to extract JSON - be more flexible with the parsing
      let jsonData;
      
      // First, try to parse the entire content as JSON
      try {
        jsonData = JSON.parse(content);
        console.log('✅ Successfully parsed full content as JSON');
      } catch (parseError) {
        console.log('❌ Full content not JSON, trying to extract array...', {
          parseError: parseError.message,
          contentPreview: content.substring(0, 500)
        });
        
        // Try to find JSON array in the content
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
          const error = new Error('No JSON array found in OpenAI response');
          error.code = 'NO_JSON_ARRAY';
          error.details = {
            responseContent: content,
            contentLength: content.length,
            searchPatterns: ['[...]', 'array', 'json'],
            suggestion: 'OpenAI may have returned non-JSON text'
          };
          throw error;
        }
        
        try {
          jsonData = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted and parsed JSON array');
        } catch (extractError) {
          const error = new Error('Failed to parse extracted JSON from OpenAI response');
          error.code = 'JSON_PARSE_FAILED';
          error.details = {
            extractedJson: jsonMatch[0],
            parseError: extractError.message,
            originalContent: content,
            suggestion: 'Try again - OpenAI response was malformed'
          };
          throw error;
        }
      }

      // Validate the structure
      if (!Array.isArray(jsonData)) {
        const error = new Error('OpenAI response is not an array');
        error.code = 'INVALID_RESPONSE_TYPE';
        error.details = {
          receivedType: typeof jsonData,
          expected: 'array',
          content: jsonData,
          suggestion: 'Try again - OpenAI response should be an array of chapters'
        };
        throw error;
      }

      if (jsonData.length === 0) {
        const error = new Error('Empty outline array received from OpenAI');
        error.code = 'EMPTY_OUTLINE';
        error.details = {
          requestedChapters: chapterCount,
          received: 0,
          suggestion: 'Try again or adjust the premise'
        };
        throw error;
      }

      // Validate each chapter has required fields
      const invalidChapters = [];
      for (let i = 0; i < jsonData.length; i++) {
        const chapter = jsonData[i];
        const missing = [];
        
        if (!chapter.number) missing.push('number');
        if (!chapter.title) missing.push('title');
        if (!chapter.summary) missing.push('summary');
        
        if (missing.length > 0) {
          invalidChapters.push({
            index: i,
            chapter: chapter,
            missingFields: missing
          });
        }
      }

      if (invalidChapters.length > 0) {
        const error = new Error(`${invalidChapters.length} chapters missing required fields`);
        error.code = 'INVALID_CHAPTER_STRUCTURE';
        error.details = {
          invalidChapters: invalidChapters,
          requiredFields: ['number', 'title', 'summary'],
          suggestion: 'Try again - some chapters are incomplete'
        };
        throw error;
      }

      console.log('✅ Outline validation passed:', {
        chapters: jsonData.length,
        averageWordTarget: jsonData.reduce((sum, ch) => sum + (ch.wordTarget || 0), 0) / jsonData.length,
        titles: jsonData.map(ch => ch.title)
      });
      
      return jsonData;
      
    } catch (error) {
      // Enhanced error logging with context
      console.error('❌ Outline generation error:', {
        errorMessage: error.message,
        errorCode: error.code || 'UNKNOWN',
        errorStack: error.stack,
        premiseLength: premise.length,
        settings: settings,
        timestamp: new Date().toISOString()
      });
      
      // Re-throw with additional context if not already enhanced
      if (!error.code) {
        const enhancedError = new Error(`Outline generation failed: ${error.message}`);
        enhancedError.code = 'GENERATION_FAILED';
        enhancedError.originalError = error;
        enhancedError.details = {
          premise: premise.substring(0, 200) + '...',
          settings: settings,
          timestamp: new Date().toISOString()
        };
        throw enhancedError;
      }
      
      throw error;
    }
  }

  /**
   * STEP 2: Generate single chapter
   * Input: chapter outline + context
   * Output: chapter content
   * 
   * Simple first version - easy to enhance later
   */
  async generateChapter(chapterOutline, context = {}) {
    const {
      previousChapters = [],
      fullPremise = '',
      genre = 'fantasy'
    } = context;

    // BASIC PROMPT - Raw, unpolished generation
    const prompt = `Write Chapter ${chapterOutline.number}: ${chapterOutline.title}

Story: ${fullPremise}

Chapter goal: ${chapterOutline.summary}

Write about ${chapterOutline.wordTarget} words. Just write the chapter.`;

    try {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o', // PREMIUM model for actual writing - best quality
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000, // More tokens for detailed chapter writing
        temperature: 0.8 // Good creativity for storytelling
      });

      const content = response.choices[0].message.content;
      const wordCount = content.split(/\s+/).length;

      return {
        number: chapterOutline.number,
        title: chapterOutline.title,
        content: content,
        wordCount: wordCount,
        summary: chapterOutline.summary
      };
    } catch (error) {
      throw new Error(`Chapter ${chapterOutline.number} generation failed: ${error.message}`);
    }
  }

  /**
   * STEP 3: Generate complete novel
   * Input: premise + settings
   * Output: full novel with all chapters
   * 
   * Orchestrates everything - but keeps it simple
   */
  async generateFullNovel(premise, settings = {}, progressCallback = null) {
    try {
      // Step 1: Create outline
      if (progressCallback) progressCallback('Creating outline...');
      const outline = await this.generateOutline(premise, settings);
      
      // Step 2: Generate chapters one by one
      const chapters = [];
      
      for (let i = 0; i < outline.length; i++) {
        const chapterOutline = outline[i];
        
        if (progressCallback) {
          progressCallback(`Writing Chapter ${chapterOutline.number}: ${chapterOutline.title}`);
        }
        
        const chapter = await this.generateChapter(chapterOutline, {
          previousChapters: chapters,
          fullPremise: premise,
          genre: settings.genre
        });
        
        chapters.push(chapter);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Step 3: Compile final novel
      if (progressCallback) progressCallback('Compiling final novel...');
      const fullNovel = this.compileNovel(chapters, premise, settings);
      
      return {
        success: true,
        outline: outline,
        chapters: chapters,
        fullNovel: fullNovel,
        stats: {
          totalWords: chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
          chapterCount: chapters.length
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        outline: null,
        chapters: [],
        fullNovel: null
      };
    }
  }

  /**
   * STEP 4: Compile chapters into final novel
   * Input: chapters array
   * Output: formatted novel text
   * 
   * Simple formatting - easy to enhance
   */
  compileNovel(chapters, premise, settings) {
    const title = this.extractTitle(premise) || 'Auto-Generated Novel';
    
    // BASIC FORMATTING - No fancy styling
    let novel = `${title}\n\n`;
    
    chapters.forEach(chapter => {
      novel += `${chapter.title}\n\n`;
      novel += `${chapter.content}\n\n`;
    });
    
    return novel;
  }

  /**
   * UTILITY: Extract title from premise
   * Simple version - can be improved
   */
  extractTitle(premise) {
    const titleMatch = premise.match(/Title:\s*([^\n]+)/i) || 
                     premise.match(/# ([^\n]+)/) ||
                     premise.match(/^([^\n]{10,50})/);
    
    return titleMatch ? titleMatch[1].trim() : null;
  }

  /**
   * ENHANCEMENT HOOK: Easy way to improve prompts later
   * Just replace these methods to iterate on quality
   */
  
  // v2: Better outline prompt
  async generateOutlineV2(premise, settings) {
    // TODO: Implement better outline generation
    return this.generateOutline(premise, settings);
  }
  
  // v2: Better chapter prompt  
  async generateChapterV2(chapterOutline, context) {
    // TODO: Implement better chapter generation
    return this.generateChapter(chapterOutline, context);
  }
}

export default SimpleNovelGenerator;
