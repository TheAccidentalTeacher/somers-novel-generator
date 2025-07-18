import React, { useState, useRef, useEffect } from 'react';
import apiService from '../services/apiService.js';
import './SimpleGenerate.css';

const SimpleGenerate = () => {
  // Genre data state
  const [genres, setGenres] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    synopsis: '',
    genre: '',
    subgenre: '',
    wordCount: 50000,
    chapters: 10
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('idle'); // idle, outline, generating, complete
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [outline, setOutline] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);

  // Refs
  const abortControllerRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Load genres from backend
  useEffect(() => {
    const loadGenres = async () => {
      try {
        setLoadingGenres(true);
        const response = await apiService.get('/api/genres');
        if (response.success) {
          setGenres(response.data);
        } else {
          addLog('Failed to load genres', 'error');
        }
      } catch (error) {
        console.error('Error loading genres:', error);
        addLog('Error loading genres: ' + error.message, 'error');
      } finally {
        setLoadingGenres(false);
      }
    };

    loadGenres();
  }, []);

  // Helper functions
  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { 
      message, 
      type, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate chapters based on word count
  const calculateChapters = (wordCount) => {
    if (wordCount <= 10000) return Math.max(1, Math.ceil(wordCount / 2000));
    if (wordCount <= 50000) return Math.max(5, Math.ceil(wordCount / 4000));
    return Math.max(10, Math.ceil(wordCount / 5000));
  };

  // Update chapters when word count changes
  const handleWordCountChange = (value) => {
    const wordCount = parseInt(value) || 0;
    updateForm('wordCount', wordCount);
    updateForm('chapters', calculateChapters(wordCount));
  };

  // Validation
  const validateForm = () => {
    if (!formData.title.trim()) return 'Title is required';
    if (!formData.synopsis.trim()) return 'Synopsis is required';
    if (!formData.genre) return 'Genre is required';
    if (!formData.subgenre) return 'Subgenre is required';
    if (formData.wordCount < 1000) return 'Word count must be at least 1000';
    if (formData.wordCount > 200000) return 'Word count cannot exceed 200,000';
    return null;
  };

  // Create outline
  const createOutline = async () => {
    try {
      setCurrentPhase('outline');
      addLog('Creating story outline...', 'info');

      const outlineData = {
        title: formData.title,
        genre: formData.genre,
        subgenre: formData.subgenre,
        wordCount: formData.wordCount,
        chapters: formData.chapters,
        targetChapterLength: Math.round(formData.wordCount / formData.chapters),
        synopsis: formData.synopsis,
        fictionLength: formData.wordCount <= 20000 ? 'novella' : 'novel'
      };

      console.log('🔄 Creating outline with data:', outlineData);
      const response = await apiService.createOutline(outlineData);
      
      if (response.success && response.outline) {
        setOutline(response.outline);
        addLog(`Outline created: ${response.outline.length} chapters planned`, 'success');
        return true;
      } else {
        throw new Error('Failed to create outline');
      }
    } catch (error) {
      console.error('Outline creation failed:', error);
      addLog(`Outline creation failed: ${error.message}`, 'error');
      setError(error.message);
      return false;
    }
  };

  // Start generation
  const startGeneration = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setLogs([]);
      setProgress(0);
      setChapters([]);

      // Create outline first
      const outlineSuccess = await createOutline();
      if (!outlineSuccess) {
        setIsGenerating(false);
        return;
      }

      // Start novel generation
      setCurrentPhase('generating');
      addLog('Starting novel generation...', 'info');

      const generationData = {
        storyData: {
          title: formData.title,
          genre: `${formData.genre}_${formData.subgenre}`,
          wordCount: formData.wordCount,
          chapters: formData.chapters,
          targetChapterLength: Math.round(formData.wordCount / formData.chapters),
          chapterVariance: 0.2,
          synopsis: formData.synopsis,
          outline: outline
        },
        preferences: {
          generationMode: 'batch'
        },
        useAdvancedIteration: true
      };

      abortControllerRef.current = new AbortController();
      const response = await apiService.advancedGeneration(generationData);

      if (response.success && response.jobId) {
        setJobId(response.jobId);
        addLog(`Generation started with job ID: ${response.jobId}`, 'success');
        startPolling(response.jobId);
      } else {
        throw new Error('Failed to start generation');
      }

    } catch (error) {
      console.error('Generation failed:', error);
      addLog(`Generation failed: ${error.message}`, 'error');
      setError(error.message);
      setIsGenerating(false);
      setCurrentPhase('idle');
    }
  };

  // Poll for progress
  const startPolling = (jobId) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await apiService.getGenerationStatus(jobId);
        
        if (status.success) {
          setProgress(status.progress || 0);
          
          if (status.currentChapter) {
            addLog(`Generated: ${status.currentChapter}`, 'success');
          }

          if (status.chapters) {
            setChapters(status.chapters);
          }

          if (status.status === 'completed') {
            setCurrentPhase('complete');
            addLog('Novel generation completed!', 'success');
            setIsGenerating(false);
            clearInterval(pollingIntervalRef.current);
          } else if (status.status === 'failed') {
            throw new Error(status.error || 'Generation failed');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        addLog(`Progress check failed: ${error.message}`, 'error');
        setError(error.message);
        setIsGenerating(false);
        setCurrentPhase('idle');
        clearInterval(pollingIntervalRef.current);
      }
    }, 2000);
  };

  // Cancel generation
  const cancelGeneration = async () => {
    try {
      if (jobId) {
        await apiService.cancelGeneration(jobId);
        addLog('Generation cancelled', 'info');
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      setIsGenerating(false);
      setCurrentPhase('idle');
      setJobId(null);
    } catch (error) {
      console.error('Cancel failed:', error);
      addLog(`Cancel failed: ${error.message}`, 'error');
    }
  };

  // Download novel
  const downloadNovel = () => {
    if (!chapters.length) return;

    const fullText = chapters.map((chapter, index) => 
      `Chapter ${index + 1}: ${chapter.title}\n\n${chapter.content}\n\n`
    ).join('');

    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="simple-generate">
      <div className="container">
        <header className="header">
          <h1>🤖 AI Novel Generator</h1>
          <p>Create full-length novels with advanced AI assistance</p>
        </header>

        {/* Form Section */}
        <div className="form-section">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="title">Novel Title *</label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="Enter your novel title"
                disabled={isGenerating}
              />
            </div>

            <div className="form-group">
              <label htmlFor="wordCount">Target Word Count *</label>
              <input
                id="wordCount"
                type="number"
                value={formData.wordCount}
                onChange={(e) => handleWordCountChange(e.target.value)}
                min="1000"
                max="200000"
                disabled={isGenerating}
              />
              <small>Chapters will be calculated automatically: {formData.chapters} chapters</small>
            </div>

            <div className="form-group">
              <label htmlFor="genre">Genre *</label>
              <select
                id="genre"
                value={formData.genre}
                onChange={(e) => {
                  updateForm('genre', e.target.value);
                  updateForm('subgenre', '');
                }}
                disabled={isGenerating || loadingGenres}
              >
                <option value="">
                  {loadingGenres ? 'Loading genres...' : 'Select Genre'}
                </option>
                {genres.map((genre) => (
                  <option key={genre.key} value={genre.key}>{genre.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="subgenre">Subgenre *</label>
              <select
                id="subgenre"
                value={formData.subgenre}
                onChange={(e) => updateForm('subgenre', e.target.value)}
                disabled={isGenerating || !formData.genre || loadingGenres}
              >
                <option value="">Select Subgenre</option>
                {formData.genre && (() => {
                  const selectedGenre = genres.find(g => g.key === formData.genre);
                  return selectedGenre ? selectedGenre.subgenres.map((subgenre) => (
                    <option key={subgenre.key} value={subgenre.key}>{subgenre.name}</option>
                  )) : [];
                })()}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="synopsis">Story Synopsis *</label>
            <textarea
              id="synopsis"
              value={formData.synopsis}
              onChange={(e) => updateForm('synopsis', e.target.value)}
              placeholder="Describe your story plot, main characters, and key events..."
              rows={6}
              disabled={isGenerating}
            />
            <small>{formData.synopsis.length} characters</small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-section">
          {!isGenerating ? (
            <button 
              className="btn btn-primary btn-large"
              onClick={startGeneration}
              disabled={!formData.title || !formData.synopsis || !formData.genre || !formData.subgenre}
            >
              🚀 Generate Novel
            </button>
          ) : (
            <button 
              className="btn btn-danger"
              onClick={cancelGeneration}
            >
              ❌ Cancel Generation
            </button>
          )}
        </div>

        {/* Progress Section */}
        {isGenerating && (
          <div className="progress-section">
            <div className="progress-header">
              <h3>
                {currentPhase === 'outline' && '📋 Creating Outline...'}
                {currentPhase === 'generating' && '✍️ Writing Novel...'}
                {currentPhase === 'complete' && '✅ Complete!'}
              </h3>
              {currentPhase === 'generating' && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                  ></div>
                  <span className="progress-text">{Math.round(progress)}%</span>
                </div>
              )}
            </div>

            <div className="logs">
              {logs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.type}`}>
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {chapters.length > 0 && (
          <div className="results-section">
            <div className="results-header">
              <h3>📚 Generated Novel: {formData.title}</h3>
              <button className="btn btn-success" onClick={downloadNovel}>
                💾 Download Novel
              </button>
            </div>

            <div className="chapter-list">
              {chapters.map((chapter, index) => (
                <div key={index} className="chapter-preview">
                  <h4>Chapter {index + 1}: {chapter.title}</h4>
                  <p className="chapter-stats">
                    {chapter.wordCount || 'Unknown'} words
                  </p>
                  <div className="chapter-content">
                    {chapter.content.substring(0, 300)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleGenerate;
