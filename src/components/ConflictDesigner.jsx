import React, { useState, useEffect } from 'react';
import { conflictTypes, genrePatterns, romanceBeats } from '../data/conflictData';

const ConflictDesigner = ({ onComplete, onError, existingData }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: '',
    conflictType: '',
    protagonist: {
      name: '',
      age: '',
      background: '',
      occupation: '',
      spiritualState: '',
      personalityTraits: '',
      goals: '',
      fears: ''
    },
    antagonist: {
      name: '',
      background: '',
      motivation: '',
      methods: '',
      relationship: ''
    },
    setting: {
      location: '',
      timeпериод: '',
      atmosphere: '',
      significance: ''
    },
    themes: {
      primary: '',
      secondary: '',
      biblicalBasis: '',
      moralLesson: ''
    },
    romance: {
      enabled: false,
      loveInterest: '',
      meetCute: '',
      obstacles: '',
      resolution: ''
    },
    chapters: 12,
    targetWordCount: 50000
  });

  const [activeSection, setActiveSection] = useState('basic');
  const [isValid, setIsValid] = useState(false);

  // Load existing data if provided
  useEffect(() => {
    if (existingData) {
      setFormData(existingData);
    }
  }, [existingData]);

  // Validate form data
  useEffect(() => {
    const requiredFields = [
      'title', 'description', 'genre', 'conflictType',
      'protagonist.name', 'protagonist.background', 'protagonist.goals',
      'antagonist.name', 'antagonist.motivation',
      'setting.location', 'setting.timeperiod',
      'themes.primary'
    ];

    const isFormValid = requiredFields.every(field => {
      const value = field.includes('.') 
        ? field.split('.').reduce((obj, key) => obj?.[key], formData)
        : formData[field];
      return value && value.trim().length > 0;
    });

    setIsValid(isFormValid);
  }, [formData]);

  const handleInputChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object' 
        ? { ...prev[section], [field]: value }
        : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!isValid) {
      onError(new Error('Please fill in all required fields'));
      return;
    }

    try {
      // Add conflict structure and romance beats
      const conflictStructure = conflictTypes[formData.conflictType];
      const genrePattern = genrePatterns[formData.genre];
      
      const completeData = {
        ...formData,
        structure: conflictStructure,
        genrePattern,
        romanceStructure: formData.romance.enabled ? romanceBeats : null,
        timestamp: new Date().toISOString()
      };

      onComplete(completeData);
    } catch (error) {
      onError(error);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: '📖' },
    { id: 'protagonist', label: 'Protagonist', icon: '👤' },
    { id: 'antagonist', label: 'Antagonist', icon: '😈' },
    { id: 'setting', label: 'Setting', icon: '🌍' },
    { id: 'themes', label: 'Themes', icon: '✝️' },
    { id: 'romance', label: 'Romance', icon: '💕' },
    { id: 'structure', label: 'Structure', icon: '📋' }
  ];

  const renderBasicSection = () => (
    <div className="form-section">
      <h3>📖 Basic Information</h3>
      
      <div className="form-group">
        <label className="form-label">Novel Title *</label>
        <input
          type="text"
          className="form-input"
          value={formData.title}
          onChange={(e) => handleInputChange('title', null, e.target.value)}
          placeholder="Enter your novel's title"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description *</label>
        <textarea
          className="form-textarea"
          value={formData.description}
          onChange={(e) => handleInputChange('description', null, e.target.value)}
          placeholder="Brief description of your novel's story"
          rows={4}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Genre *</label>
        <select
          className="form-select"
          value={formData.genre}
          onChange={(e) => handleInputChange('genre', null, e.target.value)}
          required
        >
          <option value="">Select a genre</option>
          {Object.keys(genrePatterns).map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Central Conflict Type *</label>
        <select
          className="form-select"
          value={formData.conflictType}
          onChange={(e) => handleInputChange('conflictType', null, e.target.value)}
          required
        >
          <option value="">Select conflict type</option>
          {Object.entries(conflictTypes).map(([key, conflict]) => (
            <option key={key} value={key}>{conflict.name}</option>
          ))}
        </select>
        {formData.conflictType && (
          <div className="form-help">
            {conflictTypes[formData.conflictType]?.description}
          </div>
        )}
      </div>
    </div>
  );

  const renderProtagonistSection = () => (
    <div className="form-section">
      <h3>👤 Protagonist</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input
            type="text"
            className="form-input"
            value={formData.protagonist.name}
            onChange={(e) => handleInputChange('protagonist', 'name', e.target.value)}
            placeholder="Protagonist's name"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Age</label>
          <input
            type="text"
            className="form-input"
            value={formData.protagonist.age}
            onChange={(e) => handleInputChange('protagonist', 'age', e.target.value)}
            placeholder="Age or age range"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Background *</label>
        <textarea
          className="form-textarea"
          value={formData.protagonist.background}
          onChange={(e) => handleInputChange('protagonist', 'background', e.target.value)}
          placeholder="Character's background, family, history"
          rows={3}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Occupation</label>
        <input
          type="text"
          className="form-input"
          value={formData.protagonist.occupation}
          onChange={(e) => handleInputChange('protagonist', 'occupation', e.target.value)}
          placeholder="What does the character do for work?"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Spiritual State</label>
        <textarea
          className="form-textarea"
          value={formData.protagonist.spiritualState}
          onChange={(e) => handleInputChange('protagonist', 'spiritualState', e.target.value)}
          placeholder="Character's relationship with faith, spiritual journey"
          rows={2}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Goals *</label>
        <textarea
          className="form-textarea"
          value={formData.protagonist.goals}
          onChange={(e) => handleInputChange('protagonist', 'goals', e.target.value)}
          placeholder="What does the character want to achieve?"
          rows={2}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Fears & Obstacles</label>
        <textarea
          className="form-textarea"
          value={formData.protagonist.fears}
          onChange={(e) => handleInputChange('protagonist', 'fears', e.target.value)}
          placeholder="What holds the character back?"
          rows={2}
        />
      </div>
    </div>
  );

  const renderAntagonistSection = () => (
    <div className="form-section">
      <h3>😈 Antagonist</h3>
      
      <div className="form-group">
        <label className="form-label">Name *</label>
        <input
          type="text"
          className="form-input"
          value={formData.antagonist.name}
          onChange={(e) => handleInputChange('antagonist', 'name', e.target.value)}
          placeholder="Antagonist's name (can be a person, situation, or internal struggle)"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Background</label>
        <textarea
          className="form-textarea"
          value={formData.antagonist.background}
          onChange={(e) => handleInputChange('antagonist', 'background', e.target.value)}
          placeholder="Antagonist's history and origin"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Motivation *</label>
        <textarea
          className="form-textarea"
          value={formData.antagonist.motivation}
          onChange={(e) => handleInputChange('antagonist', 'motivation', e.target.value)}
          placeholder="Why does the antagonist oppose the protagonist?"
          rows={2}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Methods</label>
        <textarea
          className="form-textarea"
          value={formData.antagonist.methods}
          onChange={(e) => handleInputChange('antagonist', 'methods', e.target.value)}
          placeholder="How does the antagonist create conflict?"
          rows={2}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Relationship to Protagonist</label>
        <input
          type="text"
          className="form-input"
          value={formData.antagonist.relationship}
          onChange={(e) => handleInputChange('antagonist', 'relationship', e.target.value)}
          placeholder="e.g., stranger, family member, inner demon, circumstance"
        />
      </div>
    </div>
  );

  const renderSettingSection = () => (
    <div className="form-section">
      <h3>🌍 Setting</h3>
      
      <div className="form-group">
        <label className="form-label">Location *</label>
        <input
          type="text"
          className="form-input"
          value={formData.setting.location}
          onChange={(e) => handleInputChange('setting', 'location', e.target.value)}
          placeholder="Where does the story take place?"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Time Period *</label>
        <input
          type="text"
          className="form-input"
          value={formData.setting.timeperiod}
          onChange={(e) => handleInputChange('setting', 'timeperiod', e.target.value)}
          placeholder="When does the story take place?"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Atmosphere</label>
        <textarea
          className="form-textarea"
          value={formData.setting.atmosphere}
          onChange={(e) => handleInputChange('setting', 'atmosphere', e.target.value)}
          placeholder="Describe the mood and feel of your setting"
          rows={2}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Significance</label>
        <textarea
          className="form-textarea"
          value={formData.setting.significance}
          onChange={(e) => handleInputChange('setting', 'significance', e.target.value)}
          placeholder="How does the setting impact the story and characters?"
          rows={2}
        />
      </div>
    </div>
  );

  const renderThemesSection = () => (
    <div className="form-section">
      <h3>✝️ Themes & Messages</h3>
      
      <div className="form-group">
        <label className="form-label">Primary Theme *</label>
        <input
          type="text"
          className="form-input"
          value={formData.themes.primary}
          onChange={(e) => handleInputChange('themes', 'primary', e.target.value)}
          placeholder="Main theme (e.g., redemption, forgiveness, faith)"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Secondary Themes</label>
        <input
          type="text"
          className="form-input"
          value={formData.themes.secondary}
          onChange={(e) => handleInputChange('themes', 'secondary', e.target.value)}
          placeholder="Additional themes (comma-separated)"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Biblical Basis</label>
        <textarea
          className="form-textarea"
          value={formData.themes.biblicalBasis}
          onChange={(e) => handleInputChange('themes', 'biblicalBasis', e.target.value)}
          placeholder="Scripture verses or biblical principles that support your theme"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Moral Lesson</label>
        <textarea
          className="form-textarea"
          value={formData.themes.moralLesson}
          onChange={(e) => handleInputChange('themes', 'moralLesson', e.target.value)}
          placeholder="What should readers learn from this story?"
          rows={2}
        />
      </div>
    </div>
  );

  const renderRomanceSection = () => (
    <div className="form-section">
      <h3>💕 Romance Elements</h3>
      
      <div className="form-group">
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={formData.romance.enabled}
            onChange={(e) => handleInputChange('romance', 'enabled', e.target.checked)}
          />
          Include romance subplot
        </label>
      </div>

      {formData.romance.enabled && (
        <>
          <div className="form-group">
            <label className="form-label">Love Interest</label>
            <input
              type="text"
              className="form-input"
              value={formData.romance.loveInterest}
              onChange={(e) => handleInputChange('romance', 'loveInterest', e.target.value)}
              placeholder="Name and brief description of the love interest"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Meet Cute</label>
            <textarea
              className="form-textarea"
              value={formData.romance.meetCute}
              onChange={(e) => handleInputChange('romance', 'meetCute', e.target.value)}
              placeholder="How do they first meet or connect?"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Obstacles</label>
            <textarea
              className="form-textarea"
              value={formData.romance.obstacles}
              onChange={(e) => handleInputChange('romance', 'obstacles', e.target.value)}
              placeholder="What keeps them apart or creates tension?"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Resolution</label>
            <textarea
              className="form-textarea"
              value={formData.romance.resolution}
              onChange={(e) => handleInputChange('romance', 'resolution', e.target.value)}
              placeholder="How does their relationship resolve?"
              rows={2}
            />
          </div>

          <div className="form-help">
            <p><strong>Romance Structure:</strong> This will follow Alana Terry's 12-beat romance structure integrated with your main plot.</p>
          </div>
        </>
      )}
    </div>
  );

  const renderStructureSection = () => (
    <div className="form-section">
      <h3>📋 Novel Structure</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Number of Chapters</label>
          <input
            type="number"
            className="form-input"
            value={formData.chapters}
            onChange={(e) => handleInputChange('chapters', null, parseInt(e.target.value) || 12)}
            min="8"
            max="30"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Target Word Count</label>
          <input
            type="number"
            className="form-input"
            value={formData.targetWordCount}
            onChange={(e) => handleInputChange('targetWordCount', null, parseInt(e.target.value) || 50000)}
            step="5000"
            min="30000"
            max="120000"
          />
        </div>
      </div>

      {formData.conflictType && (
        <div className="structure-preview">
          <h4>Conflict Structure Preview:</h4>
          <div className="structure-beats">
            {conflictTypes[formData.conflictType]?.beats?.map((beat, index) => (
              <div key={index} className="beat-item">
                <strong>{beat.name}:</strong> {beat.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {formData.romance.enabled && (
        <div className="romance-preview">
          <h4>Romance Beats Integration:</h4>
          <p>Romance elements will be woven throughout the story using Alana Terry's 12-beat structure.</p>
        </div>
      )}
    </div>
  );

  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'basic': return renderBasicSection();
      case 'protagonist': return renderProtagonistSection();
      case 'antagonist': return renderAntagonistSection();
      case 'setting': return renderSettingSection();
      case 'themes': return renderThemesSection();
      case 'romance': return renderRomanceSection();
      case 'structure': return renderStructureSection();
      default: return renderBasicSection();
    }
  };

  return (
    <div className="conflict-designer">
      <div className="designer-header">
        <h2>⚔️ Conflict Designer</h2>
        <p>Design your novel's central conflict and character structure</p>
      </div>

      <div className="designer-navigation">
        {sections.map(section => (
          <button
            key={section.id}
            className={`section-tab ${activeSection === section.id ? 'active' : ''}`}
            onClick={() => setActiveSection(section.id)}
          >
            <span className="tab-icon">{section.icon}</span>
            <span className="tab-label">{section.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="designer-form">
        {renderCurrentSection()}
        
        <div className="form-actions">
          <button
            type="submit"
            className={`btn btn-large ${isValid ? 'btn-primary' : 'btn-outline'}`}
            disabled={!isValid}
          >
            {isValid ? '✨ Complete Conflict Design' : '⏳ Fill Required Fields'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConflictDesigner;
