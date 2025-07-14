import OpenAI from 'openai';
import { ANALYSIS_PROMPT_TEMPLATE, CHAPTER_PROMPT_TEMPLATE } from '../shared/conflictPrompts.js';

class AIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  OpenAI API key not configured. AI services will not be available.');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey
      });
    }
  }

  isConfigured() {
    return this.openai !== null;
  }

  async generateAnalysis(params) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    const {
      synopsis,
      genre,
      wordCount,
      chapterLength,
      chapterCount,
      conflictStructure,
      useRomanceTemplate,
      selectedRomanceTemplate
    } = params;

    const conflictGuidance = this.buildConflictGuidance(conflictStructure);
    const romanceGuidance = this.buildRomanceGuidance(useRomanceTemplate, selectedRomanceTemplate);
    
    const prompt = ANALYSIS_PROMPT_TEMPLATE(
      synopsis,
      wordCount,
      genre,
      chapterLength,
      chapterCount,
      conflictGuidance,
      romanceGuidance
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.7,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating analysis:', error);
      throw new Error(`AI analysis generation failed: ${error.message}`);
    }
  }

  async generateChapter(params) {
    const {
      chapterNumber,
      chapterTitle,
      genre,
      chapterDescription,
      wordCount,
      previousContext,
      conflictStructure,
      useRomanceTemplate,
      selectedRomanceTemplate
    } = params;

    const conflictGuidance = this.buildConflictGuidance(conflictStructure);
    const romanceGuidance = this.buildRomanceGuidance(useRomanceTemplate, selectedRomanceTemplate);
    
    const prompt = CHAPTER_PROMPT_TEMPLATE(
      chapterNumber,
      chapterTitle,
      genre,
      chapterDescription,
      wordCount,
      previousContext,
      conflictGuidance,
      romanceGuidance
    );

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: Math.min(4000, Math.ceil(wordCount * 1.5)), // Dynamic token allocation
        temperature: 0.8, // Higher creativity for chapter content
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating chapter:', error);
      throw new Error(`Chapter generation failed: ${error.message}`);
    }
  }

  buildConflictGuidance(conflictStructure) {
    if (!conflictStructure) return '';
    
    return `
CONFLICT STRUCTURE GUIDANCE:
- Primary conflicts: ${conflictStructure.primaryConflicts?.join(', ') || 'Not specified'}
- Genre: ${conflictStructure.genre || 'Not specified'}
- Subgenre: ${conflictStructure.subgenre || 'Not specified'}
- Themes: ${conflictStructure.themes?.join(', ') || 'Not specified'}
- Escalation pattern: ${conflictStructure.escalationPattern || 'Linear'}
- Internal/External balance: ${conflictStructure.internalExternalBalance || 50}% internal
${conflictStructure.spiritualElements ? `
- Spiritual elements:
  * Prayer role: ${conflictStructure.spiritualElements.prayerRole}
  * Divine intervention: ${conflictStructure.spiritualElements.divineIntervention}
  * Faith testing: ${conflictStructure.spiritualElements.faithTesting}
  * Moral dilemmas: ${conflictStructure.spiritualElements.moralDilemmas}
` : ''}
`;
  }

  buildRomanceGuidance(useRomanceTemplate, selectedRomanceTemplate) {
    if (!useRomanceTemplate) return '';
    
    return `
ROMANCE BEAT GUIDANCE:
- Using ${selectedRomanceTemplate || 'Alana Terry Classic'} romance template
- Ensure faith integration in romantic development
- Maintain clean and wholesome content
- Focus on emotional and spiritual connection
- Include appropriate romantic milestones at story percentages
`;
  }

  async healthCheck() {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });
      return { status: 'healthy', response: response.choices[0].message.content };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }
}

export default new AIService();
