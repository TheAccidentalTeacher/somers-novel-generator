import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';
import apiService from '../services/apiService.js';
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
  
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [preferences, setPreferences] = useState({
    chapterLength: 'moderate',
    detailLevel: 'high',
    includeSceneBreaks: true,
    includeDividers: true,
    generateExtras: true
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
          instructions: 'Create fantasy world with clear Christian allegory, good vs evil themes, redemption arcs, sacrificial love, and biblical parallels in fantastical setting.'
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
      chapters: 2-4
    },
    short: {
      name: 'Short Story',
      icon: '📝',
      range: '2,000-7,000 words',
      description: 'Complete story with limited characters and single plot',
      minWords: 2000,
      maxWords: 7000,
      suggestedChapterLength: 1000,
      chapters: 2-7
    },
    novelette: {
      name: 'Novelette',
      icon: '📄',
      range: '7,001-17,500 words',
      description: 'Extended short story with more complex plot',
      minWords: 7001,
      maxWords: 17500,
      suggestedChapterLength: 1500,
      chapters: 5-12
    },
    novella: {
      name: 'Novella',
      icon: '📋',
      range: '17,501-50,000 words',
      description: 'Short novel with focused narrative and fewer subplots',
      minWords: 17501,
      maxWords: 50000,
      suggestedChapterLength: 2000,
      chapters: 9-25
    },
    novel: {
      name: 'Novel',
      icon: '📚',
      range: '50,001-110,000 words',
      description: 'Full-length novel with complex plot and character development',
      minWords: 50001,
      maxWords: 110000,
      suggestedChapterLength: 2500,
      chapters: 20-44
    },
    epic: {
      name: 'Epic Novel',
      icon: '📖',
      range: '110,001+ words',
      description: 'Large-scale novel with multiple plots and extensive world-building',
      minWords: 110001,
      maxWords: 200000,
      suggestedChapterLength: 3000,
      chapters: 37-67
    }
  };

  // Update API service when apiConfig changes
  useEffect(() => {
    if (apiConfig) {
      apiService.updateConfig({
        baseUrl: apiConfig.baseUrl,
        timeout: apiConfig.timeout || 30000
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
    if (storySetup.wordCount && storySetup.targetChapterLength) {
      const calculated = Math.round(storySetup.wordCount / storySetup.targetChapterLength);
      setCalculatedChapters(calculated);
    }
  }, [storySetup.wordCount, storySetup.targetChapterLength]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const startGeneration = async () => {
    // If we're in setup phase, start planning
    if (generationPhase === 'setup') {
      setGenerationPhase('planning');
      await createOutline();
      return;
    }

    // If we're in planning phase and outline is not ready, wait for it
    if (generationPhase === 'planning' && outline.length === 0) {
      addLog('Waiting for outline creation to complete...', 'info');
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

      // Choose endpoint and make request based on generation mode
      let data;
      if (generationMode === 'stream') {
        // For streaming, we'll still need to handle this differently
        const response = await fetch(`${apiConfig.baseUrl}/advancedStreamGeneration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        data = await response.json();
      } else {
        // Use the API service for non-streaming requests
        data = await apiService.advancedGeneration(requestData);
      }
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start generation');
      }

      if (generationMode === 'stream') {
        // Handle streaming mode
        setJobId(data.streamId);
        addLog(`Advanced streaming generation started with ID: ${data.streamId}`, 'success');
        startAdvancedStreaming(data.streamId);
      } else {
        // Handle batch mode
        setJobId(data.jobId);
        addLog(`Advanced generation job started with ID: ${data.jobId}`, 'success');
        startAdvancedPolling(data.jobId);
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

  const createOutline = async () => {
    // Prevent multiple simultaneous outline creation attempts
    if (isCreatingOutline) {
      addLog('Outline creation already in progress...', 'warning');
      return;
    }

    try {
      setIsCreatingOutline(true);
      setCurrentProcess('Analyzing your synopsis with GPT-4...');
      
      const outlineData = {
        title: storySetup.title,
        genre: storySetup.genre,
        subgenre: storySetup.subgenre,
        genreInstructions: genreCategories[storySetup.genre]?.subgenres[storySetup.subgenre]?.instructions || '',
        wordCount: storySetup.wordCount,
        chapters: calculatedChapters,
        targetChapterLength: storySetup.targetChapterLength,
        synopsis: storySetup.synopsis,
        fictionLength: storySetup.fictionLength
      };

      setCurrentProcess('Creating detailed story structure...');

      // Create a timeout promise to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Outline creation timed out after 2 minutes')), 120000);
      });

      // Race between API call and timeout
      const data = await Promise.race([
        apiService.createOutline(outlineData),
        timeoutPromise
      ]);

      setOutline(data.outline);
      setCurrentProcess('');
      setGenerationPhase('outline');
      addLog('Story outline created successfully', 'success');
      onNotification('Outline ready for review!', 'success');

    } catch (error) {
      console.error('Outline creation error:', error);
      setError(error);
      setCurrentProcess('');
      setGenerationPhase('setup');
      addLog(`Outline creation failed: ${error.message}`, 'error');
      onError(error);
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

  const downloadFullNovel = () => {
    if (!result) return;

    let content = `${result.title}\n`;
    content += `by ${result.author || 'Anonymous'}\n\n`;
    content += `${result.description}\n\n`;
    content += '='.repeat(50) + '\n\n';

    if (result.chapters && result.chapters.length > 0) {
      result.chapters.forEach((chapter, index) => {
        content += `CHAPTER ${index + 1}: ${chapter.title}\n\n`;
        content += chapter.content + '\n\n';
        content += '-'.repeat(30) + '\n\n';
      });
    }

    const filename = `${result.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_novel.txt`;
    handleDownload(content, filename);
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
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
            📥 Download Complete Novel
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
                  <h4>Chapter {index + 1}: {chapter.title}</h4>
                  <div className="chapter-meta">
                    <span className="word-count">{chapter.wordCount} words</span>
                    <button 
                      className="btn btn-small"
                      onClick={() => handleDownload(chapter.content, `chapter_${index + 1}.txt`)}
                    >
                      📄 Download
                    </button>
                  </div>
                </div>
                <div className="chapter-preview">
                  {chapter.content.substring(0, 300)}...
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
                        value={storySetup.wordCount}
                        onChange={(e) => setStorySetup(prev => ({ ...prev, wordCount: parseInt(e.target.value) }))}
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
                        value={storySetup.targetChapterLength}
                        onChange={(e) => setStorySetup(prev => ({ ...prev, targetChapterLength: parseInt(e.target.value) }))}
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
                        value={storySetup.chapterVariance}
                        onChange={(e) => setStorySetup(prev => ({ ...prev, chapterVariance: parseInt(e.target.value) }))}
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
                        <strong>Average Chapter Length:</strong> {Math.round(storySetup.wordCount / calculatedChapters)} words
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
                  <p>Provide a detailed synopsis (up to 10,000 words) - the more detail, the better your novel!</p>
                  
                  <div className="form-group">
                    <textarea
                      className="form-textarea synopsis-input"
                      rows="12"
                      maxLength="10000"
                      placeholder="Write your detailed story synopsis here. Include main characters, plot points, themes, setting, conflicts, and how you want the story to develop. The AI will use this as the foundation for your entire novel..."
                      value={storySetup.synopsis}
                      onChange={(e) => setStorySetup(prev => ({ ...prev, synopsis: e.target.value }))}
                    />
                    <div className="character-count">
                      {storySetup.synopsis.length.toLocaleString()} / 10,000 characters
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
                    onClick={() => {
                      setIsCreatingOutline(false);
                      setCurrentProcess('');
                      setGenerationPhase('setup');
                      addLog('Outline creation cancelled by user', 'warning');
                    }}
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

              <div className="generation-actions">
                <button 
                  className="btn btn-primary btn-large"
                  onClick={startGeneration}
                >
                  🚀 Start Auto-Generation
                </button>
                
                <div className="auto-generation-info">
                  <h4>How Auto-Generation Works:</h4>
                  <ul>
                    <li>Generates chapters sequentially, one at a time</li>
                    <li>Each chapter builds on the previous ones</li>
                    <li>Real-time progress tracking and logs</li>
                    <li>Can be paused or cancelled at any time</li>
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
                <button 
                  className="btn btn-error"
                  onClick={cancelGeneration}
                >
                  ❌ Cancel Generation
                </button>
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
                <div className="progress-text">
                  {progress.toFixed(1)}% Complete
                  {status?.currentChapter && (
                    <span> - Chapter {status.currentChapter} of {calculatedChapters || (conflictData?.chapters || storySetup.chapters)}</span>
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
