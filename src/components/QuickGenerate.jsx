import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const QuickGenerate = ({ conflictData, apiConfig, onSuccess, onError, onNotification }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [preferences, setPreferences] = useState({
    tone: 'hopeful',
    pacing: 'moderate',
    includeOutline: true,
    includeCharacterNotes: true,
    includeChapterSummaries: true
  });

  const handleGenerate = async () => {
    if (!conflictData) {
      onError(new Error('Please complete conflict design first'));
      return;
    }

    try {
      setIsGenerating(true);
      onNotification('Starting novel generation...', 'info');

      const requestData = {
        conflictStructure: conflictData,
        preferences,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${apiConfig.baseUrl}/generateNovel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: AbortSignal.timeout(apiConfig.timeout)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data.novel);
      onSuccess(data.novel);
      onNotification('Novel generated successfully!', 'success');

    } catch (error) {
      console.error('Generation error:', error);
      onError(error);
      
      if (error.name === 'AbortError') {
        onNotification('Generation timed out. Please try again.', 'error');
      } else {
        onNotification(`Generation failed: ${error.message}`, 'error');
      }
    } finally {
      setIsGenerating(false);
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
    content += '=' * 50 + '\n\n';

    if (result.outline) {
      content += 'OUTLINE\n\n';
      content += result.outline + '\n\n';
      content += '=' * 50 + '\n\n';
    }

    if (result.chapters && result.chapters.length > 0) {
      result.chapters.forEach((chapter, index) => {
        content += `CHAPTER ${index + 1}: ${chapter.title}\n\n`;
        content += chapter.content + '\n\n';
        content += '-' * 30 + '\n\n';
      });
    }

    if (result.characterNotes) {
      content += 'CHARACTER NOTES\n\n';
      content += result.characterNotes + '\n\n';
    }

    const filename = `${result.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_novel.txt`;
    handleDownload(content, filename);
  };

  if (isGenerating) {
    return (
      <div className="quick-generate generating">
        <LoadingSpinner message="Generating your novel..." size="large" />
        <div className="generation-progress">
          <p>This may take 2-5 minutes depending on the complexity of your story.</p>
          <p>AI is crafting your chapters with care and attention to detail.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="quick-generate results">
        <div className="results-header">
          <h2>✨ Novel Generated Successfully!</h2>
          <p>Your Christian fiction novel has been created. Review and download below.</p>
        </div>

        <div className="novel-preview">
          <div className="novel-info">
            <h3>{result.title}</h3>
            <p className="novel-description">{result.description}</p>
            
            <div className="novel-stats">
              <div className="stat">
                <strong>Chapters:</strong> {result.chapters?.length || 0}
              </div>
              <div className="stat">
                <strong>Estimated Words:</strong> {result.wordCount?.toLocaleString() || 'N/A'}
              </div>
              <div className="stat">
                <strong>Genre:</strong> {conflictData.genre}
              </div>
              <div className="stat">
                <strong>Theme:</strong> {conflictData.themes.primary}
              </div>
            </div>
          </div>

          <div className="novel-actions">
            <button 
              className="btn btn-success btn-large"
              onClick={downloadFullNovel}
            >
              📥 Download Full Novel
            </button>
            
            <button 
              className="btn btn-outline"
              onClick={() => setResult(null)}
            >
              🔄 Generate New Version
            </button>
          </div>
        </div>

        {result.outline && (
          <div className="content-section">
            <h4>📋 Story Outline</h4>
            <div className="content-preview">
              <pre>{result.outline}</pre>
            </div>
            <button 
              className="btn btn-small"
              onClick={() => handleDownload(result.outline, 'outline.txt')}
            >
              📄 Download Outline
            </button>
          </div>
        )}

        {result.chapters && result.chapters.length > 0 && (
          <div className="content-section">
            <h4>📚 Chapters ({result.chapters.length})</h4>
            <div className="chapters-list">
              {result.chapters.map((chapter, index) => (
                <div key={index} className="chapter-item">
                  <div className="chapter-header">
                    <h5>Chapter {index + 1}: {chapter.title}</h5>
                    <button 
                      className="btn btn-small"
                      onClick={() => handleDownload(chapter.content, `chapter_${index + 1}.txt`)}
                    >
                      📄 Download
                    </button>
                  </div>
                  <div className="chapter-preview">
                    {chapter.content.substring(0, 200)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.characterNotes && (
          <div className="content-section">
            <h4>👥 Character Notes</h4>
            <div className="content-preview">
              <pre>{result.characterNotes}</pre>
            </div>
            <button 
              className="btn btn-small"
              onClick={() => handleDownload(result.characterNotes, 'character_notes.txt')}
            >
              📄 Download Notes
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="quick-generate">
      <div className="generate-header">
        <h2>⚡ Quick Generate</h2>
        <p>Generate a complete novel structure and content quickly</p>
      </div>

      {!conflictData ? (
        <div className="missing-conflict">
          <h3>🔒 Conflict Design Required</h3>
          <p>Please complete the conflict design first before generating your novel.</p>
          <p>Go to the <strong>Conflict Designer</strong> tab to get started.</p>
        </div>
      ) : (
        <>
          <div className="conflict-summary">
            <h3>📋 Your Story Setup</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <strong>Title:</strong> {conflictData.title}
              </div>
              <div className="summary-item">
                <strong>Genre:</strong> {conflictData.genre}
              </div>
              <div className="summary-item">
                <strong>Conflict:</strong> {conflictData.conflictType.replace(/_/g, ' ')}
              </div>
              <div className="summary-item">
                <strong>Protagonist:</strong> {conflictData.protagonist.name}
              </div>
              <div className="summary-item">
                <strong>Theme:</strong> {conflictData.themes.primary}
              </div>
              <div className="summary-item">
                <strong>Chapters:</strong> {conflictData.chapters}
              </div>
            </div>
          </div>

          <div className="generation-preferences">
            <h3>⚙️ Generation Preferences</h3>
            
            <div className="form-group">
              <label className="form-label">Tone</label>
              <select 
                className="form-select"
                value={preferences.tone}
                onChange={(e) => setPreferences(prev => ({ ...prev, tone: e.target.value }))}
              >
                <option value="hopeful">Hopeful & Uplifting</option>
                <option value="serious">Serious & Contemplative</option>
                <option value="warm">Warm & Encouraging</option>
                <option value="dramatic">Dramatic & Intense</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pacing</label>
              <select 
                className="form-select"
                value={preferences.pacing}
                onChange={(e) => setPreferences(prev => ({ ...prev, pacing: e.target.value }))}
              >
                <option value="fast">Fast-paced</option>
                <option value="moderate">Moderate</option>
                <option value="contemplative">Contemplative</option>
              </select>
            </div>

            <div className="preferences-checkboxes">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.includeOutline}
                  onChange={(e) => setPreferences(prev => ({ ...prev, includeOutline: e.target.checked }))}
                />
                Include detailed story outline
              </label>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.includeCharacterNotes}
                  onChange={(e) => setPreferences(prev => ({ ...prev, includeCharacterNotes: e.target.checked }))}
                />
                Include character development notes
              </label>

              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={preferences.includeChapterSummaries}
                  onChange={(e) => setPreferences(prev => ({ ...prev, includeChapterSummaries: e.target.checked }))}
                />
                Include chapter summaries
              </label>
            </div>
          </div>

          <div className="generation-actions">
            <button 
              className="btn btn-primary btn-large"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              ✨ Generate Complete Novel
            </button>
            
            <div className="generation-info">
              <p><strong>What this includes:</strong></p>
              <ul>
                <li>Complete novel structure based on your conflict design</li>
                <li>Full chapters with narrative content</li>
                <li>Character development throughout the story</li>
                <li>Christian themes and spiritual elements integrated naturally</li>
                <li>Downloadable text files for editing</li>
              </ul>
              
              <p><strong>Estimated time:</strong> 2-5 minutes</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuickGenerate;
