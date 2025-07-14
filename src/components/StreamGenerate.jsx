import React, { useState, useEffect, useRef } from 'react';

const StreamGenerate = ({ conflictData, apiConfig, onSuccess, onError, onNotification }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState('');
  const [currentChapter, setCurrentChapter] = useState(1);
  const [chapters, setChapters] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  
  const eventSourceRef = useRef(null);
  const abortControllerRef = useRef(null);

  const [preferences, setPreferences] = useState({
    streamSpeed: 'normal',
    showProgress: true,
    autoSave: true,
    includeMetadata: true
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startStreaming = async () => {
    if (!conflictData) {
      onError(new Error('Please complete conflict design first'));
      return;
    }

    try {
      setIsStreaming(true);
      setError(null);
      setStreamData('');
      setChapters([]);
      setCurrentChapter(1);
      setStatus('connecting');

      abortControllerRef.current = new AbortController();
      onNotification('Starting streaming generation...', 'info');

      const requestData = {
        conflictStructure: conflictData,
        preferences,
        timestamp: new Date().toISOString()
      };

      // Initialize the streaming endpoint
      const response = await fetch(`${apiConfig.baseUrl}/streamGeneration`, {
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
        throw new Error(data.error || 'Failed to start streaming');
      }

      // Start Server-Sent Events stream
      const streamUrl = `${apiConfig.baseUrl}/streamGeneration/${data.streamId}`;
      eventSourceRef.current = new EventSource(streamUrl);

      eventSourceRef.current.onopen = () => {
        setStatus('streaming');
        onNotification('Stream connected, generation started', 'success');
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          handleStreamEvent(eventData);
        } catch (error) {
          console.error('Error parsing stream data:', error);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('Stream error:', error);
        setError(new Error('Stream connection error'));
        setStatus('error');
        stopStreaming();
      };

    } catch (error) {
      console.error('Streaming start error:', error);
      setError(error);
      setIsStreaming(false);
      setStatus('error');
      
      if (error.name === 'AbortError') {
        onNotification('Streaming cancelled', 'warning');
      } else {
        onError(error);
      }
    }
  };

  const handleStreamEvent = (eventData) => {
    switch (eventData.type) {
      case 'status':
        setStatus(eventData.status);
        break;
        
      case 'chapter_start':
        setCurrentChapter(eventData.chapter);
        setStreamData('');
        break;
        
      case 'content':
        setStreamData(prev => prev + eventData.content);
        break;
        
      case 'chapter_complete':
        const newChapter = {
          number: eventData.chapter,
          title: eventData.title,
          content: streamData,
          wordCount: eventData.wordCount,
          timestamp: new Date().toISOString()
        };
        
        setChapters(prev => [...prev, newChapter]);
        setStreamData('');
        
        if (preferences.autoSave) {
          saveChapter(newChapter);
        }
        break;
        
      case 'complete':
        setStatus('completed');
        setIsStreaming(false);
        
        const result = {
          title: conflictData.title,
          chapters: chapters,
          totalChapters: eventData.totalChapters,
          totalWords: eventData.totalWords,
          completedAt: new Date().toISOString()
        };
        
        onSuccess(result);
        onNotification('Streaming generation completed!', 'success');
        
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        break;
        
      case 'error':
        setError(new Error(eventData.error));
        setStatus('error');
        setIsStreaming(false);
        onError(new Error(eventData.error));
        stopStreaming();
        break;
        
      case 'progress':
        // Handle progress updates if needed
        break;
        
      default:
        console.log('Unknown stream event:', eventData);
    }
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setIsStreaming(false);
    setStatus('stopped');
    onNotification('Streaming stopped', 'warning');
  };

  const saveChapter = (chapter) => {
    const blob = new Blob([chapter.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chapter_${chapter.number}_${chapter.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    
    // Auto-save without user interaction (commented out for UX)
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  };

  const downloadChapter = (chapter) => {
    const blob = new Blob([chapter.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chapter_${chapter.number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllChapters = () => {
    let content = `${conflictData.title}\n`;
    content += `Generated via Streaming\n\n`;
    content += '='.repeat(50) + '\n\n';

    chapters.forEach((chapter, index) => {
      content += `CHAPTER ${chapter.number}: ${chapter.title}\n\n`;
      content += chapter.content + '\n\n';
      content += '-'.repeat(30) + '\n\n';
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conflictData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_streamed_novel.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    stopStreaming();
    setStreamData('');
    setChapters([]);
    setCurrentChapter(1);
    setStatus('idle');
    setError(null);
  };

  return (
    <div className="stream-generate">
      <div className="generate-header">
        <h2>📡 Stream Generate</h2>
        <p>Real-time streaming novel generation - watch your story unfold live</p>
      </div>

      {!conflictData ? (
        <div className="missing-conflict">
          <h3>🔒 Conflict Design Required</h3>
          <p>Please complete the conflict design first before using streaming generation.</p>
          <p>Go to the <strong>Conflict Designer</strong> tab to get started.</p>
        </div>
      ) : (
        <>
          {status === 'idle' && (
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
                    <strong>Genre:</strong> {conflictData.genre}
                  </div>
                  <div className="summary-item">
                    <strong>Theme:</strong> {conflictData.themes.primary}
                  </div>
                </div>
              </div>

              <div className="streaming-preferences">
                <h3>📡 Streaming Settings</h3>
                
                <div className="form-group">
                  <label className="form-label">Stream Speed</label>
                  <select 
                    className="form-select"
                    value={preferences.streamSpeed}
                    onChange={(e) => setPreferences(prev => ({ ...prev, streamSpeed: e.target.value }))}
                  >
                    <option value="slow">Slow (Easy to read along)</option>
                    <option value="normal">Normal (Moderate pace)</option>
                    <option value="fast">Fast (Quick generation)</option>
                  </select>
                </div>

                <div className="preferences-checkboxes">
                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.showProgress}
                      onChange={(e) => setPreferences(prev => ({ ...prev, showProgress: e.target.checked }))}
                    />
                    Show detailed progress information
                  </label>

                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.autoSave}
                      onChange={(e) => setPreferences(prev => ({ ...prev, autoSave: e.target.checked }))}
                    />
                    Auto-save completed chapters
                  </label>

                  <label className="form-checkbox">
                    <input
                      type="checkbox"
                      checked={preferences.includeMetadata}
                      onChange={(e) => setPreferences(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                    />
                    Include chapter metadata
                  </label>
                </div>
              </div>

              <div className="streaming-actions">
                <button 
                  className="btn btn-primary btn-large"
                  onClick={startStreaming}
                >
                  📡 Start Live Streaming
                </button>
                
                <div className="streaming-info">
                  <h4>📡 How Streaming Works:</h4>
                  <ul>
                    <li>Watch your novel being written in real-time</li>
                    <li>Content appears as it's generated by AI</li>
                    <li>Chapters are completed sequentially</li>
                    <li>Can be stopped and resumed at any time</li>
                    <li>Download chapters as they're completed</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {isStreaming && (
            <div className="streaming-live">
              <div className="streaming-header">
                <h3>📡 Live Novel Generation</h3>
                <div className="streaming-controls">
                  <div className="status-indicator">
                    <span className={`status-dot ${status}`}></span>
                    <span className="status-text">{status}</span>
                  </div>
                  <button 
                    className="btn btn-error"
                    onClick={stopStreaming}
                  >
                    ⏹️ Stop Stream
                  </button>
                </div>
              </div>

              {preferences.showProgress && (
                <div className="progress-info">
                  <div className="progress-stats">
                    <div className="stat">
                      <strong>Current Chapter:</strong> {currentChapter} / {conflictData.chapters}
                    </div>
                    <div className="stat">
                      <strong>Completed:</strong> {chapters.length}
                    </div>
                    <div className="stat">
                      <strong>Status:</strong> {status}
                    </div>
                  </div>
                </div>
              )}

              <div className="live-content">
                <h4>Chapter {currentChapter} - Live Generation</h4>
                <div className="stream-content">
                  <pre className="streaming-text">{streamData}</pre>
                  {status === 'streaming' && (
                    <span className="cursor-blink">|</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {chapters.length > 0 && (
            <div className="completed-chapters">
              <div className="chapters-header">
                <h3>✅ Completed Chapters ({chapters.length})</h3>
                {chapters.length > 0 && (
                  <button 
                    className="btn btn-success"
                    onClick={downloadAllChapters}
                  >
                    📥 Download All
                  </button>
                )}
              </div>
              
              <div className="chapters-list">
                {chapters.map((chapter) => (
                  <div key={chapter.number} className="chapter-item streamed">
                    <div className="chapter-header">
                      <h4>Chapter {chapter.number}: {chapter.title}</h4>
                      <div className="chapter-meta">
                        <span className="word-count">{chapter.wordCount} words</span>
                        <span className="timestamp">{new Date(chapter.timestamp).toLocaleTimeString()}</span>
                        <button 
                          className="btn btn-small"
                          onClick={() => downloadChapter(chapter)}
                        >
                          📄 Download
                        </button>
                      </div>
                    </div>
                    <div className="chapter-preview">
                      {chapter.content.substring(0, 200)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="streaming-complete">
              <h3>🎉 Streaming Complete!</h3>
              <p>Your novel has been generated successfully via live streaming.</p>
              <div className="completion-stats">
                <div className="stat">
                  <strong>Total Chapters:</strong> {chapters.length}
                </div>
                <div className="stat">
                  <strong>Total Words:</strong> {chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0).toLocaleString()}
                </div>
              </div>
              <button 
                className="btn btn-primary"
                onClick={reset}
              >
                🔄 Stream Another Novel
              </button>
            </div>
          )}

          {error && (
            <div className="streaming-error">
              <h3>❌ Streaming Error</h3>
              <p>{error.message}</p>
              <div className="error-actions">
                <button 
                  className="btn btn-primary"
                  onClick={reset}
                >
                  🔄 Try Again
                </button>
                {chapters.length > 0 && (
                  <button 
                    className="btn btn-outline"
                    onClick={downloadAllChapters}
                  >
                    📥 Download Completed Chapters
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StreamGenerate;
