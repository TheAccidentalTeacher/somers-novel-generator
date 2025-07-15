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
        throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
      }
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

    // BASIC PROMPT - No fancy engineering, just raw auto-generation
    const prompt = `Write a ${chapterCount} chapter outline for a ${genre} novel. Here's the story idea:

${premise}

Make it ${wordCount} words total. Return as JSON:
[{"number": 1, "title": "Chapter Name", "summary": "What happens", "wordTarget": ${Math.round(wordCount/chapterCount)}}]`;

    try {
      const response = await this.getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini', // CHEAP model for outlining - just structure
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500, 
        temperature: 0.7 // Lower temp for structured output
      });

      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        throw new Error('Could not parse outline JSON');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Outline generation failed: ${error.message}`);
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
