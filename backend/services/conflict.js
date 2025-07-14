import { CONFLICT_TYPES, GENRE_CONFLICT_PATTERNS, ROMANCE_BEAT_TEMPLATES } from '../shared/conflictStructure.js';

class ConflictService {
  processConflictStructure(conflictStructure, synopsis, genre, subgenre) {
    // Validate and enhance conflict structure
    const processedStructure = {
      ...conflictStructure,
      genre: genre || conflictStructure.genre,
      subgenre: subgenre || conflictStructure.subgenre,
    };

    // Apply genre-specific patterns if not already set
    if (!processedStructure.primaryConflicts && GENRE_CONFLICT_PATTERNS[genre]) {
      processedStructure.primaryConflicts = GENRE_CONFLICT_PATTERNS[genre].preferredConflicts;
    }

    // Build chapter conflict map
    processedStructure.chapterConflicts = this.buildChapterConflictMap(processedStructure);

    return processedStructure;
  }

  buildChapterConflictMap(conflictStructure) {
    const { primaryConflicts, escalationPattern, actStructure } = conflictStructure;
    
    if (!primaryConflicts || primaryConflicts.length === 0) {
      return [];
    }

    // Simple mapping for now - can be enhanced based on act structure
    const conflictMap = [];
    const totalChapters = 20; // Default, should be passed as parameter
    
    for (let i = 1; i <= totalChapters; i++) {
      const act = this.getActForChapter(i, totalChapters);
      const primaryConflict = primaryConflicts[i % primaryConflicts.length];
      
      conflictMap.push({
        chapter: i,
        act: act,
        primaryConflict: primaryConflict,
        intensity: this.calculateConflictIntensity(i, totalChapters, escalationPattern),
        focus: this.getConflictFocus(act, conflictStructure)
      });
    }

    return conflictMap;
  }

  getActForChapter(chapterNumber, totalChapters) {
    const act1End = Math.ceil(totalChapters * 0.25);
    const act2End = Math.ceil(totalChapters * 0.75);
    
    if (chapterNumber <= act1End) return 'actI';
    if (chapterNumber <= act2End) return 'actII';
    return 'actIII';
  }

  calculateConflictIntensity(chapterNumber, totalChapters, escalationPattern = 'LINEAR') {
    switch (escalationPattern) {
      case 'LINEAR':
        return Math.min(100, (chapterNumber / totalChapters) * 100);
      case 'EXPONENTIAL':
        return Math.min(100, Math.pow(chapterNumber / totalChapters, 2) * 100);
      case 'WAVE':
        return Math.min(100, (Math.sin((chapterNumber / totalChapters) * Math.PI) + chapterNumber / totalChapters) * 50);
      default:
        return 50;
    }
  }

  getConflictFocus(act, conflictStructure) {
    const genre = conflictStructure.genre;
    const patterns = GENRE_CONFLICT_PATTERNS[genre];
    
    if (patterns && patterns.actStructure && patterns.actStructure[act]) {
      return patterns.actStructure[act].focus;
    }
    
    return 'General conflict development';
  }

  generateChapterDescription(chapterNumber, conflictMap, romanceTemplate) {
    const chapterConflict = conflictMap.find(c => c.chapter === chapterNumber);
    if (!chapterConflict) {
      return `Chapter ${chapterNumber}: Continue story development with appropriate pacing and conflict.`;
    }

    const conflictInfo = CONFLICT_TYPES.INTERNAL[chapterConflict.primaryConflict.toUpperCase()] || 
                        CONFLICT_TYPES.EXTERNAL[chapterConflict.primaryConflict.toUpperCase()];
    
    let description = `Chapter ${chapterNumber} (${chapterConflict.act.toUpperCase()}): `;
    description += `Focus on ${conflictInfo ? conflictInfo.name : chapterConflict.primaryConflict} conflict. `;
    description += `${chapterConflict.focus} `;
    description += `Conflict intensity: ${Math.round(chapterConflict.intensity)}%. `;

    // Add romance beat guidance if applicable
    if (romanceTemplate && ROMANCE_BEAT_TEMPLATES[romanceTemplate]) {
      const template = ROMANCE_BEAT_TEMPLATES[romanceTemplate];
      const chapterPercentage = (chapterNumber / 20) * 100; // Assuming 20 chapters
      
      const relevantBeat = template.beats.find(beat => {
        const [start, end] = beat.percentage.split('-').map(p => parseInt(p.replace('%', '')));
        return chapterPercentage >= start && chapterPercentage <= end;
      });

      if (relevantBeat) {
        description += `Romance beat: ${relevantBeat.name} - ${relevantBeat.guidance}`;
      }
    }

    return description;
  }

  extractChaptersFromAnalysis(analysisText) {
    // Parse AI-generated analysis to extract chapter information
    const chapters = [];
    const lines = analysisText.split('\n');
    
    let currentChapter = null;
    for (const line of lines) {
      const chapterMatch = line.match(/^Chapter (\d+):\s*(.+?)\s*-\s*(\d+)\s*words?/i);
      if (chapterMatch) {
        if (currentChapter) {
          chapters.push(currentChapter);
        }
        currentChapter = {
          number: parseInt(chapterMatch[1]),
          title: chapterMatch[2].trim(),
          wordCount: parseInt(chapterMatch[3]),
          description: ''
        };
      } else if (currentChapter && line.trim()) {
        // Add description lines to current chapter
        currentChapter.description += line.trim() + ' ';
      }
    }
    
    if (currentChapter) {
      chapters.push(currentChapter);
    }

    return chapters;
  }

  validateConflictStructure(conflictStructure) {
    const errors = [];
    
    if (!conflictStructure.genre) {
      errors.push('Genre is required');
    }
    
    if (!conflictStructure.primaryConflicts || conflictStructure.primaryConflicts.length === 0) {
      errors.push('At least one primary conflict must be selected');
    }
    
    if (conflictStructure.internalExternalBalance < 0 || conflictStructure.internalExternalBalance > 100) {
      errors.push('Internal/External balance must be between 0 and 100');
    }
    
    return errors;
  }
}

export default new ConflictService();
