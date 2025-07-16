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
   * Input: premise, basic settings, qualitySettings
   * Output: array of chapter summaries
   * 
   * This will be bad at first - that's OK! Easy to improve the prompt.
   */
  async generateOutline(premise, settings = {}) {
    const {
      genre = 'fantasy',
      wordCount = 50000,
      chapterCount = 12,
      qualitySettings = {}
    } = settings;

    // Generate quality instructions based on settings
    const qualityInstructions = this.generateQualityInstructions(qualitySettings);

    // IMPROVED PROMPT - More explicit JSON formatting instructions + quality enhancements
    const prompt = `You are a professional novel outline generator. Create a detailed ${chapterCount} chapter outline for a ${genre} novel.

Story premise:
${premise}

Target word count: ${wordCount} words (approximately ${Math.round(wordCount/chapterCount)} words per chapter)

${qualityInstructions}

IMPORTANT: You must respond with ONLY a valid JSON array in this exact format:
[
  {
    "number": 1,
    "title": "Chapter Title Here",
    "summary": "Detailed description of what happens in this chapter",
    "wordTarget": ${Math.max(1700, Math.round(wordCount/chapterCount))}
  },
  {
    "number": 2,
    "title": "Chapter Title Here", 
    "summary": "Detailed description of what happens in this chapter",
    "wordTarget": ${Math.max(1700, Math.round(wordCount/chapterCount))}
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
      genre = 'fantasy',
      qualitySettings = {}
    } = context;

    // Generate quality instructions based on settings
    const qualityInstructions = this.generateQualityInstructions(qualitySettings);

    // ENHANCED PROMPT with quality instructions
    const targetWords = chapterOutline.wordTarget || 1700;
    const prompt = `Write Chapter ${chapterOutline.number}: ${chapterOutline.title}

Story: ${fullPremise}

Chapter goal: ${chapterOutline.summary}

${qualityInstructions}

CRITICAL: Write EXACTLY ${targetWords} words (target range: ${targetWords-200} to ${targetWords+300} words). This is a firm requirement - do not write significantly shorter chapters. Focus on creating engaging, natural prose that follows the quality guidelines above while meeting the word count requirement.

Structure your chapter with:
- Strong opening that hooks the reader
- Detailed scene development with rich descriptions
- Character development and dialogue
- Rising tension or conflict progression
- Satisfying chapter conclusion that advances the plot

Write the full chapter now:`;

    try {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o', // PREMIUM model for actual writing - best quality
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 6000, // Increased tokens to allow for longer chapters (1700+ words)
        temperature: 0.8 // Good creativity for storytelling
      });

      const content = response.choices[0].message.content;
      const wordCount = content.split(/\s+/).length;

      // Log word count for debugging
      console.log(`Chapter ${chapterOutline.number} generated: ${wordCount} words (target: ${targetWords})`);
      
      // If word count is significantly below target, warn but don't fail
      if (wordCount < targetWords * 0.7) {
        console.warn(`Chapter ${chapterOutline.number} is significantly short: ${wordCount} words vs target ${targetWords}`);
      }

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
  
  // Generate quality enhancement instructions for AI prompts
  generateQualityInstructions(qualitySettings) {
    const instructions = [];
    
    if (qualitySettings.varyTheologicalExplanations) {
      instructions.push("THEOLOGICAL VARIETY: Avoid repeating identical theological explanations. Each mention of Trinity, divine concepts, or spiritual truths should use unique phrasing, metaphors, and perspectives. Never use the exact same phrases like 'Father's authority, Son's grace, Spirit's witness' repeatedly.");
    }
    
    if (qualitySettings.showDontTellTheology) {
      instructions.push("SHOW THEOLOGY: Demonstrate theological concepts through character experiences, actions, and discoveries rather than explicit explanations. Let readers understand spiritual truths through story events, not direct statements.");
    }
    
    if (qualitySettings.includeSetbacks) {
      instructions.push("REALISTIC SETBACKS: Include genuine setbacks, failures, and moments where characters struggle or regress. Character growth should not be linear - show backsliding, doubt, and realistic obstacles to spiritual development.");
    }
    
    if (qualitySettings.showInternalConflict) {
      instructions.push("INTERNAL CONFLICT: Show character internal struggles through actions, thoughts, and physical reactions rather than stating them directly. Demonstrate tension through behavior, not exposition.");
    }
    
    if (qualitySettings.allowBacksliding) {
      instructions.push("CHARACTER REGRESSION: Allow characters to occasionally misapply lessons, doubt their progress, or revert to old patterns. Show the messiness of real spiritual growth with moments of weakness and confusion.");
    }
    
    if (qualitySettings.allowUnevenPacing) {
      instructions.push("UNEVEN PACING: Not all story elements should receive equal treatment. Some characters may develop faster, some regions may be more mysterious, some themes may need more exploration time. Embrace narrative asymmetry.");
    }
    
    if (qualitySettings.varyCharacterFocus) {
      instructions.push("VARIED CHARACTER FOCUS: Different characters should receive different amounts of attention and development. Not everyone needs equal screen time or parallel growth patterns. Let some characters be more prominent than others naturally.");
    }
    
    if (qualitySettings.uniqueVoices) {
      instructions.push("DISTINCT VOICES: Each character must have a unique speaking pattern, vocabulary, and style based on their background, age, and personality. Sages should not sound like young characters; different regions should have different speech patterns.");
    }
    
    if (qualitySettings.characterSpecificSpeech) {
      instructions.push("CHARACTER-SPECIFIC METAPHORS: Tailor each character's metaphors and references to their background - culinary metaphors for cooks, architectural references for builders, natural imagery for outdoor characters, formal language for authority figures.");
    }
    
    if (qualitySettings.enhancedSensoryDetails) {
      instructions.push("SENSORY RICHNESS: Include specific sounds, smells, textures, tastes, and visual details. Avoid generic adjectives like 'beautiful' or 'majestic.' Use concrete sensory descriptions that make the world feel lived-in and real.");
    }
    
    if (qualitySettings.showEmotionsPhysically) {
      instructions.push("PHYSICAL EMOTIONS: Instead of stating emotions ('he felt peaceful'), describe physical sensations ('his shoulders relaxed, his breathing slowed'). Show emotional states through body language, posture, and physical reactions.");
    }
    
    if (qualitySettings.includeMoralComplexity) {
      instructions.push("MORAL AMBIGUITY: Include situations where the right choice isn't immediately clear. Create scenarios where following one good principle might conflict with another, requiring genuine wisdom and discernment to navigate.");
    }
    
    if (qualitySettings.competingValues) {
      instructions.push("COMPETING VALUES: Show moments where characters must choose between two good things, or where different aspects of faith seem to pull in different directions. Let characters wrestle with genuine ethical dilemmas.");
    }
    
    if (qualitySettings.imperfectTiming) {
      instructions.push("REALISTIC TIMING: Help and wisdom don't always arrive at the perfect moment. Sometimes characters must wait, sometimes help comes too late, sometimes they must figure things out independently. Avoid convenient mentor speeches that solve problems instantly.");
    }
    
    if (qualitySettings.allowSelfDiscovery) {
      instructions.push("SELF-DISCOVERY: Let characters occasionally solve problems through their own insight, struggle, and growth rather than always receiving wisdom from mentors. Show independent spiritual development and personal revelation.");
    }
    
    if (qualitySettings.varySentenceStructure) {
      instructions.push("SENTENCE VARIETY: Dramatically vary sentence length and structure. Use short, punchy sentences for impact. Create flowing, complex sentences for description. Mix simple and elaborate constructions for natural rhythm.");
    }
    
    if (qualitySettings.dramaticPacing) {
      instructions.push("DRAMATIC PACING: Use sentence fragments for emphasis. Employ run-on sentences for building tension or excitement. Vary paragraph length to control pacing - short paragraphs for quick action, longer ones for reflection.");
    }
    
    if (qualitySettings.includeSurprises) {
      instructions.push("GENUINE SURPRISES: Include plot developments that readers cannot easily predict. Introduce unexpected character reactions, surprising solutions to problems, or events that don't follow the obvious allegorical pattern.");
    }
    
    if (qualitySettings.organicPlotTwists) {
      instructions.push("ORGANIC ELEMENTS: Occasionally introduce characters, events, or plot elements that don't fit neatly into the allegorical framework. Let some story aspects exist for narrative richness rather than symbolic purpose.");
    }
    
    if (qualitySettings.complexAntagonist) {
      instructions.push("COMPLEX ANTAGONIST: Develop the antagonist with compelling backstory and understandable motivations. They should have reasons for their beliefs that make sense from their perspective, even if they're ultimately wrong.");
    }
    
    if (qualitySettings.sympatheticVillain) {
      instructions.push("SYMPATHETIC ANTAGONIST: Make the antagonist occasionally sympathetic or relatable. Perhaps they've experienced suffering that explains their perspective, or they genuinely believe their approach would help people, despite being misguided.");
    }
    
    return instructions.length > 0 ? 
      `\n\nWRITING QUALITY ENHANCEMENT INSTRUCTIONS:\n${instructions.map(inst => `• ${inst}`).join('\n')}\n` : 
      '';
  }
  
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
