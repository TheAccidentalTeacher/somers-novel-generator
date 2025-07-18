# 🚀 Railway Deployment Fix Guide

## Problem Diagnosis
The error `Cannot find package 'express'` indicates that Railway is not properly installing the backend dependencies.

## Root Cause
Railway was using the deprecated `--only=production` flag and may not have been correctly identifying the backend directory structure.

## ✅ Fixes Applied

### 1. Updated `railway.json`
- Changed from `npm ci --only=production` to `npm install`
- Ensured proper backend directory navigation

### 2. Added `nixpacks.toml` Configuration
- Specified Node.js 18.x runtime
- Explicit install commands for backend dependencies
- Proper start command

### 3. Added `railway.toml` Configuration
- Backup configuration for Railway deployment
- Restart policy configuration
- Environment variable defaults

## 🔧 Railway Environment Variables Required

Make sure these are set in your Railway dashboard:

```bash
# Essential
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production

# CORS Configuration
FRONTEND_URL=https://somers-novel-writer.netlify.app
CORS_ORIGINS=https://somers-novel-writer.netlify.app,https://somers-novel-generator.netlify.app

# Optional - Database
MONGODB_URI=your_mongodb_connection_string
```

## 🚀 Deployment Instructions

### Option 1: Automatic Re-deployment
1. Push these changes to your GitHub repository
2. Railway will automatically detect changes and redeploy
3. Monitor the build logs in Railway dashboard

### Option 2: Manual Redeploy
1. Go to Railway dashboard
2. Click "Redeploy" button
3. Monitor build logs for successful dependency installation

## 🔍 Monitoring the Fix

### 1. Check Build Logs
Look for these successful messages:
```
✅ npm install completed
✅ Dependencies installed
✅ Backend starting on port 3000
✅ OpenAI API: ✅ Configured
```

### 2. Test Health Endpoint
Once deployed, test: `https://your-railway-url.up.railway.app/api/health`

Expected response:
```json
{
  "success": true,
  "message": "Somers Novel Generator API is running",
  "status": "healthy",
  "openai": {
    "configured": true,
    "status": "ready"
  }
}
```

## 🐛 If Issues Persist

### Check Railway Logs
1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Click on latest deployment
5. Check "Build Logs" and "Deploy Logs"

### Common Issues and Solutions

#### Issue: "Cannot resolve module"
**Solution**: Ensure all imports use `.js` extensions
```javascript
// ✅ Correct
import advancedAI from './services/advancedAI.js';

// ❌ Incorrect
import advancedAI from './services/advancedAI';
```

#### Issue: "Directory not found"
**Solution**: Railway is looking in wrong directory
- Check that `cd backend` commands are working
- Verify package.json is in backend folder

#### Issue: "Build timeout"
**Solution**: Increase Railway timeout or optimize build
- Remove unnecessary dependencies
- Use `npm ci` instead of `npm install` if package-lock.json exists

## 📱 Contact Information

If deployment still fails, provide these logs:
1. Railway build logs (full output)
2. Railway deploy logs (full output)
3. Environment variables (redacted)
4. File structure verification

## 🎯 Expected Result

After applying these fixes:
- ✅ Railway builds successfully
- ✅ Backend starts without module errors
- ✅ OpenAI integration works
- ✅ Frontend can connect to backend
- ✅ Novel generation functions properly
