# Word Count Validation System

## Overview
Comprehensive retry system ensuring chapters meet target word count requirements through automatic regeneration with enhanced AI prompting.

## System Components

### 1. Validation Thresholds
```javascript
const targetWordCount = stream.storyData.targetChapterLength || 1500;
const minWordCount = targetWordCount * 0.75; // 75% of target minimum
const maxRetries = 2;
```

### 2. Retry Logic (Streaming)
```javascript
while (chapter.wordCount < minWordCount && retryCount < maxRetries) {
  retryCount++;
  console.log(`⚠️ Chapter ${chapterNumber} word count too low: ${chapter.wordCount} words (target: ${targetWordCount}). Retry ${retryCount}/${maxRetries}`);
  
  advancedAI.broadcastToStream(streamId, 'process_update', { 
    message: `Chapter ${chapterNumber} too short (${chapter.wordCount} words), regenerating to meet ${targetWordCount} word target...` 
  });

  chapter = await advancedAI.generateChapterAdvanced({
    chapterNumber,
    chapterOutline,
    storyData: stream.storyData,
    previousChapters: chapters,
    isRetry: true,
    previousWordCount: chapter.wordCount,
    targetWordCount: targetWordCount,
    onProgress: (message) => {
      advancedAI.broadcastToStream(streamId, 'process_update', { message });
    }
  });
}
```

### 3. Enhanced AI Prompts
```javascript
// Build retry context if this is a retry attempt
let retryInstructions = '';
if (isRetry && previousWordCount) {
  retryInstructions = `

⚠️ RETRY NOTICE: The previous attempt produced only ${previousWordCount} words, which was too short.
CRITICAL: This chapter MUST be at least ${minWords} words. Aim for exactly ${actualTargetLength} words.
- Expand scenes with more detail and dialogue
- Add more character development and internal thoughts
- Include richer descriptions and world-building
- Ensure complete story beats are fully developed`;
}
```

### 4. UI Feedback
```javascript
// Enhanced logging with word count status
const wordCountStatus = eventData.onTarget ? '✅' : '⚠️';
const targetInfo = eventData.targetWordCount ? ` (target: ${eventData.targetWordCount})` : '';
addLog(`${wordCountStatus} Chapter ${eventData.chapter} completed: ${eventData.wordCount} words${targetInfo}`, 
       eventData.onTarget ? 'success' : 'warning');
```

## Configuration Parameters

### Retry Settings
- **Maximum Retries**: 2 attempts per chapter
- **Minimum Threshold**: 75% of target word count
- **Retry Threshold**: 90% of target word count on retries

### AI Parameters
- **Model**: GPT-4o for best creative writing
- **Max Tokens**: Math.min(4000, Math.ceil(maxWords * 1.3))
- **Temperature**: 0.8 (first attempt), 0.7 (retry attempts)

### Timing
- **Inter-chapter Delay**: 500ms (optimized for single user)
- **Stream Timeout**: 30 minutes maximum

## Monitoring & Logging

### Backend Logs
```javascript
console.log(`📝 Chapter ${chapterNumber} first attempt: ${wordCount} words (target: ${actualTargetLength})`);
console.log(`🔄 Chapter ${chapterNumber} retry result: ${wordCount} words (target: ${actualTargetLength}, previous: ${previousWordCount})`);
```

### Frontend Indicators
- ✅ Green checkmark: Chapter meets target word count
- ⚠️ Warning icon: Chapter below target but accepted after retries
- Real-time retry notifications during streaming

## Expected Results

### Before Implementation
- Chapters consistently 1208-1284 words vs 1500-2100 targets
- No retry mechanism for poor generations
- Word count warnings logged but no action taken

### After Implementation
- Automatic retry for chapters under 75% of target
- Enhanced AI prompts with explicit word count requirements
- Real-time user feedback during retry attempts
- Improved word count accuracy through iterative generation

## Usage

### Streaming Mode
Word count validation automatically enabled with real-time UI updates showing retry attempts.

### Batch Mode
Same validation logic applied with detailed logging in job status updates.

### Configuration
Word count targets set via `targetChapterLength` in story data, with automatic fallback to 1500 words.
