# 📚 Somers Novel Generator

An AI-powered Christian fiction novel generator built with React and Express.js. This application helps Christian fiction writers create compelling stories with structured conflict design and automated chapter generation.

## ✨ Features

- **🎭 Conflict Designer**: Interactive tool for designing novel conflicts based on proven story structures
- **⚡ Quick Generate**: Rapid novel structure and outline creation
- **🤖 Auto Generate**: Full automated chapter-by-chapter novel generation with progress tracking
- **📡 Stream Generate**: Real-time streaming novel generation with live updates
- **💕 Romance Integration**: Alana Terry's 12-part romance beat structure
- **🎨 Modern UI**: Beautiful, responsive interface optimized for writers

## 🏗️ Architecture

- **Frontend**: React 19.1.0 + Vite 7.0.4
- **Backend**: Express.js with OpenAI GPT-4o/GPT-4o-mini integration
- **Deployment**: Netlify (frontend) + Railway (backend)
- **AI**: OpenAI API with sophisticated prompt engineering for Christian fiction

## 🚀 Quick Start

### Development Setup

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd "Novel Generator New"
   npm install
   ```

2. **Backend setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   npm start
   ```

3. **Frontend setup:**
   ```bash
   # In project root
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5174
   - Backend: http://localhost:3001

### Production Deployment

#### Railway (Backend)

1. Connect your GitHub repository to Railway
2. Set environment variables:
   ```
   NODE_ENV=production
   OPENAI_API_KEY=your_openai_api_key
   CORS_ORIGINS=https://your-netlify-site.netlify.app
   ```
3. Deploy from the `backend` directory

#### Netlify (Frontend)

1. Connect your GitHub repository to Netlify
2. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Set environment variables:
   ```
   VITE_API_BASE_URL=https://your-railway-backend.railway.app/api
   ```
4. Deploy from the project root

## 📖 Usage Guide

### 1. Conflict Design
Start by designing your novel's core conflict structure:
- **Basic Information**: Title, protagonist, setting, word count
- **Conflict Structure**: Primary and secondary conflicts based on proven patterns
- **Genre Elements**: Themes, tone, and sub-genre elements
- **Romance Integration**: Optional romance subplot with structured beats

### 2. Novel Generation
Choose your preferred generation method:
- **Quick Generate**: Fast outline and structure creation
- **Auto Generate**: Full background chapter-by-chapter generation
- **Stream Generate**: Real-time chapter creation with live updates

### 3. Export & Edit
- Download generated content as text files
- Copy chapters for external editing
- Use generated outlines as writing guides

## 🛠️ Technical Details

### Backend API Endpoints

- `POST /api/generateNovel` - Quick novel generation
- `POST /api/autoGenerateNovel` - Background auto-generation with job tracking
- `POST /api/streamGeneration` - Server-sent events streaming generation
- `GET /health` - Health check and system status

### Frontend Components

- **App.jsx** - Main application with tab navigation
- **ConflictDesigner.jsx** - Interactive conflict design interface
- **QuickGenerate.jsx** - Quick generation form and results
- **AutoGenerate.jsx** - Background generation with progress tracking
- **StreamGenerate.jsx** - Real-time streaming interface
- **ProjectSettings.jsx** - Configuration and testing tools

### AI Integration

The application uses sophisticated prompt engineering specifically designed for Christian fiction:
- **Conflict Analysis**: Structured conflict identification and development
- **Chapter Generation**: Context-aware chapter creation with consistent tone
- **Romance Integration**: Seamless integration of romance beats
- **Theme Development**: Faith-based theme exploration and character growth

## 🔧 Configuration

### Environment Variables

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME="Somers Novel Generator"
VITE_APP_VERSION="1.0.0"
```

#### Backend (.env)
```env
NODE_ENV=development
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
CORS_ORIGINS=http://localhost:5174
OPENAI_MODEL_ANALYSIS=gpt-4o
OPENAI_MODEL_GENERATION=gpt-4o-mini
```

## 📋 Project Structure

```
Novel Generator New/
├── backend/                 # Express.js backend
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic services
│   ├── shared/             # Shared utilities and data
│   └── index.js            # Server entry point
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── data/              # Static data and configurations
│   └── utils/             # Frontend utilities
├── netlify/               # Netlify functions (optional)
├── public/                # Static assets
└── dist/                  # Build output
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🙏 Acknowledgments

- **Alana Terry** - Romance beat structure integration
- **OpenAI** - AI model integration
- **Christian Fiction Community** - Inspiration and feedback

## 🆘 Support

For support, please check:
1. The built-in health check at `/health`
2. Browser console for frontend errors
3. Server logs for backend issues
4. GitHub Issues for bug reports

---

Built with ❤️ for Christian fiction writers by the Somers Novel Generator team.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
