# Content Engine - Post-Production Pipeline

Automated video post-production with captions, background music, and multi-format export.

## Features

- **Automatic transcription** via OpenAI Whisper (word-level timestamps)
- **Animated captions** with brand styling (Montserrat Bold, orange highlight)
- **Audio processing** with normalization, compression, and background music mixing
- **Multi-format export**: 9:16 vertical, 1:1 square, 16:9 landscape
- **Slack notifications** on completion
- **API server** for content brief lifecycle management (port 3012)

## Setup

```bash
npm install
npm run build
```

## Environment Variables

Create `.env`:

```
OPENAI_API_KEY=sk-...
SLACK_BOT_TOKEN=xoxb-...
DB_PASSWORD=MapsPilot2026!Secure
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
pm2 start ecosystem.config.js
```

### Processing Videos

1. Drop `.mp4`/`.mov`/`.avi`/`.mkv` files into `raw/`
2. Engine auto-processes and exports to `output/{date}/{title}/`
3. Slack notification sent to #maps-content-output

### Optional: Background Music

Add `.mp3`/`.wav` files to `music/` directory. Engine randomly selects and mixes at 10% volume with sidechain ducking.

## API Endpoints

- `GET /health` - Health check
- `GET /api/cie-stats` - Analytics (briefs/week, film rate, top sources)
- `POST /api/brief/:id/status` - Update brief status (`pending`/`selected`/`filmed`/`published`)

## Directory Structure

```
content-engine/
├── src/
│   ├── compositions/       # Remotion video components
│   ├── utils/              # Whisper, FFmpeg, Slack, file watcher
│   ├── config/             # Brand colors, fonts, logo
│   ├── pipeline.ts         # Main processing logic
│   ├── api.ts              # HTTP API server
│   └── index.ts            # Entry point
├── raw/                    # Drop videos here
├── output/                 # Processed videos export here
├── music/                  # Background music tracks (optional)
├── assets/                 # Logo, images
└── logs/                   # PM2 logs
```

## Output Format

Each video exports to `output/{YYYY-MM-DD}/{title}/`:

- `{title}_vertical.mp4` - 1080x1920 (Instagram Reels, TikTok)
- `{title}_square.mp4` - 1080x1080 (Instagram feed)
- `{title}_landscape.mp4` - 1920x1080 (YouTube, LinkedIn)

All formats include:
- Animated word-by-word captions (brand styled)
- 3-second branded end card with CTA
- Normalized audio (-14 LUFS)
- Optional background music with ducking
