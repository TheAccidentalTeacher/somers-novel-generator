import React, { useState } from 'react';
import './SimpleGenerate.css';

/**
 * Simple Novel Generator Component
 * 
 * Clean foundation for iteration - start simple, improve gradually
 */
function SimpleGenerate() {
  const [premise, setPremise] = useState('');
  const [settings, setSettings] = useState({
    genre: 'fantasy',
    wordCount: 50000,
    chapterCount: 12
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState('');

  // Cost calculation function
  const calculateCost = () => {
    const premiseTokens = Math.ceil(premise.length / 4); // Rough token estimate
    const outlineTokens = 500; // Estimated tokens for outline generation
    const chapterTokens = Math.ceil(settings.wordCount / settings.chapterCount * 1.5); // ~1.5 tokens per word
    
    // GPT-4o-mini pricing (per 1M tokens)
    const miniInputCost = 0.15;
    const miniOutputCost = 0.60;
    
    // GPT-4o pricing (per 1M tokens)  
    const gpt4InputCost = 5.00;
    const gpt4OutputCost = 15.00;
    
    // Outline cost (gpt-4o-mini)
    const outlineCost = (premiseTokens * miniInputCost / 1000000) + (outlineTokens * miniOutputCost / 1000000);
    
    // Chapter generation cost (gpt-4o)
    const chapterInputTokens = premiseTokens + (outlineTokens * settings.chapterCount); // Premise + outline per chapter
    const chapterOutputTokens = chapterTokens * settings.chapterCount;
    const chapterCost = (chapterInputTokens * gpt4InputCost / 1000000) + (chapterOutputTokens * gpt4OutputCost / 1000000);
    
    const totalCost = outlineCost + chapterCost;
    
    return {
      outline: outlineCost,
      chapters: chapterCost,
      total: totalCost,
      tokensUsed: {
        input: premiseTokens + chapterInputTokens,
        output: outlineTokens + chapterOutputTokens
      }
    };
  };

  const costEstimate = calculateCost();

  const handleGenerate = async () => {
    if (!premise.trim()) {
      setError('Please enter a premise');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setCurrentStep('Starting generation...');

    try {
      const response = await fetch('/api/simple-generate-new/full-novel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          premise: premise.trim(),
          settings
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setCurrentStep('Complete!');
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestOutline = async () => {
    if (!premise.trim()) {
      setError('Please enter a premise');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentStep('Generating outline only...');

    try {
      const response = await fetch('/api/simple-generate-new/outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          premise: premise.trim(),
          settings
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult({ outline: data.outline, testMode: true });
        setCurrentStep('Outline complete!');
      } else {
        setError(data.error || 'Outline generation failed');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="simple-generate">
      <div className="simple-generate-header">
        <h2>🚀 Simple Novel Generator v1.0</h2>
        <p>Clean foundation - start simple, iterate and improve!</p>
      </div>

      <div className="simple-generate-form">
        {/* Premise Input */}
        <div className="form-group">
          <label htmlFor="premise">Story Premise:</label>
          <textarea
            id="premise"
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="Enter your story premise here... This will be bad at first - that's OK! We'll improve it."
            rows={8}
            disabled={isGenerating}
          />
          <div className="char-count">
            {premise.length} characters
          </div>
        </div>

        {/* Basic Settings */}
        <div className="settings-row">
          <div className="form-group">
            <label htmlFor="genre">Genre:</label>
            <select
              id="genre"
              value={settings.genre}
              onChange={(e) => setSettings({...settings, genre: e.target.value})}
              disabled={isGenerating}
            >
              <option value="fantasy">Fantasy</option>
              <option value="sci-fi">Science Fiction</option>
              <option value="romance">Romance</option>
              <option value="mystery">Mystery</option>
              <option value="adventure">Adventure</option>
              <option value="comedy">Comedy</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="wordCount">Target Words:</label>
            <select
              id="wordCount"
              value={settings.wordCount}
              onChange={(e) => setSettings({...settings, wordCount: parseInt(e.target.value)})}
              disabled={isGenerating}
            >
              <option value={30000}>30,000 (Short)</option>
              <option value={50000}>50,000 (Standard)</option>
              <option value={80000}>80,000 (Long)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="chapters">Chapters:</label>
            <select
              id="chapters"
              value={settings.chapterCount}
              onChange={(e) => setSettings({...settings, chapterCount: parseInt(e.target.value)})}
              disabled={isGenerating}
            >
              <option value={8}>8 Chapters</option>
              <option value={10}>10 Chapters</option>
              <option value={12}>12 Chapters</option>
              <option value={15}>15 Chapters</option>
            </select>
          </div>
        </div>

        {/* Cost Estimator */}
        <div className="cost-estimator">
          <h4>💰 Cost Estimate</h4>
          <div className="cost-breakdown">
            <div className="cost-line">
              <span>📋 Outline (gpt-4o-mini):</span>
              <span>${costEstimate.outline.toFixed(4)}</span>
            </div>
            <div className="cost-line">
              <span>📚 Chapters (gpt-4o):</span>
              <span>${costEstimate.chapters.toFixed(4)}</span>
            </div>
            <div className="cost-line total-cost">
              <span><strong>Total Estimated Cost:</strong></span>
              <span><strong>${costEstimate.total.toFixed(4)}</strong></span>
            </div>
            <div className="cost-details">
              <small>
                ~{costEstimate.tokensUsed.input.toLocaleString()} input + {costEstimate.tokensUsed.output.toLocaleString()} output tokens
              </small>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="button-row">
          <button
            onClick={handleTestOutline}
            disabled={isGenerating || !premise.trim()}
            className="btn-outline"
          >
            📋 Test Outline Only (${costEstimate.outline.toFixed(4)})
          </button>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !premise.trim()}
            className="btn-generate"
          >
            {isGenerating ? '⏳ Generating...' : `📚 Generate Full Novel ($${costEstimate.total.toFixed(4)})`}
          </button>
        </div>
      </div>

      {/* Progress/Status */}
      {isGenerating && (
        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <p className="progress-text">{currentStep}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-section">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <small>Don't worry - the first version will have bugs. We'll fix them!</small>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="results-section">
          <h3>✅ Results</h3>
          
          {result.testMode ? (
            // Outline only
            <div className="outline-results">
              <h4>📋 Generated Outline</h4>
              {result.outline?.map((chapter, index) => (
                <div key={index} className="chapter-outline">
                  <h5>Chapter {chapter.number}: {chapter.title}</h5>
                  <p>{chapter.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            // Full novel
            <div className="novel-results">
              <div className="stats">
                <span>📊 {result.stats?.totalWords} words</span>
                <span>📚 {result.stats?.chapterCount} chapters</span>
              </div>
              
              <div className="novel-content">
                <h4>📖 Generated Novel</h4>
                <textarea
                  value={result.fullNovel}
                  readOnly
                  rows={20}
                  className="novel-output"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="footer-note">
        <p>🔧 <strong>Iteration Notes:</strong> This first version will be rough. That's the point! 
           We can now easily improve prompts, add features, and enhance quality without breaking anything.</p>
      </div>
    </div>
  );
}

export default SimpleGenerate;
