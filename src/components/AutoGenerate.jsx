import React, { useState, useEffect, useRef } from 'react';
import LoadingSpinner from './LoadingSpinner';

const AutoGenerate = ({ conflictData, apiConfig, onSuccess, onError, onNotification }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [preferences, setPreferences] = useState({
    chapterLength: 'moderate',
    detailLevel: 'high',
    includeSceneBreaks: true,
    includeDividers: true,
    generateExtras: true
  });

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

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const startGeneration = async () => {
    if (!conflictData) {
      onError(new Error('Please complete conflict design first'));
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      setProgress(0);
      setLogs([]);
      
      abortControllerRef.current = new AbortController();

      addLog('Starting auto-generation process...', 'info');
      onNotification('Starting automated novel generation...', 'info');

      const requestData = {
        conflictStructure: conflictData,
        preferences,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${apiConfig.baseUrl}/autoGenerateNovel`, {
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

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start generation');
      }

      setJobId(data.jobId);
      addLog(`Generation job started with ID: ${data.jobId}`, 'success');
      
      // Start polling for updates
      startPolling(data.jobId);

    } catch (error) {
      console.error('Generation start error:', error);
      setError(error);
      setIsGenerating(false);
      
      if (error.name === 'AbortError') {
        addLog('Generation was cancelled', 'warning');
        onNotification('Generation cancelled', 'warning');
      } else {
        addLog(`Error starting generation: ${error.message}`, 'error');
        onError(error);
      }
    }
  };

  const startPolling = (id) => {
    intervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${apiConfig.baseUrl}/autoGenerateNovel/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to get job status');
        }

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

  const cancelGeneration = async () => {
    if (!jobId) return;

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      await fetch(`${apiConfig.baseUrl}/autoGenerateNovel/${jobId}`, {
        method: 'DELETE'
      });

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
        <div className="missing-conflict">
          <h3>🔒 Conflict Design Required</h3>
          <p>Please complete the conflict design first before using auto-generation.</p>
          <p>Go to the <strong>Conflict Designer</strong> tab to get started.</p>
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
                <h3>⚙️ Auto-Generation Settings</h3>
                
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
                <h3>🤖 Auto-Generating Your Novel</h3>
                <button 
                  className="btn btn-error"
                  onClick={cancelGeneration}
                >
                  ❌ Cancel Generation
                </button>
              </div>

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
                    <span> - Generating Chapter {status.currentChapter}</span>
                  )}
                </div>
              </div>

              {status && (
                <div className="status-info">
                  <div className="status-grid">
                    <div className="status-item">
                      <strong>Status:</strong> {status.status}
                    </div>
                    <div className="status-item">
                      <strong>Chapters Done:</strong> {status.chaptersCompleted || 0} / {conflictData.chapters}
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
