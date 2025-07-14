// AI prompt templates for novel generation
export const ANALYSIS_PROMPT_TEMPLATE = (synopsis, wordCount, genre, chapterLength, chapterCount, conflictGuidance, romanceGuidance) => `
You are a professional novel writing consultant and story structure expert. Analyze this synopsis and create a comprehensive structure for a ${wordCount}-word ${genre} novel.

SYNOPSIS TO ANALYZE:
${synopsis}

REQUIREMENTS:
1. Create a detailed chapter-by-chapter breakdown
2. Ensure proper three-act structure with clear story beats
3. Develop compelling character arcs with meaningful growth
4. Build tension and conflict escalation throughout
5. Create satisfying resolution and character transformation

TECHNICAL SPECIFICATIONS:
- Target word count: ${wordCount} words
- Chapter length preference: ${chapterLength}
- Target chapter count: ${chapterCount}

${conflictGuidance}
${romanceGuidance}

FORMAT YOUR RESPONSE AS:
**NOVEL ANALYSIS**
**Three-Act Structure:**
[Detailed breakdown]
**Chapter Breakdown:**
Chapter 1: [Title] - [Word count] words
[Detailed description including conflict elements, character development, story progression]
**Character Arcs:**
[Character development plans]
**Conflict Escalation:**
[How conflicts build and resolve]
**Themes and Resolution:**
[Thematic elements and resolution]
`;

export const CHAPTER_PROMPT_TEMPLATE = (chapterNumber, chapterTitle, genre, chapterDescription, wordCount, previousContext, conflictGuidance, romanceGuidance) => `
Write Chapter ${chapterNumber}: "${chapterTitle}" for a ${genre} novel.

CHAPTER REQUIREMENTS:
${chapterDescription}
TARGET LENGTH: ${wordCount} words
PREVIOUS CONTEXT: ${previousContext}

${conflictGuidance}
${romanceGuidance}

Write the complete chapter with:
- Engaging prose and dialogue
- Strong character development
- Proper pacing and tension
- Scene transitions and descriptions
- Conflict development appropriate to the story stage
`;
