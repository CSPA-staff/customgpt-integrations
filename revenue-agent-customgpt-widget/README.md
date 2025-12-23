# CustomGPT Widget - Next.js

A modern Next.js 16 voice-enabled AI assistant widget with chat and voice interfaces. Built with TypeScript, React 19, and serverless API routes for easy deployment on Vercel.

Integrates with [CustomGPT.ai RAG API](https://app.customgpt.ai/register?utm_source=github_integrations) for AI responses, OpenAI for STT/TTS, and supports multiple TTS providers.

## Features

- **Chat Interface** - Streaming responses with markdown support
- **Voice Mode** - Real-time voice conversation with VAD (Voice Activity Detection)
- **Multiple TTS Providers** - OpenAI, ElevenLabs, Google TTS, Edge TTS, StreamElements
- **Gamification** - Engagement features and progress tracking
- **Product Comparison** - Side-by-side product comparison tables
- **Citation Display** - Multiple citation styles (cards, tabs, accordion, pills)
- **Widget Modes** - Floating button or inline embed
- **Theme Support** - Light and dark themes

## Quick Start

### Prerequisites

- Node.js 18+
- CustomGPT API key from [app.customgpt.ai](https://app.customgpt.ai)
- OpenAI API key (for voice features)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Configure your API keys in .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

Create `.env.local` with the following:

```bash
# CustomGPT Configuration (Required)
USE_CUSTOMGPT=true
CUSTOMGPT_PROJECT_ID=your_project_id
CUSTOMGPT_API_KEY=your_api_key
CUSTOMGPT_STREAM=true

# OpenAI Configuration (Required for voice)
OPENAI_API_KEY=sk-your-key-here

# Speech-to-Text
STT_MODEL=gpt-4o-mini-transcribe

# Text-to-Speech
TTS_PROVIDER=OPENAI
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova

# UI Configuration
NEXT_PUBLIC_THEME=light
NEXT_PUBLIC_WIDGET_EMBED_MODE=true
NEXT_PUBLIC_WIDGET_FLOATING_BUTTON=true
NEXT_PUBLIC_WIDGET_FLOATING_POSITION=bottom-right

# Features
NEXT_PUBLIC_GAMIFICATION_ENABLED=true
NEXT_PUBLIC_ENABLE_COMPARISON_TABLE=true

# Citation Display: cards | tabs | accordion | pills | all
NEXT_PUBLIC_CITATION_DISPLAY_MODE=cards
```

See [.env.example](.env.example) for all available options.

## Architecture

```text
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main entry point
│   ├── layout.tsx         # Root layout with ThemeProvider
│   └── api/               # API routes (serverless)
│       ├── chat/          # Chat endpoints
│       ├── tts/           # Text-to-speech
│       └── agent/         # Agent settings
├── components/            # React components
│   ├── ChatContainer.tsx  # Main chat interface
│   ├── gamification/      # Gamification components
│   └── ChatHistory/       # Chat history sidebar
├── hooks/                 # Custom React hooks
├── lib/                   # Business logic
│   ├── ai/               # CustomGPT client
│   └── audio/            # TTS/STT implementations
├── config/               # Centralized configuration
└── styles/               # CSS design tokens
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configure environment variables in Vercel dashboard
```

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway up

# Set environment variables
railway variables set OPENAI_API_KEY=sk-...
```

## Widget Integration

Embed the widget on any website:

```html
<script>
  window.customGPTConfig = {
    serverUrl: 'https://your-deployment.vercel.app',
    position: 'bottom-right',
    theme: 'light'
  };
</script>
<script src="https://your-deployment.vercel.app/widget.js" defer></script>
```

See [`examples/`](examples/) for complete integration guides for WordPress, Shopify, React, and more.

## TTS Providers

| Provider       | Quality   | Speed  | Cost |
| -------------- | --------- | ------ | ---- |
| OpenAI         | High      | Fast   | Paid |
| ElevenLabs     | Very High | Medium | Paid |
| Edge TTS       | Good      | Fast   | Free |
| Google TTS     | Medium    | Fast   | Free |
| StreamElements | Medium    | Fast   | Free |

Configure via `TTS_PROVIDER` environment variable.

## Troubleshooting

**Audio not working:**

- Ensure HTTPS (required for microphone access)
- Check browser permissions for microphone
- Verify `OPENAI_API_KEY` is set

**CustomGPT not responding:**

- Verify `CUSTOMGPT_PROJECT_ID` and `CUSTOMGPT_API_KEY`
- Check `USE_CUSTOMGPT=true`

**Build errors:**

```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari/iOS: MP4 audio fallback (WebM not supported)

## License

MIT
