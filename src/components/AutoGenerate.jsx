import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import apiService from '../services/apiService.js';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import './AutoGenerate.css';

// Advanced Novel Generator v2.0 - Updated 2025-07-14
const AutoGenerate = ({ conflictData, apiConfig, onSuccess, onError, onNotification }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // Story setup state for when no conflictData is provided
  const [storySetup, setStorySetup] = useState({
    title: '',
    genre: '',
    subgenre: '',
    fictionLength: '',
    wordCount: 0,
    targetChapterLength: 2000,
    chapterVariance: 500,
    synopsis: ''
  });
  
  const [selectedGenreCategory, setSelectedGenreCategory] = useState(null);
  const [selectedLengthCategory, setSelectedLengthCategory] = useState(null);
  const [calculatedChapters, setCalculatedChapters] = useState(0);
  const [generationPhase, setGenerationPhase] = useState('setup'); // 'setup', 'planning', 'outline', 'generating'
  const [outline, setOutline] = useState([]);
  const [currentProcess, setCurrentProcess] = useState('');
  const [isCreatingOutline, setIsCreatingOutline] = useState(false);
  
  const [generationMode, setGenerationMode] = useState('batch'); // 'batch' or 'stream'
  
  // Add state for tracking completed chapters for recovery
  const [completedChapters, setCompletedChapters] = useState([]);
  
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [preferences, setPreferences] = useState({
    chapterLength: 'moderate',
    detailLevel: 'high',
    includeSceneBreaks: true,
    includeDividers: true,
    generateExtras: true
  });

  // Writing Quality Enhancement settings
  const [qualitySettings, setQualitySettings] = useState({
    // Reduce Repetitive Theological Explanations
    varyTheologicalExplanations: true,
    showDontTellTheology: true,
    
    // Complex Character Arcs
    includeSetbacks: true,
    showInternalConflict: true,
    allowBacksliding: true,
    
    // Reduce Perfect Symmetry
    allowUnevenPacing: true,
    varyCharacterFocus: true,
    
    // Dialogue Variation
    uniqueVoices: true,
    characterSpecificSpeech: true,
    
    // Sensory Details
    enhancedSensoryDetails: true,
    showEmotionsPhysically: true,
    
    // Moral Ambiguity
    includeMoralComplexity: true,
    competingValues: true,
    
    // Narrative Timing
    imperfectTiming: true,
    allowSelfDiscovery: true,
    
    // Sentence Variety
    varySentenceStructure: true,
    dramaticPacing: true,
    
    // Unexpected Elements
    includeSurprises: true,
    organicPlotTwists: true,
    
    // Antagonist Depth
    complexAntagonist: true,
    sympatheticVillain: true,
    
    // NEW: Advanced Anti-AI Pattern Settings
    // Based on critique feedback for more human-like writing
    
    // Character Arc Differentiation
    asymmetricalCharacterArcs: true, // Characters follow different patterns, not identical arcs
    genuineCharacterConflict: true, // Characters disagree meaningfully without immediate resolution
    persistentCharacterFlaws: true, // Flaws don't disappear after single revelation moments
    
    // Narrative Asymmetry
    asymmetricalThematicFocus: true, // Some themes get more/less attention than others
    unEvenChapterTreatment: true, // Not all story elements receive identical page time
    mysteriesRemainUnsolved: true, // Some questions stay partially answered
    
    // Authentic Imperfection
    messyResolutions: true, // Conflicts have lasting consequences, incomplete solutions
    uselessButLivingDetails: true, // Include details that don't serve plot but add authenticity
    antiClimacticMoments: true, // Some buildup leads to mundane rather than dramatic outcomes
    
    // Writing Style Variation
    chapterVoiceVariation: true, // Different chapters have slightly different writing styles
    toneInconsistency: true, // Allow natural variation in tone throughout story
    formalityFluctuation: true, // Vary between formal and casual language naturally
    
    // Theological Authenticity
    theologicalAmbiguity: true, // Allow mystery and unanswered questions in faith elements
    competingTheologicalViews: true, // Characters may have different theological perspectives
    faithStrugglesWithoutResolution: true, // Some spiritual struggles continue without neat answers
    
    // Realistic Pacing
    boringButNecessaryScenes: true, // Include mundane moments that feel real
    unevenPlotDistribution: true, // Some chapters more eventful than others
    antiClimacticChapterEndings: true, // Not every chapter ends dramatically
    
    // Human-like Inconsistencies
    characterMoodVariation: true, // Characters act differently in different moods/contexts
    writerForgetsMinorDetails: true, // Small inconsistencies that feel human
    naturalDigressions: true // Allow story to wander slightly from main plot
  });

  // Comprehensive genre mapping system for LLM instructions
  const genreCategories = {
    mystery: {
      name: 'Mystery',
      icon: '🔍',
      description: 'Suspenseful stories focused on solving crimes or puzzles',
      subgenres: {
        cozy: {
          name: 'Cozy Mystery',
          instructions: 'Write a gentle mystery with minimal violence, amateur detective, small-town setting, focus on character relationships and clever deduction. Avoid graphic content, emphasize charm and wit.'
        },
        hardboiled: {
          name: 'Hard-boiled Detective',
          instructions: 'Create a gritty, noir-style mystery with a cynical detective, urban setting, moral ambiguity, and realistic violence. Focus on atmosphere and psychological depth.'
        },
        police: {
          name: 'Police Procedural',
          instructions: 'Develop a realistic law enforcement investigation with proper procedures, team dynamics, forensic details, and authentic police work. Emphasize accuracy and process.'
        },
        psychological: {
          name: 'Psychological Thriller',
          instructions: 'Craft a mind-bending mystery focusing on mental states, unreliable narrators, psychological manipulation, and internal conflicts. Emphasize tension and character psychology.'
        },
        historical: {
          name: 'Historical Mystery',
          instructions: 'Set mystery in specific historical period with accurate details, period-appropriate language, historical figures/events, and era-specific investigative methods.'
        },
        paranormal: {
          name: 'Paranormal Mystery',
          instructions: 'Blend mystery with supernatural elements, magical investigators, otherworldly clues, and paranormal abilities. Balance mystery logic with fantasy elements.'
        },
        amateur: {
          name: 'Amateur Detective',
          instructions: 'Feature non-professional investigator stumbling into mystery, using unique skills/knowledge, personal stakes, and unconventional methods to solve crimes.'
        },
        locked_room: {
          name: 'Locked Room Mystery',
          instructions: 'Create impossible crime scenario with clever logical solution, focus on deductive reasoning, detailed crime scene analysis, and satisfying revelation.'
        }
      }
    },
    christian: {
      name: 'Christian Fiction',
      icon: '✝️',
      description: 'Faith-based stories with Christian themes and values',
      subgenres: {
        contemporary: {
          name: 'Contemporary Christian',
          instructions: 'Write modern-day story with realistic Christian characters facing current issues, emphasizing faith journey, prayer, biblical principles, and redemptive themes.'
        },
        romance: {
          name: 'Christian Romance',
          instructions: 'Develop clean romance with Christian values, courtship rather than casual dating, prayer and faith in relationship decisions, marriage as goal, no explicit content.'
        },
        historical: {
          name: 'Christian Historical',
          instructions: 'Set in historical period with accurate Christian context, period-appropriate faith practices, historical religious movements, and biblically-grounded themes.'
        },
        fantasy: {
          name: 'Christian Fantasy',
          instructions: 'Create a theologically rich fantasy world that glorifies the Triune God (Father, Son, Holy Spirit) through allegorical storytelling. Weave Reformed theology naturally into the narrative structure, using fantasy elements to illuminate biblical truths about God\'s sovereignty, Christ\'s redemptive work, and the Spirit\'s guidance. Include: detailed world-building that reflects divine order and biblical principles; characters who grow in understanding of God\'s nature through their journey; magical/fantastical systems that symbolize spiritual truths; clear good vs. evil conflict rooted in biblical worldview; redemption arcs that mirror gospel themes; sacrificial love reflecting Christ\'s sacrifice; proper biblical anthropology showing human dignity and depravity; covenant relationships and community themes; wisdom literature and scripture woven into dialogue and plot; humor that springs from joy in God\'s creation; detailed descriptions of how fantasy elements serve theological symbolism; characters who learn to depend on divine grace rather than self-reliance; resolution that points to God\'s ultimate victory and restoration. Balance profound reverence with engaging storytelling, ensuring every fantastical element serves to illuminate the character and glory of God.'
        },
        suspense: {
          name: 'Christian Suspense',
          instructions: 'Combine thriller elements with Christian themes, faith under pressure, spiritual warfare concepts, prayer as tool, good ultimately triumphing over evil.'
        },
        womens: {
          name: "Christian Women's Fiction",
          instructions: 'Focus on female protagonist navigating life challenges through faith, relationships, family dynamics, personal growth, and spiritual maturity themes.'
        },
        young_adult: {
          name: 'Christian Young Adult',
          instructions: 'Write for teen/young adult audience with age-appropriate faith themes, coming-of-age spiritual journey, peer pressure, identity in Christ concepts.'
        },
        inspirational: {
          name: 'Inspirational Fiction',
          instructions: 'Create uplifting story with Christian undertones, hope-filled themes, overcoming adversity through faith, subtle rather than preachy messaging.'
        }
      }
    },
    romance: {
      name: 'Romance',
      icon: '💕',
      description: 'Love stories with romantic relationships as central plot',
      subgenres: {
        contemporary: {
          name: 'Contemporary Romance',
          instructions: 'Modern-day romance with realistic characters, current settings, relatable conflicts, emotional development, and satisfying romantic resolution.'
        },
        historical: {
          name: 'Historical Romance',
          instructions: 'Period romance with accurate historical details, era-appropriate social constraints, historical events as backdrop, period language and customs.'
        },
        paranormal: {
          name: 'Paranormal Romance',
          instructions: 'Romance with supernatural elements, vampires/werewolves/magic, otherworldly conflicts, paranormal abilities affecting relationship dynamics.'
        },
        fantasy: {
          name: 'Fantasy Romance',
          instructions: 'Romance in fantasy setting with magic systems, fantastical creatures, world-building, adventure elements, and romantic plot as central focus.'
        },
        suspense: {
          name: 'Romantic Suspense',
          instructions: 'Combine romance with thriller elements, danger bringing characters together, mystery to solve, action sequences, and romantic tension throughout.'
        },
        regency: {
          name: 'Regency Romance',
          instructions: 'Set in Regency England (1811-1820) with period accuracy, social rules/etiquette, ballrooms and estates, witty dialogue, marriage as goal.'
        },
        western: {
          name: 'Western Romance',
          instructions: 'Romance in American Old West setting, frontier life, cowboys/ranchers, harsh landscapes, survival elements, traditional gender roles.'
        },
        military: {
          name: 'Military Romance',
          instructions: 'Romance involving military personnel, deployment challenges, honor and duty themes, military lifestyle, long-distance relationship elements.'
        }
      }
    },
    fantasy: {
      name: 'Fantasy',
      icon: '🐉',
      description: 'Stories with magical or supernatural elements',
      subgenres: {
        epic: {
          name: 'Epic Fantasy',
          instructions: 'Grand-scale fantasy with detailed world-building, magic systems, multiple POV characters, quest narratives, and battles between good and evil.'
        },
        urban: {
          name: 'Urban Fantasy',
          instructions: 'Fantasy set in modern urban environment, hidden magical world, supernatural creatures in cities, contemporary setting with fantasy elements.'
        },
        dark: {
          name: 'Dark Fantasy',
          instructions: 'Fantasy with horror elements, morally ambiguous characters, bleak atmospheres, gothic themes, and darker magical consequences.'
        },
        high: {
          name: 'High Fantasy',
          instructions: 'Fantasy in completely fictional world, detailed magic systems, non-human races, medieval-inspired settings, heroes quest narratives.'
        },
        low: {
          name: 'Low Fantasy',
          instructions: 'Fantasy with minimal magic in realistic world, subtle supernatural elements, magic as rare/dangerous, focus on character over magic.'
        },
        portal: {
          name: 'Portal Fantasy',
          instructions: 'Characters transported from real world to fantasy realm, fish-out-of-water elements, learning new world rules, journey home themes.'
        },
        sword_sorcery: {
          name: 'Sword & Sorcery',
          instructions: 'Action-focused fantasy with warrior protagonists, magic and combat, adventure over politics, personal stakes over world-saving.'
        },
        fairy_tale: {
          name: 'Fairy Tale Retelling',
          instructions: 'Reimagined classic fairy tales with modern twists, familiar story elements, updated themes, and fresh perspectives on old stories.'
        }
      }
    },
    scifi: {
      name: 'Science Fiction',
      icon: '🚀',
      description: 'Stories based on scientific concepts and future technology',
      subgenres: {
        space_opera: {
          name: 'Space Opera',
          instructions: 'Grand-scale sci-fi with space travel, alien civilizations, galactic empires, advanced technology, and epic conflicts across star systems.'
        },
        cyberpunk: {
          name: 'Cyberpunk',
          instructions: 'Near-future dystopia with advanced technology, virtual reality, corporate control, hackers, and technology vs humanity themes.'
        },
        dystopian: {
          name: 'Dystopian',
          instructions: 'Oppressive future society with government control, rebellion themes, loss of freedoms, survival elements, and hope vs despair.'
        },
        time_travel: {
          name: 'Time Travel',
          instructions: 'Stories involving temporal mechanics, cause-and-effect paradoxes, historical changes, timeline complications, and temporal consequences.'
        },
        post_apocalyptic: {
          name: 'Post-Apocalyptic',
          instructions: 'Survival in world after catastrophic event, rebuilding civilization, resource scarcity, human nature under pressure, hope themes.'
        },
        hard_scifi: {
          name: 'Hard Science Fiction',
          instructions: 'Scientifically accurate sci-fi with realistic technology, physics-based scenarios, detailed scientific explanations, and plausible futures.'
        },
        soft_scifi: {
          name: 'Soft Science Fiction',
          instructions: 'Character-focused sci-fi with loose scientific accuracy, emphasis on social sciences, human relationships, and philosophical themes.'
        },
        alternate_history: {
          name: 'Alternate History',
          instructions: 'Historical events with different outcomes, exploring how changes affect society, culture, technology, and individual lives.'
        }
      }
    },
    thriller: {
      name: 'Thriller',
      icon: '⚡',
      description: 'Fast-paced stories designed to create suspense and excitement',
      subgenres: {
        action: {
          name: 'Action Thriller',
          instructions: 'High-octane thriller with constant motion, chase sequences, physical conflicts, heroic protagonists, and non-stop pacing.'
        },
        psychological: {
          name: 'Psychological Thriller',
          instructions: 'Mind-focused thriller with unreliable narrators, mental manipulation, psychological warfare, and internal character conflicts.'
        },
        political: {
          name: 'Political Thriller',
          instructions: 'Thriller involving government conspiracies, political intrigue, corruption, espionage, and power struggles at high levels.'
        },
        medical: {
          name: 'Medical Thriller',
          instructions: 'Thriller set in medical context with diseases, medical conspiracies, hospital settings, life-or-death medical scenarios.'
        },
        legal: {
          name: 'Legal Thriller',
          instructions: 'Courtroom drama with legal procedures, lawyer protagonists, justice themes, legal conspiracies, and dramatic court scenes.'
        },
        techno: {
          name: 'Techno Thriller',
          instructions: 'Technology-focused thriller with cyber threats, scientific dangers, tech conspiracies, and cutting-edge technology as plot driver.'
        },
        espionage: {
          name: 'Espionage Thriller',
          instructions: 'Spy-focused thriller with international intrigue, double agents, secret missions, intelligence agencies, and covert operations.'
        },
        supernatural: {
          name: 'Supernatural Thriller',
          instructions: 'Thriller with paranormal elements, supernatural threats, occult themes, and otherworldly antagonists creating suspense.'
        }
      }
    }
  };

  // Fiction length categories with detailed specifications
  const fictionLengths = {
    flash: {
      name: 'Flash Fiction',
      icon: '⚡',
      range: '1,000-2,000 words',
      description: 'Ultra-short stories with single scene or moment',
      minWords: 1000,
      maxWords: 2000,
      suggestedChapterLength: 500,
      chapters: 4 // Fixed: was 2-4
    },
    short: {
      name: 'Short Story',
      icon: '📝',
      range: '2,000-7,000 words',
      description: 'Complete story with limited characters and single plot',
      minWords: 2000,
      maxWords: 7000,
      suggestedChapterLength: 1000,
      chapters: 7 // Fixed: was 2-7
    },
    novelette: {
      name: 'Novelette',
      icon: '📄',
      range: '7,001-17,500 words',
      description: 'Extended short story with more complex plot',
      minWords: 7001,
      maxWords: 17500,
      suggestedChapterLength: 1500,
      chapters: 12 // Fixed: was 5-12
    },
    novella: {
      name: 'Novella',
      icon: '📋',
      range: '17,501-50,000 words',
      description: 'Short novel with focused narrative and fewer subplots',
      minWords: 17501,
      maxWords: 50000,
      suggestedChapterLength: 2000,
      chapters: 25 // Fixed: was 9-25
    },
    novel: {
      name: 'Novel',
      icon: '📚',
      range: '50,001-110,000 words',
      description: 'Full-length novel with complex plot and character development',
      minWords: 50001,
      maxWords: 110000,
      suggestedChapterLength: 2500,
      chapters: 44 // Fixed: was 20-44
    },
    epic: {
      name: 'Epic Novel',
      icon: '📖',
      range: '110,001+ words',
      description: 'Large-scale novel with multiple plots and extensive world-building',
      minWords: 110001,
      maxWords: 200000,
      suggestedChapterLength: 3000,
      chapters: 67 // Fixed: was 37-67
    }
  };

  // Update API service when apiConfig changes
  useEffect(() => {
    if (apiConfig) {
      apiService.updateConfig({
        baseUrl: apiConfig.baseUrl,
        timeout: apiConfig.timeout || 120000 // 2 minutes default
      });
    }
  }, [apiConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Calculate chapters when word count or target length changes
  useEffect(() => {
    if (storySetup.wordCount && storySetup.targetChapterLength && storySetup.wordCount > 0 && storySetup.targetChapterLength > 0) {
      const calculated = Math.round(storySetup.wordCount / storySetup.targetChapterLength);
      setCalculatedChapters(calculated);
    } else {
      setCalculatedChapters(0);
    }
  }, [storySetup.wordCount, storySetup.targetChapterLength]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const startGeneration = async () => {
    // If we're in setup phase, start planning
    if (generationPhase === 'setup') {
      // Only start if we're not already creating an outline
      if (isCreatingOutline) {
        addLog('Outline creation already in progress, please wait...', 'warning');
        return;
      }
      setGenerationPhase('planning');
      await createOutline();
      return;
    }

    // If we're in planning phase and outline is not ready, wait for it
    if (generationPhase === 'planning' && outline.length === 0) {
      if (isCreatingOutline) {
        addLog('Outline creation in progress, please wait...', 'info');
      } else {
        addLog('Waiting for outline creation to complete...', 'info');
      }
      return;
    }

    // If we're in planning phase but outline is ready, move to outline review
    if (generationPhase === 'planning' && outline.length > 0) {
      setGenerationPhase('outline');
      addLog('Outline ready for review', 'success');
      return;
    }

    // Use either conflictData or storySetup
    const storyData = conflictData || {
      title: storySetup.title,
      genre: `${storySetup.genre}_${storySetup.subgenre}`,
      genreInstructions: genreCategories[storySetup.genre]?.subgenres[storySetup.subgenre]?.instructions || '',
      fictionLength: storySetup.fictionLength,
      chapters: calculatedChapters,
      wordCount: storySetup.wordCount,
      targetChapterLength: storySetup.targetChapterLength,
      chapterVariance: storySetup.chapterVariance,
      synopsis: storySetup.synopsis,
      outline: outline,
      // Add minimal structure for API compatibility
      themes: { primary: 'Character growth and compelling narrative' },
      characters: {
        protagonist: { name: 'Main Character', role: 'protagonist' }
      }
    };

    // Validate required fields
    if (!storyData.title || !storyData.synopsis || !outline.length) {
      onError(new Error('Please complete the planning phase first'));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      setProgress(0);
      setLogs([]);
      setGenerationPhase('generating');
      
      abortControllerRef.current = new AbortController();

      addLog('Starting advanced novel generation...', 'info');
      onNotification('Starting intelligent novel generation...', 'info');

      const requestData = {
        storyData: storyData,
        preferences,
        generationMode, // 'batch' or 'stream'
        useAdvancedIteration: true, // Enable the sophisticated AI process
        timestamp: new Date().toISOString()
      };

      // Check generation mode and use appropriate approach
      if (generationMode === 'stream') {
        addLog('🎥 Starting live streaming generation...', 'info');
        await startStreamingGeneration(storyData);
      } else {
        await startBatchGeneration(storyData);
      }

    } catch (error) {
      console.error('Generation start error:', error);
      setError(error);
      setIsGenerating(false);
      setGenerationPhase('outline');
      
      if (error.name === 'AbortError') {
        addLog('Generation was cancelled', 'warning');
        onNotification('Generation cancelled', 'warning');
      } else {
        addLog(`Error starting generation: ${error.message}`, 'error');
        onError(error);
      }
    }
  };

  // NEW: Streaming generation function with recovery support
  const startStreamingGeneration = async (storyData, resumeFromChapter = 0) => {
    try {
      // Use existing outline that was already created
      if (!outline || outline.length === 0) {
        throw new Error('No outline available. Please create outline first.');
      }
      
      // Check if we're resuming from a previous attempt
      const startingChapter = resumeFromChapter || 0;
      const remainingChapters = outline.length - startingChapter;
      
      if (startingChapter > 0) {
        addLog(`🔄 Resuming from Chapter ${startingChapter + 1} (${remainingChapters} chapters remaining)`, 'info');
      } else {
        addLog(`📝 Using existing outline with ${outline.length} chapters`, 'info');
      }
      
      // Set initial progress based on completed chapters
      const initialProgress = 20 + (startingChapter / outline.length * 70);
      setProgress(initialProgress);
      
      // Step 2: Start streaming generation
      addLog('🎥 Step 2: Starting live chapter generation...', 'info');
      
      const streamResponse = await apiService.startStreamingGeneration(outline, {
        genre: storyData.genre || 'fantasy',
        wordCount: storyData.wordCount || 50000,
        premise: storyData.synopsis,
        resumeFromChapter: startingChapter, // Tell backend where to start
        preferences: preferences,
        qualitySettings: qualitySettings // Pass quality enhancement settings
      });
      
      if (!streamResponse.success) {
        throw new Error('Failed to start streaming');
      }
      
      addLog(`🎬 Live stream started! Watch your novel being written...`, 'success');
      
      // Connect to stream
      const eventSource = apiService.createChapterStream(streamResponse.streamId);
      // Use existing completed chapters as starting point
      const chapters = [...completedChapters];
      
      // Enhanced debugging for EventSource
      eventSource.onopen = () => {
        console.log('🎥 EventSource connection opened');
        addLog('🔗 Live stream connection established', 'success');
      };
      
      eventSource.onmessage = (event) => {
        console.log('📨 Received stream event:', event.data);
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Parsed stream data:', data);
          handleLiveStreamEvent(data, chapters, storyData);
        } catch (error) {
          console.error('Stream event parsing error:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ Stream error:', error);
        console.log('❌ EventSource readyState:', eventSource.readyState);
        
        // Calculate how many chapters we've completed so far
        const currentProgress = chapters.length;
        addLog(`❌ Live stream failed at Chapter ${currentProgress + 1} - switching to batch recovery mode`, 'warning');
        eventSource.close();
        
        // Preserve streaming chapters in completedChapters state before switching to batch
        setCompletedChapters(prevCompleted => {
          const updated = [...prevCompleted];
          chapters.forEach(chapter => {
            const existingIndex = updated.findIndex(ch => ch.number === chapter.number);
            if (existingIndex >= 0) {
              updated[existingIndex] = chapter;
            } else {
              updated.push(chapter);
            }
          });
          return updated.sort((a, b) => a.number - b.number);
        });
        
        // Fallback to batch generation with recovery
        addLog(`🔄 Resuming with batch generation from Chapter ${currentProgress + 1}...`, 'info');
        startBatchGenerationWithRecovery(storyData, currentProgress, chapters).catch(fallbackError => {
          console.error('Fallback generation error:', fallbackError);
          throw fallbackError;
        });
      };
      
      // Store reference for cleanup
      let streamTimeout;
      const resetStreamTimeout = () => {
        if (streamTimeout) clearTimeout(streamTimeout);
        streamTimeout = setTimeout(() => {
          const currentProgress = chapters.length;
          console.log(`⏰ Stream timeout at Chapter ${currentProgress + 1} - switching to batch recovery`);
          addLog(`⏰ Stream timeout - resuming with batch mode from Chapter ${currentProgress + 1}`, 'warning');
          eventSource.close();
          
          // Preserve streaming chapters before switching to batch
          setCompletedChapters(prevCompleted => {
            const updated = [...prevCompleted];
            chapters.forEach(chapter => {
              const existingIndex = updated.findIndex(ch => ch.number === chapter.number);
              if (existingIndex >= 0) {
                updated[existingIndex] = chapter;
              } else {
                updated.push(chapter);
              }
            });
            return updated.sort((a, b) => a.number - b.number);
          });
          
          startBatchGenerationWithRecovery(storyData, currentProgress, chapters).catch(fallbackError => {
            console.error('Timeout fallback generation error:', fallbackError);
            throw fallbackError;
          });
        }, 300000); // 5 minute timeout
      };
      
      resetStreamTimeout(); // Start the timeout
      
      // Update event handlers to reset timeout
      const originalOnMessage = eventSource.onmessage;
      eventSource.onmessage = (event) => {
        resetStreamTimeout(); // Reset timeout on any message
        originalOnMessage(event);
      };
      
      abortControllerRef.current = { 
        abort: () => {
          if (streamTimeout) clearTimeout(streamTimeout);
          eventSource.close();
        }
      };
      
    } catch (error) {
      throw error;
    }
  };

  // Handle streaming events with recovery tracking
  const handleLiveStreamEvent = (data, chapters, storyData) => {
    switch (data.type) {
      case 'connected':
        addLog(`🔗 Connected to live stream`, 'success');
        break;
        
      case 'heartbeat':
        console.log(`💓 Heartbeat: Chapter ${data.chapterNumber} - ${data.message}`);
        setProgress(20 + (data.progress * 0.7)); // Update progress
        break;
        
      case 'chapter_start':
        addLog(`🖋️ Writing Chapter ${data.chapterNumber}: ${data.chapterTitle}...`, 'info');
        setProgress(20 + (data.progress * 0.7)); // 20-90% range
        break;
        
      case 'chapter_complete':
        const chapter = {
          ...data.chapter,
          number: data.chapterNumber,
          title: data.chapterTitle
        };
        chapters.push(chapter);
        
        // Update completedChapters state for recovery tracking
        setCompletedChapters(prev => {
          const updated = [...prev];
          // Ensure we don't duplicate chapters
          const existingIndex = updated.findIndex(ch => ch.number === chapter.number);
          if (existingIndex >= 0) {
            updated[existingIndex] = chapter;
          } else {
            updated.push(chapter);
          }
          return updated.sort((a, b) => a.number - b.number);
        });
        
        addLog(`✅ Chapter ${data.chapterNumber} completed! (${data.wordCount} words)`, 'success');
        setProgress(20 + (data.progress * 0.7));
        
        // Update result with current chapters
        const currentResult = {
          outline: outline,
          chapters: [...chapters],
          stats: {
            totalWords: chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0),
            chapterCount: chapters.length
          }
        };
        setResult(currentResult);
        break;
        
      case 'chapter_error':
        addLog(`❌ Error in Chapter ${data.chapterNumber}: ${data.error}`, 'error');
        // Don't fail completely, try to continue or fallback
        const currentProgress = chapters.length;
        addLog(`🔄 Attempting to recover from Chapter ${currentProgress + 1}...`, 'info');
        setTimeout(() => {
          startBatchGenerationWithRecovery(storyData, currentProgress, chapters);
        }, 2000);
        break;
        
      case 'complete':
        addLog(`🎉 Live generation complete! ${data.totalChapters} chapters, ${data.totalWords} words`, 'success');
        setProgress(100);
        setIsGenerating(false);
        onSuccess(result);
        break;
        
      case 'error':
        addLog(`❌ Stream error: ${data.message}`, 'error');
        // Attempt recovery instead of failing
        const errorProgress = chapters.length;
        addLog(`🔄 Attempting recovery from Chapter ${errorProgress + 1}...`, 'info');
        startBatchGenerationWithRecovery(storyData, errorProgress, chapters);
        break;
        
      default:
        console.log('Unknown stream event:', data);
    }
  };

  // Enhanced batch generation with recovery support
  const startBatchGenerationWithRecovery = async (storyData, startFromChapter = 0, existingChapters = []) => {
    try {
      // Use existing outline that was already created
      if (!outline || outline.length === 0) {
        throw new Error('No outline available. Please create outline first.');
      }
      
      const totalChapters = outline.length;
      const remainingChapters = totalChapters - startFromChapter;
      
      if (startFromChapter > 0) {
        addLog(`🔄 Resuming batch generation from Chapter ${startFromChapter + 1} (${remainingChapters} chapters remaining)`, 'info');
      } else {
        addLog(`📝 Using existing outline with ${outline.length} chapters`, 'info');
      }
      
      // Set initial progress based on completed chapters
      const initialProgress = 20 + (startFromChapter / totalChapters * 70);
      setProgress(initialProgress);
      
      // Start with existing chapters (from streaming or previous batch)
      const chapters = [...existingChapters];
      
      addLog(`📚 Generating remaining chapters (${startFromChapter + 1} to ${totalChapters})...`, 'info');
      
      for (let i = startFromChapter; i < totalChapters; i++) {
        const chapterOutline = outline[i];
        addLog(`Writing Chapter ${i + 1}: ${chapterOutline.title}...`, 'info');
        
        try {
          // Generate individual chapter with shorter timeout
          const chapterResponse = await apiService.makeRequest('/simple-generate-new/chapter', {
            method: 'POST',
            body: JSON.stringify({
              chapterOutline,
              context: {
                previousChapters: chapters,
                fullPremise: storyData.synopsis,
                genre: storyData.genre || 'fantasy',
                qualitySettings: qualitySettings // Move quality settings into context where backend expects it
              },
              preferences: preferences
            }),
            timeout: 300000 // 5 minutes per chapter for complex chapters
          });
          
          if (chapterResponse.success && chapterResponse.chapter) {
            // Ensure proper chapter numbering and ordering
            const chapter = {
              ...chapterResponse.chapter,
              number: i + 1,
              title: chapterResponse.chapter.title || `Chapter ${i + 1}`,
              chapterIndex: i
            };
            
            chapters.push(chapter);
            
            // Update completedChapters state for recovery tracking
            setCompletedChapters(prev => {
              const updated = [...prev];
              // Ensure we don't duplicate chapters
              const existingIndex = updated.findIndex(ch => ch.number === chapter.number);
              if (existingIndex >= 0) {
                updated[existingIndex] = chapter;
              } else {
                updated.push(chapter);
              }
              return updated.sort((a, b) => a.number - b.number);
            });
            
            const progressPercent = 20 + Math.round((i + 1) / totalChapters * 70); // 20-90%
            setProgress(progressPercent);
            addLog(`✅ Chapter ${i + 1} completed (${chapter.wordCount || 'unknown'} words)`, 'success');
            
            // Update result with current progress
            const currentResult = {
              outline: outline,
              chapters: [...chapters],
              stats: {
                totalWords: chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0),
                chapterCount: chapters.length
              }
            };
            setResult(currentResult);
            
          } else {
            throw new Error(`Failed to generate chapter ${i + 1}`);
          }
          
        } catch (chapterError) {
          addLog(`❌ Error generating chapter ${i + 1}: ${chapterError.message}`, 'error');
          // Continue with remaining chapters rather than failing completely
          addLog(`🔄 Continuing with next chapter...`, 'info');
        }
      }
      
      // Compile final result with better formatting
      addLog('📖 Step 3: Compiling final novel...', 'info');
      setProgress(95);
      
      // Sort chapters by number to ensure correct order
      chapters.sort((a, b) => (a.number || 0) - (b.number || 0));
      
      // Create full novel text with proper formatting
      const fullNovelText = chapters
        .map(ch => {
          const chapterTitle = ch.title || `Chapter ${ch.number || 'Unknown'}`;
          const chapterContent = ch.content || ch.text || '';
          return `# ${chapterTitle}\n\n${chapterContent}`;
        })
        .join('\n\n---\n\n');
      
      const data = {
        outline: outline,
        chapters: chapters,
        fullNovel: fullNovelText,
        stats: {
          totalWords: chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0),
          chapterCount: chapters.length,
          successfulChapters: chapters.filter(ch => ch.content || ch.text).length
        }
      };
      
      // Handle the response from simple generation
      if (data && data.outline && data.chapters) {
        addLog(`✅ Novel generation completed! Generated ${data.chapters.length} chapters`, 'success');
        setResult(data);
        setProgress(100);
        setIsGenerating(false);
        onSuccess(data);
      } else {
        throw new Error('Invalid response from simple generation');
      }
      
    } catch (error) {
      throw error; // Re-throw to be handled by main function
    }
  };

  // Legacy batch generation (now calls recovery version)
  const startBatchGeneration = async (storyData) => {
    return startBatchGenerationWithRecovery(storyData, 0, []);
  };

  const createOutline = async () => {
    // Prevent multiple simultaneous outline creation attempts
    if (isCreatingOutline) {
      addLog('Outline creation already in progress...', 'warning');
      return;
    }

    // Cancel any existing outline creation if somehow still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      setIsCreatingOutline(true);
      setCurrentProcess('Analyzing your synopsis with GPT-4...');
      
      // Create new abort controller specifically for outline creation
      abortControllerRef.current = new AbortController();
      
      const outlineData = {
        title: storySetup.title,
        genre: storySetup.genre,
        subgenre: storySetup.subgenre,
        genreInstructions: genreCategories[storySetup.genre]?.subgenres[storySetup.subgenre]?.instructions || '',
        wordCount: storySetup.wordCount,
        chapters: calculatedChapters,
        targetChapterLength: storySetup.targetChapterLength,
        synopsis: storySetup.synopsis,
        fictionLength: storySetup.fictionLength,
        preferences: preferences,
        qualitySettings: qualitySettings // Include quality enhancement settings
      };

      // Debug logging
      console.log('🔍 Outline Data Debug:');
      console.log('Synopsis length being sent:', outlineData.synopsis.length);
      console.log('Synopsis first 200 chars:', outlineData.synopsis.substring(0, 200));
      console.log('Synopsis last 200 chars:', outlineData.synopsis.substring(outlineData.synopsis.length - 200));
      console.log('Full outline data structure:', {
        ...outlineData,
        synopsis: `[${outlineData.synopsis.length} characters]`
      });

      setCurrentProcess('Creating detailed story structure...');

      // Create a timeout promise to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Outline creation timed out after 5 minutes')), 300000);
      });

      // Race between API call and timeout
      const data = await Promise.race([
        apiService.createOutline(outlineData, abortControllerRef.current.signal),
        timeoutPromise
      ]);

      // Only update state if we haven't been aborted
      if (!abortControllerRef.current.signal.aborted) {
        setOutline(data.outline);
        setCurrentProcess('');
        setGenerationPhase('outline');
        addLog('Story outline created successfully', 'success');
        onNotification('Outline ready for review!', 'success');
      }

    } catch (error) {
      console.error('Outline creation error:', error);
      
      // Enhanced error logging and display
      const errorInfo = {
        message: error.message,
        timestamp: new Date().toISOString(),
        type: error.name || 'Error',
        status: error.status || 0,
        details: error.details || null,
        stack: error.stack
      };
      
      console.error('❌ Detailed Error Info:', errorInfo);
      
      // Don't update error state if this was intentionally aborted
      if (error.name !== 'AbortError' && !abortControllerRef.current?.signal.aborted) {
        setError(error);
        setCurrentProcess('');
        setGenerationPhase('setup');
        
        // Create detailed error message
        let errorMessage = `Outline creation failed: ${error.message}`;
        
        if (error.status) {
          errorMessage += ` (HTTP ${error.status})`;
        }
        
        if (error.details && error.details.errorCode) {
          errorMessage += ` [${error.details.errorCode}]`;
        }
        
        // Add suggestions if available
        if (error.getSuggestions && typeof error.getSuggestions === 'function') {
          const suggestions = error.getSuggestions();
          if (suggestions.length > 0) {
            errorMessage += `\n\nSuggestions:\n• ${suggestions.join('\n• ')}`;
          }
        }
        
        addLog(errorMessage, 'error');
        onError(error);
      } else if (error.name === 'AbortError') {
        addLog('Outline creation was cancelled', 'info');
        setCurrentProcess('');
        setGenerationPhase('setup');
      }
    } finally {
      setIsCreatingOutline(false);
    }
  };

  const startStreaming = (streamId) => {
    // Start Server-Sent Events stream
    const streamUrl = `${apiConfig.baseUrl}/streamGeneration/${streamId}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      addLog('Stream connected, generation started', 'success');
      onNotification('Live streaming started', 'success');
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        handleStreamEvent(eventData);
      } catch (error) {
        console.error('Error parsing stream data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Stream error:', error);
      setError(new Error('Stream connection error'));
      setIsGenerating(false);
      eventSource.close();
    };

    // Store reference for cleanup
    abortControllerRef.current = { abort: () => eventSource.close() };
  };

  const handleStreamEvent = (eventData) => {
    switch (eventData.type) {
      case 'status':
        setStatus(prev => ({ ...prev, status: eventData.status }));
        break;
        
      case 'chapter_start':
        setStatus(prev => ({ ...prev, currentChapter: eventData.chapter }));
        addLog(`Starting Chapter ${eventData.chapter}`, 'info');
        break;
        
      case 'content':
        // For streaming, we could show live content but for simplicity, just log progress
        break;
        
      case 'chapter_complete':
        const newProgress = (eventData.chapter / (conflictData?.chapters || storySetup.chapters)) * 100;
        setProgress(newProgress);
        setStatus(prev => ({ 
          ...prev, 
          chaptersCompleted: eventData.chapter,
          currentChapter: eventData.chapter + 1 
        }));
        addLog(`Chapter ${eventData.chapter} completed (${eventData.wordCount} words)`, 'success');
        break;
        
      case 'complete':
        setIsGenerating(false);
        setProgress(100);
        
        const result = {
          title: eventData.title,
          chapters: eventData.chapters,
          totalChapters: eventData.totalChapters,
          wordCount: eventData.totalWords,
          completedAt: new Date().toISOString()
        };
        
        setResult(result);
        onSuccess(result);
        addLog('Streaming generation completed!', 'success');
        onNotification('Novel generation completed!', 'success');
        break;
        
      case 'error':
        setError(new Error(eventData.error));
        setIsGenerating(false);
        addLog(`Generation error: ${eventData.error}`, 'error');
        onError(new Error(eventData.error));
        break;
        
      case 'progress':
        if (eventData.progress) {
          setProgress(eventData.progress);
        }
        break;
        
      default:
        console.log('Unknown stream event:', eventData);
    }
  };

  const startAdvancedStreaming = (streamId) => {
    // Start Server-Sent Events stream for advanced generation
    const streamUrl = `${apiConfig.baseUrl}/advancedStreamGeneration/${streamId}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      addLog('Advanced streaming connected', 'success');
      onNotification('Intelligent generation started', 'success');
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        handleAdvancedStreamEvent(eventData);
      } catch (error) {
        console.error('Error parsing advanced stream data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Advanced stream error:', error);
      setError(new Error('Advanced stream connection error'));
      setIsGenerating(false);
      eventSource.close();
    };

    // Store reference for cleanup
    abortControllerRef.current = { abort: () => eventSource.close() };
  };

  const handleAdvancedStreamEvent = (eventData) => {
    switch (eventData.type) {
      case 'process_update':
        setCurrentProcess(eventData.message);
        addLog(eventData.message, 'info');
        break;
        
      case 'chapter_planning':
        setCurrentProcess(`Planning Chapter ${eventData.chapter}: ${eventData.title}`);
        addLog(`Planning Chapter ${eventData.chapter}: ${eventData.title}`, 'info');
        break;
        
      case 'chapter_writing':
        setCurrentProcess(`Writing Chapter ${eventData.chapter}: ${eventData.title}`);
        addLog(`Writing Chapter ${eventData.chapter}...`, 'info');
        break;
        
      case 'chapter_complete':
        const newProgress = (eventData.chapter / calculatedChapters) * 100;
        setProgress(newProgress);
        setStatus(prev => ({ 
          ...prev, 
          chaptersCompleted: eventData.chapter,
          currentChapter: eventData.chapter + 1 
        }));
        addLog(`Chapter ${eventData.chapter} completed (${eventData.wordCount} words)`, 'success');
        setCurrentProcess(`Chapter ${eventData.chapter} complete. Moving to next chapter...`);
        break;
        
      case 'complete':
        setIsGenerating(false);
        setProgress(100);
        setCurrentProcess('Generation complete!');
        
        const result = {
          title: eventData.title,
          chapters: eventData.chapters,
          totalChapters: eventData.totalChapters,
          wordCount: eventData.totalWords,
          completedAt: new Date().toISOString()
        };
        
        setResult(result);
        onSuccess(result);
        addLog('Advanced novel generation completed!', 'success');
        onNotification('Your novel is ready!', 'success');
        break;
        
      case 'error':
        setError(new Error(eventData.error));
        setIsGenerating(false);
        setCurrentProcess('');
        addLog(`Generation error: ${eventData.error}`, 'error');
        onError(new Error(eventData.error));
        break;
        
      default:
        console.log('Unknown advanced stream event:', eventData);
    }
  };

  const startPolling = (id) => {
    intervalRef.current = setInterval(async () => {
      try {
        // Use the API service instead of raw fetch
        const data = await apiService.getGenerationStatus(id);
        
        const jobStatus = data.job;
        setStatus(jobStatus);
        setProgress(jobStatus.progress || 0);

        // Update logs with new entries
        if (jobStatus.logs && jobStatus.logs.length > logs.length) {
          const newLogs = jobStatus.logs.slice(logs.length);
          newLogs.forEach(log => addLog(log.message, log.type));
        }

        // Handle job completion
        if (jobStatus.status === 'completed') {
          clearInterval(intervalRef.current);
          setIsGenerating(false);
          setResult(jobStatus.result);
          addLog('Novel generation completed successfully!', 'success');
          onSuccess(jobStatus.result);
          onNotification('Novel generated successfully!', 'success');
        } else if (jobStatus.status === 'failed') {
          clearInterval(intervalRef.current);
          setIsGenerating(false);
          const errorMsg = jobStatus.error || 'Generation failed';
          setError(new Error(errorMsg));
          addLog(`Generation failed: ${errorMsg}`, 'error');
          onError(new Error(errorMsg));
        }

      } catch (error) {
        console.error('Polling error:', error);
        addLog(`Polling error: ${error.message}`, 'error');
        
        // Don't stop generation for temporary network errors
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          addLog('Retrying connection...', 'warning');
        }
      }
    }, 2000); // Poll every 2 seconds
  };

  const startAdvancedPolling = (jobId) => {
    intervalRef.current = setInterval(async () => {
      try {
        // Use the API service instead of raw fetch
        const data = await apiService.getGenerationStatus(jobId);
        
        const jobStatus = data.job;
        setStatus(jobStatus);
        setProgress(jobStatus.progress || 0);
        
        if (jobStatus.currentProcess) {
          setCurrentProcess(jobStatus.currentProcess);
        }

        // Update logs with new entries
        if (jobStatus.logs && jobStatus.logs.length > logs.length) {
          const newLogs = jobStatus.logs.slice(logs.length);
          newLogs.forEach(log => addLog(log.message, log.type));
        }

        // Handle job completion
        if (jobStatus.status === 'completed') {
          clearInterval(intervalRef.current);
          setIsGenerating(false);
          setCurrentProcess('');
          setResult(jobStatus.result);
          addLog('Advanced novel generation completed!', 'success');
          onSuccess(jobStatus.result);
          onNotification('Your novel is ready!', 'success');
        } else if (jobStatus.status === 'failed') {
          clearInterval(intervalRef.current);
          setIsGenerating(false);
          setCurrentProcess('');
          const errorMsg = jobStatus.error || 'Generation failed';
          setError(new Error(errorMsg));
          addLog(`Generation failed: ${errorMsg}`, 'error');
          onError(new Error(errorMsg));
        }

      } catch (error) {
        console.error('Advanced polling error:', error);
        addLog(`Polling error: ${error.message}`, 'error');
      }
    }, 3000); // Poll every 3 seconds for advanced generation
  };

  const cancelGeneration = async () => {
    if (!jobId) return;

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Use the API service instead of raw fetch
      await apiService.cancelGeneration(jobId);

      setIsGenerating(false);
      setJobId(null);
      addLog('Generation cancelled by user', 'warning');
      onNotification('Generation cancelled', 'warning');

    } catch (error) {
      console.error('Cancel error:', error);
      addLog(`Error cancelling generation: ${error.message}`, 'error');
    }
  };

  const handleDownload = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadFullNovel = async () => {
    if (!result) return;

    try {
      // Handle both old and new result formats
      const title = result.title || storySetup.title || 'Generated Novel';
      const author = result.author || 'AI Generated';
      
      // Create document sections
      const children = [];
      
      // Title page
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: title,
              bold: true,
              size: 32,
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `by ${author}`,
              italics: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        })
      );
      
      // Add stats if available
      if (result.stats) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Words: ${result.stats.totalWords || 'Unknown'}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Chapters: ${result.stats.chapterCount || 'Unknown'}`,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          })
        );
      }
      
      // Page break before chapters
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "", break: 1 })],
          pageBreakBefore: true,
        })
      );

      // Add chapters
      if (result.chapters && result.chapters.length > 0) {
        // Sort chapters by number to ensure correct order
        const sortedChapters = [...result.chapters].sort((a, b) => (a.number || 0) - (b.number || 0));
        
        sortedChapters.forEach((chapter, index) => {
          const chapterNum = chapter.number || chapter.chapterIndex + 1 || index + 1;
          const chapterTitle = chapter.title || `Chapter ${chapterNum}`;
          const chapterContent = chapter.content || chapter.text || 'No content available';
          
          // Chapter heading
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Chapter ${chapterNum}`,
                  bold: true,
                  size: 28,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            })
          );
          
          // Chapter title (if different from "Chapter X")
          if (chapterTitle !== `Chapter ${chapterNum}`) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: chapterTitle,
                    bold: true,
                    size: 24,
                  }),
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { after: 300 },
              })
            );
          }
          
          // Chapter content - split into paragraphs
          const paragraphs = chapterContent.split('\n\n').filter(p => p.trim().length > 0);
          paragraphs.forEach(paragraphText => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: paragraphText.trim(),
                    size: 24,
                  }),
                ],
                spacing: { after: 200 },
                indent: { firstLine: 720 }, // First line indent
              })
            );
          });
          
          // Add space between chapters (except for the last one)
          if (index < sortedChapters.length - 1) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: "", break: 2 })],
                spacing: { after: 400 },
              })
            );
          }
        });
      } else if (result.fullNovel) {
        // Fallback to full novel text if chapters aren't available
        const paragraphs = result.fullNovel.split('\n\n').filter(p => p.trim().length > 0);
        paragraphs.forEach(paragraphText => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraphText.trim(),
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
              indent: { firstLine: 720 },
            })
          );
        });
      }

      // Create the document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: children,
          },
        ],
      });

      // Generate and download the document using browser-compatible method
      const blob = await Packer.toBlob(doc);
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_novel.docx`;
      
      saveAs(blob, filename);
      
      addLog(`✅ Novel downloaded as ${filename}`, 'success');
      onNotification('Novel downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('Download error:', error);
      addLog(`❌ Download failed: ${error.message}`, 'error');
      onError(new Error(`Failed to download novel: ${error.message}`));
    }
  };

  const reset = () => {
    setIsGenerating(false);
    setJobId(null);
    setStatus(null);
    setProgress(0);
    setResult(null);
    setError(null);
    setLogs([]);
    setIsCreatingOutline(false);
    setCurrentProcess('');
    setGenerationPhase('setup');
    setOutline([]);
    setCompletedChapters([]); // Clear recovery state
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const cancelOutlineCreation = () => {
    if (isCreatingOutline && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsCreatingOutline(false);
      setCurrentProcess('');
      setGenerationPhase('setup');
      addLog('Outline creation cancelled by user', 'warning');
      onNotification('Outline creation cancelled', 'warning');
    }
  };

  const forceStopGeneration = () => {
    // Force stop all generation processes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setIsGenerating(false);
    setIsCreatingOutline(false);
    setJobId(null);
    setCurrentProcess('');
    setGenerationPhase('setup');
    // Note: Don't clear completedChapters here - user might want to resume
    addLog('🛑 Generation forcefully stopped by user', 'warning');
    onNotification('Generation stopped', 'warning');
  };

  // Generate quality enhancement instructions for AI prompts
  const generateQualityInstructions = (qualitySettings) => {
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
    
    // Advanced Anti-AI Pattern Settings
    if (qualitySettings.asymmetricalCharacterArcs) {
      instructions.push("ASYMMETRICAL CHARACTER DEVELOPMENT: Characters should follow completely different growth patterns - some develop quickly, others slowly, some focus on spiritual growth while others learn practical wisdom. Avoid synchronized character development where everyone learns similar lessons at similar paces.");
    }
    
    if (qualitySettings.genuineCharacterConflict) {
      instructions.push("AUTHENTIC CHARACTER DISAGREEMENTS: Characters should have meaningful disagreements about methods, priorities, and interpretations of events. Let characters argue, misunderstand each other, and reach different conclusions about the same situation. Not all conflicts should resolve neatly.");
    }
    
    if (qualitySettings.asymmetricalThematicFocus) {
      instructions.push("UNEVEN THEMATIC ATTENTION: Give different themes vastly different amounts of exploration. Some spiritual concepts might be mentioned briefly while others get deep exploration. Some chapters might focus heavily on one theme while ignoring others completely.");
    }
    
    if (qualitySettings.messyResolutions) {
      instructions.push("IMPERFECT ENDINGS: Not all conflicts should resolve cleanly. Some problems should have lasting consequences, some relationships should remain strained, some questions should stay unanswered. Show that some damage takes time to heal or may never fully heal.");
    }
    
    if (qualitySettings.chapterVoiceVariation) {
      instructions.push("CHAPTER VOICE SHIFTS: Each chapter should feel like it was written in a different session or mood. Vary the complexity of descriptions, the pace of dialogue, the focus on action vs reflection. Some chapters should be more introspective, others more action-focused.");
    }
    
    if (qualitySettings.theologicalAmbiguity) {
      instructions.push("SPIRITUAL UNCERTAINTY: Include moments where characters don't understand God's will, where prayer doesn't bring clarity, where faithful people reach different conclusions. Some theological questions should remain open, some character's spiritual experiences should be ambiguous.");
    }
    
    if (qualitySettings.paceInconsistency) {
      instructions.push("IRREGULAR PACING: Some chapters should move very slowly with detailed description and contemplation, others should rush through events quickly. Don't maintain consistent pacing - let the narrative speed vary naturally based on content and mood.");
    }
    
    if (qualitySettings.imperfectDialogue) {
      instructions.push("REALISTIC CONVERSATION: Characters should interrupt each other, misunderstand, speak at cross-purposes, and have conversations that don't reach clear conclusions. Include awkward silences, half-finished thoughts, and dialogue that doesn't always advance the plot.");
    }
    
    if (qualitySettings.humanInconsistencies) {
      instructions.push("CHARACTER CONTRADICTIONS: Characters should occasionally act inconsistently with their established personalities - being wise in one situation but foolish in another, brave sometimes but fearful at other times. Show human complexity and unpredictability.");
    }
    
    if (qualitySettings.imperfectWisdom) {
      instructions.push("FLAWED MENTOR GUIDANCE: Mentors and wise characters should sometimes give incomplete advice, be wrong about situations, or struggle with their own doubts. Their wisdom should feel earned through struggle rather than effortlessly perfect.");
    }
    
    if (qualitySettings.naturalLanguageFlaws) {
      instructions.push("ORGANIC LANGUAGE PATTERNS: Include natural speech patterns like trailing off, starting sentences differently than intended, using imprecise language, and having characters search for the right words. Avoid overly polished, literary dialogue.");
    }
    
    if (qualitySettings.inconsistentEmotions) {
      instructions.push("EMOTIONAL COMPLEXITY: Characters should experience conflicting emotions simultaneously - feeling grateful but resentful, hopeful but afraid, loving but frustrated. Emotional states should shift unexpectedly and not always match the situation logically.");
    }
    
    if (qualitySettings.narrativeAsymmetry) {
      instructions.push("STORY STRUCTURE IRREGULARITY: Chapters should vary dramatically in length, focus, and importance. Some chapters should feel transitional, others climactic. Don't follow a rigid three-act structure - let the story develop organically with uneven emphasis.");
    }
    
    if (qualitySettings.authenticImperfection) {
      instructions.push("EMBRACE FLAWS: Include moments that feel slightly awkward, conversations that don't quite work, descriptions that are imperfect, and plot elements that are rough around the edges. Perfect prose can feel artificial - aim for authentic human storytelling.");
    }
    
    if (qualitySettings.randomMoments) {
      instructions.push("ORGANIC DETAILS: Include small, seemingly insignificant moments that don't advance the plot - characters noticing random details, having brief interactions that don't lead anywhere, or experiencing minor events that feel human but aren't symbolically important.");
    }
    
    return instructions.length > 0 ? 
      `\n\nWRITING QUALITY ENHANCEMENT INSTRUCTIONS:\n${instructions.map(inst => `• ${inst}`).join('\n')}\n` : 
      '';
  };

  if (result) {
    return (
      <div className="auto-generate results">
        <div className="results-header">
          <h2>🤖 Auto-Generation Complete!</h2>
          <p>Your novel has been generated chapter by chapter with detailed progression.</p>
          
          <div className="generation-stats">
            <div className="stat">
              <strong>Chapters:</strong> {result.chapters?.length || 0}
            </div>
            <div className="stat">
              <strong>Total Words:</strong> {result.wordCount?.toLocaleString() || 'N/A'}
            </div>
            <div className="stat">
              <strong>Generation Time:</strong> {status?.duration || 'N/A'}
            </div>
          </div>
        </div>

        <div className="novel-actions">
          <button 
            className="btn btn-success btn-large"
            onClick={downloadFullNovel}
          >
            📥 Download as Word Document (.docx)
          </button>
          
          <button 
            className="btn btn-outline"
            onClick={reset}
          >
            🔄 Generate Another
          </button>
        </div>

        <div className="chapters-generated">
          <h3>📚 Generated Chapters</h3>
          <div className="chapters-list">
            {result.chapters?.map((chapter, index) => (
              <div key={index} className="chapter-item auto-generated">
                <div className="chapter-header">
                  <h4>Chapter {chapter.number || index + 1}: {chapter.title || `Chapter ${index + 1}`}</h4>
                  <div className="chapter-meta">
                    <span className="word-count">{chapter.wordCount || 'Unknown'} words</span>
                    <button 
                      className="btn btn-small"
                      onClick={() => {
                        const content = chapter.content || chapter.text || 'No content available';
                        const filename = `chapter_${chapter.number || index + 1}_${(chapter.title || '').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
                        handleDownload(content, filename);
                      }}
                    >
                      📄 Download
                    </button>
                  </div>
                </div>
                <div className="chapter-preview">
                  {(chapter.content || chapter.text || 'No content available').substring(0, 300)}...
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="generation-log">
          <h4>📋 Generation Log</h4>
          <div className="log-container">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry log-${log.type}`}>
                <span className="log-timestamp">{log.timestamp}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auto-generate">
      <div className="generate-header">
        <h2>🤖 Auto Generate</h2>
        <p>Fully automated chapter-by-chapter novel generation with real-time progress</p>
      </div>

      {!conflictData ? (
        <div className="story-setup">
          {generationPhase === 'setup' && (
            <>
              <h3>📖 Create Your Story</h3>
              <p>Design your novel step-by-step with our intelligent generation system.</p>
              
              {/* Genre Selection */}
              <div className="setup-section">
                <h4>🎭 Choose Your Genre</h4>
                <div className="genre-cards">
                  {Object.entries(genreCategories).map(([key, category]) => (
                    <div
                      key={key}
                      className={`genre-card ${selectedGenreCategory === key ? 'selected' : ''}`}
                      onClick={() => setSelectedGenreCategory(selectedGenreCategory === key ? null : key)}
                    >
                      <span className="genre-icon">{category.icon}</span>
                      <h5>{category.name}</h5>
                      <p>{category.description}</p>
                    </div>
                  ))}
                </div>

                {selectedGenreCategory && (
                  <div className="subgenre-selection">
                    <h5>Choose {genreCategories[selectedGenreCategory].name} Subgenre:</h5>
                    <div className="subgenre-cards">
                      {Object.entries(genreCategories[selectedGenreCategory].subgenres).map(([key, subgenre]) => (
                        <div
                          key={key}
                          className={`subgenre-card ${storySetup.subgenre === key ? 'selected' : ''}`}
                          onClick={() => setStorySetup(prev => ({ 
                            ...prev, 
                            genre: selectedGenreCategory,
                            subgenre: key 
                          }))}
                        >
                          <h6>{subgenre.name}</h6>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fiction Length Selection */}
              {storySetup.subgenre && (
                <div className="setup-section">
                  <h4>📏 Choose Fiction Length</h4>
                  <div className="length-cards">
                    {Object.entries(fictionLengths).map(([key, length]) => (
                      <div
                        key={key}
                        className={`length-card ${selectedLengthCategory === key ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedLengthCategory(key);
                          setStorySetup(prev => ({ 
                            ...prev, 
                            fictionLength: key,
                            wordCount: length.minWords + Math.round((length.maxWords - length.minWords) / 2),
                            targetChapterLength: length.suggestedChapterLength
                          }));
                        }}
                      >
                        <span className="length-icon">{length.icon}</span>
                        <h5>{length.name}</h5>
                        <p className="length-range">{length.range}</p>
                        <p className="length-desc">{length.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Word Count Fine-tuning */}
              {selectedLengthCategory && (
                <div className="setup-section">
                  <h4>🎯 Fine-tune Your Story</h4>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Target Word Count</label>
                      <input
                        type="number"
                        className="form-input"
                        min={fictionLengths[selectedLengthCategory].minWords}
                        max={fictionLengths[selectedLengthCategory].maxWords}
                        value={storySetup.wordCount || ''}
                        onChange={(e) => setStorySetup(prev => ({ ...prev, wordCount: parseInt(e.target.value) || 0 }))}
                      />
                      <small>Range: {fictionLengths[selectedLengthCategory].range}</small>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Target Words Per Chapter</label>
                      <input
                        type="number"
                        className="form-input"
                        min="500"
                        max="5000"
                        step="100"
                        value={storySetup.targetChapterLength || ''}
                        onChange={(e) => setStorySetup(prev => ({ ...prev, targetChapterLength: parseInt(e.target.value) || 2000 }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Chapter Length Variance (±)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="100"
                        max="1000"
                        step="50"
                        value={storySetup.chapterVariance || ''}
                        onChange={(e) => setStorySetup(prev => ({ ...prev, chapterVariance: parseInt(e.target.value) || 500 }))}
                      />
                      <small>Chapters can be ±{storySetup.chapterVariance} words from target</small>
                    </div>
                  </div>

                  <div className="chapter-preview">
                    <h5>📊 Story Structure Preview</h5>
                    <div className="preview-stats">
                      <div className="stat">
                        <strong>Estimated Chapters:</strong> {calculatedChapters}
                      </div>
                      <div className="stat">
                        <strong>Average Chapter Length:</strong> {calculatedChapters > 0 ? Math.round(storySetup.wordCount / calculatedChapters) : 0} words
                      </div>
                      <div className="stat">
                        <strong>Chapter Range:</strong> {storySetup.targetChapterLength - storySetup.chapterVariance} - {storySetup.targetChapterLength + storySetup.chapterVariance} words
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Synopsis Input */}
              {calculatedChapters > 0 && (
                <div className="setup-section">
                  <h4>📝 Story Synopsis</h4>
                  <p>
                    Provide a detailed synopsis. <strong>Recommended: 12K-20K characters (~2,000-3,500 words)</strong> for optimal AI processing.
                    <br />
                    <small style={{ color: '#666' }}>Up to 60,000 characters supported, but larger premises may timeout.</small>
                  </p>
                  
                  <div className="form-group">
                    <textarea
                      className="form-textarea synopsis-input"
                      rows="15"
                      maxLength="60000"
                      placeholder="Write your detailed story synopsis here. Include main characters, plot points, themes, setting, conflicts, and how you want the story to develop. The AI will use this as the foundation for your entire novel..."
                      value={storySetup.synopsis}
                      onChange={(e) => setStorySetup(prev => ({ ...prev, synopsis: e.target.value }))}
                      style={{ 
                        minHeight: '300px',
                        resize: 'vertical',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}
                    />
                    <div className="character-count">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          {storySetup.synopsis.length.toLocaleString()} / 60,000 characters (~{Math.round(storySetup.synopsis.length / 6)} words)
                        </span>
                        <span style={{ 
                          fontSize: '12px', 
                          color: storySetup.synopsis.length <= 20000 ? '#22c55e' : 
                                 storySetup.synopsis.length <= 30000 ? '#f59e0b' : '#ef4444',
                          fontWeight: 'bold'
                        }}>
                          {storySetup.synopsis.length <= 12000 && '✅ Optimal'}
                          {storySetup.synopsis.length > 12000 && storySetup.synopsis.length <= 20000 && '🎯 Ideal'}
                          {storySetup.synopsis.length > 20000 && storySetup.synopsis.length <= 30000 && '⚠️ Large'}
                          {storySetup.synopsis.length > 30000 && '🚨 Very Large'}
                        </span>
                      </div>
                      
                      {storySetup.synopsis.length > 20000 && storySetup.synopsis.length <= 30000 && (
                        <div style={{ color: '#f59e0b', fontSize: '12px', marginTop: '5px' }}>
                          ⚠️ Large premise detected. May take 60-90 seconds to process.
                        </div>
                      )}
                      
                      {storySetup.synopsis.length > 30000 && (
                        <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '5px' }}>
                          🚨 Very large premise. Risk of timeouts. Consider using 20K characters (~3,500 words) for optimal results.
                        </div>
                      )}
                      
                      {storySetup.synopsis.length <= 20000 && storySetup.synopsis.length > 0 && (
                        <div style={{ color: '#22c55e', fontSize: '12px', marginTop: '5px' }}>
                          ✅ Great size! Should process reliably in 30-60 seconds.
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        type="button"
                        className="btn btn-small btn-outline"
                        onClick={() => {
                          console.log('🔍 Synopsis Debug Info:');
                          console.log('Length:', storySetup.synopsis.length);
                          console.log('Word count estimate:', Math.round(storySetup.synopsis.length / 6));
                          console.log('First 100 chars:', storySetup.synopsis.substring(0, 100));
                          console.log('Last 100 chars:', storySetup.synopsis.substring(storySetup.synopsis.length - 100));
                          alert(`Synopsis Debug:\nLength: ${storySetup.synopsis.length} characters\nWords: ~${Math.round(storySetup.synopsis.length / 6)}\nCheck console for more details`);
                        }}
                      >
                        🔍 Debug Synopsis Length
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Title Input - Last Step */}
              {storySetup.synopsis.length > 100 && (
                <div className="setup-section">
                  <h4>📚 Novel Title</h4>
                  <p>Finally, give your masterpiece a title (you can always change this later):</p>
                  
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-input title-input"
                      placeholder="Enter your novel title..."
                      value={storySetup.title}
                      onChange={(e) => setStorySetup(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="generation-options">
                    <h5>� Generation Options</h5>
                    <div className="form-checkboxes">
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={generationMode === 'stream'}
                          onChange={(e) => setGenerationMode(e.target.checked ? 'stream' : 'batch')}
                        />
                        Enable Live Streaming (watch the AI plan and write your novel in real-time)
                      </label>
                    </div>
                  </div>

                  <div className="proceed-actions">
                    <button 
                      className="btn btn-primary btn-large"
                      onClick={async () => {
                        if (!isCreatingOutline) {
                          setGenerationPhase('planning');
                          await createOutline();
                        }
                      }}
                      disabled={!storySetup.title || storySetup.synopsis.length < 100 || isCreatingOutline}
                    >
                      {isCreatingOutline ? '🧠 Creating Outline...' : '🧠 Start Planning Phase'}
                    </button>
                    
                    <div className="planning-info">
                      <h6>What happens next:</h6>
                      <ul>
                        <li>AI analyzes your synopsis and creates a detailed outline</li>
                        <li>You can review and adjust the outline before generation</li>
                        <li>AI writes each chapter using advanced iterative process</li>
                        <li>Each chapter builds on previous chapters for consistency</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {generationPhase === 'planning' && (
            <div className="planning-phase">
              <h3>🧠 Planning Your Novel</h3>
              <div className="current-process">
                {currentProcess && (
                  <div className="process-indicator">
                    <div className="spinner"></div>
                    <span>{currentProcess}</span>
                  </div>
                )}
              </div>
              
              {isCreatingOutline && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button 
                    className="btn btn-error"
                    onClick={cancelOutlineCreation}
                  >
                    ❌ Cancel Planning
                  </button>
                </div>
              )}
            </div>
          )}

          {generationPhase === 'outline' && outline.length > 0 && (
            <div className="outline-phase">
              <h3>📋 Review & Edit Your Story Outline</h3>
              <p>The AI has created a detailed outline. Review and edit as needed before generation begins.</p>
              
              <div className="outline-editor">
                {outline.map((chapter, index) => (
                  <div key={index} className="outline-chapter">
                    <h5>Chapter {index + 1}: {chapter.title}</h5>
                    <textarea
                      value={chapter.summary}
                      onChange={(e) => {
                        const newOutline = [...outline];
                        newOutline[index].summary = e.target.value;
                        setOutline(newOutline);
                      }}
                      rows="3"
                    />
                  </div>
                ))}
              </div>

              <div className="outline-actions">
                <button 
                  className="btn btn-primary btn-large"
                  onClick={startGeneration}
                >
                  🚀 Begin Novel Generation
                </button>
                <button 
                  className="btn btn-outline"
                  onClick={() => setGenerationPhase('planning')}
                >
                  ← Back to Planning
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {!isGenerating && !result && (
            <>
              <div className="conflict-summary">
                <h3>📋 Your Story Setup</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <strong>Title:</strong> {conflictData.title}
                  </div>
                  <div className="summary-item">
                    <strong>Chapters:</strong> {conflictData.chapters}
                  </div>
                  <div className="summary-item">
                    <strong>Target Words:</strong> {conflictData.targetWordCount?.toLocaleString()}
                  </div>
                  <div className="summary-item">
                    <strong>Genre:</strong> {conflictData.genre}
                  </div>
                </div>
              </div>

              <div className="generation-preferences">
                <h3>⚙️ Generation Settings</h3>
                
                <div className="form-group">
                  <label className="form-label">Generation Mode</label>
                  <div className="form-checkboxes">
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={generationMode === 'stream'}
                        onChange={(e) => setGenerationMode(e.target.checked ? 'stream' : 'batch')}
                      />
                      Enable Live Streaming (watch your novel being written in real-time)
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Chapter Length</label>
                  <select 
                    className="form-select"
                    value={preferences.chapterLength}
                    onChange={(e) => setPreferences(prev => ({ ...prev, chapterLength: e.target.value }))}
                  >
                    <option value="short">Short (2,000-3,000 words)</option>
                    <option value="moderate">Moderate (3,000-4,500 words)</option>
                    <option value="long">Long (4,500-6,000 words)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Detail Level</label>
                  <select 
                    className="form-select"
                    value={preferences.detailLevel}
                    onChange={(e) => setPreferences(prev => ({ ...prev, detailLevel: e.target.value }))}
                  >
                    <option value="high">High Detail (Rich descriptions, dialogue)</option>
                    <option value="moderate">Moderate Detail (Balanced narrative)</option>
                    <option value="focused">Focused (Plot-driven, concise)</option>
                  </select>
                </div>

                <div className="preferences-checkboxes">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.includeSceneBreaks}
                      onChange={(e) => setPreferences(prev => ({ ...prev, includeSceneBreaks: e.target.checked }))}
                    />
                    Include scene breaks within chapters
                  </label>

                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.includeDividers}
                      onChange={(e) => setPreferences(prev => ({ ...prev, includeDividers: e.target.checked }))}
                    />
                    Add chapter dividers and formatting
                  </label>

                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.generateExtras}
                      onChange={(e) => setPreferences(prev => ({ ...prev, generateExtras: e.target.checked }))}
                    />
                    Generate character notes and outline
                  </label>
                </div>
              </div>

              {/* Writing Quality Enhancement Settings */}
              <div className="generation-preferences quality-settings">
                <h3>🎨 Writing Quality Enhancement</h3>
                <p className="quality-description">
                  Advanced settings to make AI writing more natural, varied, and engaging
                </p>
                
                <div className="quality-categories">
                  <div className="quality-category">
                    <h4>📖 Narrative Style</h4>
                    <div className="preferences-checkboxes">
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.varyTheologicalExplanations}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, varyTheologicalExplanations: e.target.checked }))}
                        />
                        Vary theological explanations (avoid repetitive phrasing)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.showDontTellTheology}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, showDontTellTheology: e.target.checked }))}
                        />
                        Show theology through character experiences
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.allowUnevenPacing}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, allowUnevenPacing: e.target.checked }))}
                        />
                        Allow uneven pacing and focus distribution
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.imperfectTiming}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, imperfectTiming: e.target.checked }))}
                        />
                        Realistic timing (help doesn't always arrive perfectly)
                      </label>
                    </div>
                  </div>

                  <div className="quality-category">
                    <h4>👥 Character Development</h4>
                    <div className="preferences-checkboxes">
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.includeSetbacks}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, includeSetbacks: e.target.checked }))}
                        />
                        Include realistic setbacks and struggles
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.showInternalConflict}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, showInternalConflict: e.target.checked }))}
                        />
                        Show internal conflict rather than stating it
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.allowBacksliding}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, allowBacksliding: e.target.checked }))}
                        />
                        Allow characters to backslide or doubt
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.varyCharacterFocus}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, varyCharacterFocus: e.target.checked }))}
                        />
                        Vary character development speeds and focus
                      </label>
                    </div>
                  </div>

                  <div className="quality-category">
                    <h4>💬 Dialogue & Voice</h4>
                    <div className="preferences-checkboxes">
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.uniqueVoices}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, uniqueVoices: e.target.checked }))}
                        />
                        Give each character a distinctive voice
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.characterSpecificSpeech}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, characterSpecificSpeech: e.target.checked }))}
                        />
                        Use character-specific metaphors and speech patterns
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.varySentenceStructure}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, varySentenceStructure: e.target.checked }))}
                        />
                        Vary sentence length and structure dramatically
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.dramaticPacing}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, dramaticPacing: e.target.checked }))}
                        />
                        Use sentence fragments and run-ons for effect
                      </label>
                    </div>
                  </div>

                  <div className="quality-category">
                    <h4>🌟 Depth & Complexity</h4>
                    <div className="preferences-checkboxes">
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.enhancedSensoryDetails}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, enhancedSensoryDetails: e.target.checked }))}
                        />
                        Include specific sensory details (sounds, smells, textures)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.showEmotionsPhysically}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, showEmotionsPhysically: e.target.checked }))}
                        />
                        Show emotions through physical sensations
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.includeMoralComplexity}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, includeMoralComplexity: e.target.checked }))}
                        />
                        Include genuine moral ambiguity and difficult choices
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.competingValues}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, competingValues: e.target.checked }))}
                        />
                        Show competing values and ethical dilemmas
                      </label>
                    </div>
                  </div>

                  <div className="quality-category">
                    <h4>🎲 Surprises & Antagonist</h4>
                    <div className="preferences-checkboxes">
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.includeSurprises}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, includeSurprises: e.target.checked }))}
                        />
                        Include genuinely surprising plot developments
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.organicPlotTwists}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, organicPlotTwists: e.target.checked }))}
                        />
                        Add characters who don't fit allegorical framework
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.allowSelfDiscovery}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, allowSelfDiscovery: e.target.checked }))}
                        />
                        Let characters solve problems without mentor help
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.complexAntagonist}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, complexAntagonist: e.target.checked }))}
                        />
                        Give antagonist compelling backstory and motivations
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.sympatheticVillain}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, sympatheticVillain: e.target.checked }))}
                        />
                        Make antagonist occasionally sympathetic despite being wrong
                      </label>
                    </div>
                  </div>

                  <div className="quality-category">
                    <h4>🧠 Anti-AI Pattern Settings</h4>
                    <p className="category-description">Advanced settings to make writing feel more human and less artificially generated</p>
                    <div className="preferences-checkboxes">
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.asymmetricalCharacterArcs}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, asymmetricalCharacterArcs: e.target.checked }))}
                        />
                        Asymmetrical character development (avoid synchronized growth)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.genuineCharacterConflict}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, genuineCharacterConflict: e.target.checked }))}
                        />
                        Characters disagree meaningfully (not all conflicts resolve neatly)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.asymmetricalThematicFocus}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, asymmetricalThematicFocus: e.target.checked }))}
                        />
                        Uneven thematic attention (some themes explored more than others)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.messyResolutions}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, messyResolutions: e.target.checked }))}
                        />
                        Imperfect endings (some conflicts have lasting consequences)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.chapterVoiceVariation}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, chapterVoiceVariation: e.target.checked }))}
                        />
                        Chapter voice shifts (different writing style per chapter)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.theologicalAmbiguity}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, theologicalAmbiguity: e.target.checked }))}
                        />
                        Embrace spiritual uncertainty (some questions stay unanswered)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.paceInconsistency}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, paceInconsistency: e.target.checked }))}
                        />
                        Irregular pacing (some chapters slow, others rushed)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.imperfectDialogue}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, imperfectDialogue: e.target.checked }))}
                        />
                        Realistic conversation (interruptions, misunderstandings, incomplete thoughts)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.humanInconsistencies}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, humanInconsistencies: e.target.checked }))}
                        />
                        Character contradictions (people act inconsistently like real humans)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.imperfectWisdom}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, imperfectWisdom: e.target.checked }))}
                        />
                        Flawed mentor guidance (wise characters make mistakes too)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.naturalLanguageFlaws}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, naturalLanguageFlaws: e.target.checked }))}
                        />
                        Natural speech patterns (trailing off, imprecise language, searching for words)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.inconsistentEmotions}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, inconsistentEmotions: e.target.checked }))}
                        />
                        Complex emotional states (conflicting emotions, unexpected shifts)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.narrativeAsymmetry}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, narrativeAsymmetry: e.target.checked }))}
                        />
                        Irregular story structure (chapters vary dramatically in length and importance)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.authenticImperfection}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, authenticImperfection: e.target.checked }))}
                        />
                        Embrace flaws (awkward moments, imperfect prose, rough edges)
                      </label>
                      
                      <label className="form-checkbox">
                        <input
                          type="checkbox"
                          checked={qualitySettings.randomMoments}
                          onChange={(e) => setQualitySettings(prev => ({ ...prev, randomMoments: e.target.checked }))}
                        />
                        Organic details (small moments that don't advance plot but feel human)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="quality-presets">
                  <h4>Quick Presets:</h4>
                  <div className="preset-buttons">
                    <button 
                      className="btn btn-small" 
                      onClick={() => setQualitySettings(Object.fromEntries(Object.keys(qualitySettings).map(key => [key, true])))}
                    >
                      ✨ Enable All
                    </button>
                    <button 
                      className="btn btn-small" 
                      onClick={() => setQualitySettings(Object.fromEntries(Object.keys(qualitySettings).map(key => [key, false])))}
                    >
                      📝 Disable All (Classic AI)
                    </button>
                    <button 
                      className="btn btn-small" 
                      onClick={() => {
                        const essentialSettings = {
                          varyTheologicalExplanations: true,
                          showDontTellTheology: true,
                          includeSetbacks: true,
                          uniqueVoices: true,
                          enhancedSensoryDetails: true,
                          varySentenceStructure: true
                        };
                        // Set all others to false
                        const allSettings = Object.fromEntries(
                          Object.keys(qualitySettings).map(key => [
                            key, 
                            essentialSettings.hasOwnProperty(key) ? essentialSettings[key] : false
                          ])
                        );
                        setQualitySettings(allSettings);
                      }}
                    >
                      🎯 Essential Only
                    </button>
                    <button 
                      className="btn btn-small" 
                      onClick={() => {
                        const humanLikeSettings = {
                          asymmetricalCharacterArcs: true,
                          genuineCharacterConflict: true,
                          asymmetricalThematicFocus: true,
                          messyResolutions: true,
                          chapterVoiceVariation: true,
                          theologicalAmbiguity: true,
                          paceInconsistency: true,
                          imperfectDialogue: true,
                          humanInconsistencies: true,
                          imperfectWisdom: true,
                          naturalLanguageFlaws: true,
                          inconsistentEmotions: true,
                          narrativeAsymmetry: true,
                          authenticImperfection: true,
                          randomMoments: true
                        };
                        // Set all others to false
                        const allSettings = Object.fromEntries(
                          Object.keys(qualitySettings).map(key => [
                            key, 
                            humanLikeSettings.hasOwnProperty(key) ? humanLikeSettings[key] : false
                          ])
                        );
                        setQualitySettings(allSettings);
                      }}
                    >
                      🧠 Anti-AI Patterns Only
                    </button>
                    <button 
                      className="btn btn-small" 
                      onClick={() => {
                        const balancedSettings = {
                          // Core quality settings
                          varyTheologicalExplanations: true,
                          showDontTellTheology: true,
                          includeSetbacks: true,
                          uniqueVoices: true,
                          enhancedSensoryDetails: true,
                          varySentenceStructure: true,
                          // Key anti-AI pattern settings
                          asymmetricalCharacterArcs: true,
                          genuineCharacterConflict: true,
                          messyResolutions: true,
                          chapterVoiceVariation: true,
                          imperfectDialogue: true,
                          humanInconsistencies: true
                        };
                        // Set all others to false
                        const allSettings = Object.fromEntries(
                          Object.keys(qualitySettings).map(key => [
                            key, 
                            balancedSettings.hasOwnProperty(key) ? balancedSettings[key] : false
                          ])
                        );
                        setQualitySettings(allSettings);
                      }}
                    >
                      ⚖️ Balanced Human-Like
                    </button>
                  </div>
                </div>
              </div>

              <div className="generation-actions">
                {completedChapters.length > 0 && !isGenerating && (
                  <div className="recovery-info">
                    <div className="recovery-banner">
                      📚 Found {completedChapters.length} completed chapters from previous session
                    </div>
                    <div className="recovery-actions">
                      <button 
                        className="btn btn-success btn-large"
                        onClick={() => startStreamingGeneration(conflictData || {
                          title: storySetup.title,
                          genre: `${storySetup.genre}_${storySetup.subgenre}`,
                          synopsis: storySetup.synopsis
                        }, completedChapters.length)}
                      >
                        🔄 Resume from Chapter {completedChapters.length + 1}
                      </button>
                      <button 
                        className="btn btn-outline"
                        onClick={() => setCompletedChapters([])}
                      >
                        🗑️ Clear & Start Fresh
                      </button>
                    </div>
                    <div className="completed-chapters-list">
                      <h4>Completed Chapters:</h4>
                      <div className="chapters-preview">
                        {completedChapters.map((chapter, index) => (
                          <div key={index} className="chapter-preview-item">
                            <span className="chapter-number">Ch. {chapter.number}</span>
                            <span className="chapter-title">{chapter.title}</span>
                            <span className="chapter-words">{chapter.wordCount || 'N/A'} words</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                <button 
                  className="btn btn-primary btn-large"
                  onClick={startGeneration}
                  disabled={completedChapters.length > 0}
                >
                  {completedChapters.length > 0 ? '🔄 Use Resume Button Above' : '🚀 Start Auto-Generation'}
                </button>
                
                <div className="auto-generation-info">
                  <h4>How Auto-Generation Works:</h4>
                  <ul>
                    <li>Generates chapters sequentially, one at a time</li>
                    <li>Each chapter builds on the previous ones</li>
                    <li>Real-time progress tracking and logs</li>
                    <li>Can be paused or cancelled at any time</li>
                    <li>🔄 Automatically resumes from last completed chapter if interrupted</li>
                    <li>Estimated time: 10-30 minutes for full novel</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {isGenerating && (
            <div className="generation-progress">
              <div className="progress-header">
                <h3>🤖 Intelligently Generating Your Novel</h3>
                <div className="cancel-buttons">
                  <button 
                    className="btn btn-error"
                    onClick={cancelGeneration}
                  >
                    ❌ Cancel Generation
                  </button>
                  <button 
                    className="btn btn-error btn-small"
                    onClick={forceStopGeneration}
                    title="Force stop all generation processes"
                  >
                    🛑 Force Stop
                  </button>
                </div>
              </div>

              {currentProcess && (
                <div className="current-process">
                  <div className="process-indicator">
                    <div className="spinner"></div>
                    <span className="process-text">{currentProcess}</span>
                  </div>
                </div>
              )}

              <div className="progress-bar-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className={`progress-text ${completedChapters.length > 0 ? 'recovery' : ''}`}>
                  {progress.toFixed(1)}% Complete
                  {completedChapters.length > 0 && (
                    <span> - Resumed from Chapter {completedChapters.length + 1}</span>
                  )}
                  {status?.currentChapter && (
                    <span> - Chapter {status.currentChapter} of {calculatedChapters || (conflictData?.chapters || storySetup.chapters)}</span>
                  )}
                  {completedChapters.length > 0 && result?.chapters && (
                    <span> - Total: {result.chapters.length} chapters completed</span>
                  )}
                </div>
              </div>

              {status && (
                <div className="status-info">
                  <div className="status-grid">
                    <div className="status-item">
                      <strong>Phase:</strong> {generationPhase === 'generating' ? 'Writing' : 'Planning'}
                    </div>
                    <div className="status-item">
                      <strong>Chapters Done:</strong> {status.chaptersCompleted || 0} / {calculatedChapters || (conflictData?.chapters || storySetup.chapters)}
                    </div>
                    <div className="status-item">
                      <strong>Elapsed Time:</strong> {status.elapsedTime || '0:00'}
                    </div>
                    <div className="status-item">
                      <strong>Est. Remaining:</strong> {status.estimatedRemaining || 'Calculating...'}
                    </div>
                  </div>
                </div>
              )}

              <div className="live-log">
                <h4>📋 Generation Log</h4>
                <div className="log-container live">
                  {logs.map((log, index) => (
                    <div key={index} className={`log-entry log-${log.type}`}>
                      <span className="log-timestamp">{log.timestamp}</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="generation-error">
              <h3>❌ Generation Error</h3>
              <p>{error.message}</p>
              <button 
                className="btn btn-primary"
                onClick={reset}
              >
                🔄 Try Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AutoGenerate;
