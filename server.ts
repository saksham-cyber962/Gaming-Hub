import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, ThinkingLevel, Modality } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Robust JSON string sanitizer to prevent SyntaxError: Bad control character in string literal in JSON
function sanitizeJsonString(raw: string): string {
  let inString = false;
  let escaped = false;
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = raw.charCodeAt(i);
    if (ch === '"' && !escaped) {
      inString = !inString;
      out += ch;
    } else if (escaped) {
      escaped = false;
      out += ch;
    } else if (ch === '\\') {
      escaped = true;
      out += ch;
    } else if (inString && code < 32) {
      if (ch === '\n') out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else if (ch === '\b') out += '\\b';
      else if (ch === '\f') out += '\\f';
      else out += ''; // strip unsupported control characters
    } else {
      out += ch;
    }
  }
  return out;
}

// Safe fetch wrapper that handles upstream Gemini responses containing unescaped control characters in JSON strings
const safeFetch = async (url: any, init: any) => {
  const res = await fetch(url, init);
  const origJson = res.json.bind(res);
  const clone = res.clone();
  res.json = async () => {
    try {
      return await origJson();
    } catch (err: any) {
      if (err instanceof SyntaxError && (err.message.includes('control character') || err.message.includes('JSON'))) {
        const raw = await clone.text();
        const clean = sanitizeJsonString(raw);
        return JSON.parse(clean);
      }
      throw err;
    }
  };
  return res;
};

// Server-side Gemini client instance
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    fetch: safeFetch as any,
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to check API key
const checkApiKey = (res: express.Response) => {
  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in the environment. Please check the Secrets configuration.',
    });
    return false;
  }
  return true;
};

// Procedural Fallback HTML5 Game Generator
function generateFallbackGameHtml(title: string, promptText: string, genre: string): string {
  const safeTitle = title.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${safeTitle}</title>
  <meta name="controls" content="Arrow Keys / WASD or On-Screen Virtual Touch Buttons" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background: #060712;
      color: #00f0ff;
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      width: 100vw;
    }
    #gameCanvas {
      background: radial-gradient(circle at center, #0e122b 0%, #05060d 100%);
      border: 1px solid rgba(0, 240, 255, 0.4);
      border-radius: 12px;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.2);
      max-width: 100%;
      max-height: 100%;
      touch-action: none;
    }
    #uiOverlay {
      position: absolute;
      top: 16px;
      left: 16px;
      right: 16px;
      display: flex;
      justify-content: space-between;
      pointer-events: none;
      font-weight: bold;
      text-shadow: 0 0 8px #00f0ff;
    }
    .scoreBadge {
      background: rgba(6, 7, 18, 0.85);
      border: 1px solid #00f0ff;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 14px;
      letter-spacing: 1px;
    }
    #touchControls {
      position: absolute;
      bottom: 20px;
      display: flex;
      gap: 16px;
      z-index: 10;
    }
    .touchBtn {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(0, 240, 255, 0.15);
      border: 2px solid #00f0ff;
      color: #fff;
      font-size: 20px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
      cursor: pointer;
      touch-action: manipulation;
    }
    .touchBtn:active { background: #00f0ff; color: #000; }
  </style>
</head>
<body>
  <div id="uiOverlay">
    <div class="scoreBadge" id="scoreDisplay">SCORE: 0</div>
    <div class="scoreBadge" id="genreBadge">${genre.toUpperCase()}</div>
  </div>
  <canvas id="gameCanvas" width="480" height="640"></canvas>
  <div id="touchControls">
    <button class="touchBtn" id="btnLeft">◀</button>
    <button class="touchBtn" id="btnFire">⚡</button>
    <button class="touchBtn" id="btnRight">▶</button>
  </div>
  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('scoreDisplay');
    
    // Web Audio Sound FX
    let audioCtx = null;
    function playBeep(freq = 440, type = 'sine', dur = 0.1) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + dur);
      } catch (e) {}
    }

    let score = 0;
    let gameOver = false;
    let player = { x: 240, y: 560, w: 32, h: 32, speed: 6, vx: 0 };
    let bullets = [];
    let enemies = [];
    let particles = [];
    let keys = {};

    window.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ' && !gameOver) shoot();
      if (gameOver && (e.key === ' ' || e.key === 'Enter')) restart();
    });
    window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

    document.getElementById('btnLeft').addEventListener('pointerdown', () => { keys['arrowleft'] = true; });
    document.getElementById('btnLeft').addEventListener('pointerup', () => { keys['arrowleft'] = false; });
    document.getElementById('btnRight').addEventListener('pointerdown', () => { keys['arrowright'] = true; });
    document.getElementById('btnRight').addEventListener('pointerup', () => { keys['arrowright'] = false; });
    document.getElementById('btnFire').addEventListener('pointerdown', () => {
      if (gameOver) restart(); else shoot();
    });

    function shoot() {
      bullets.push({ x: player.x, y: player.y - 10, vy: -10 });
      playBeep(880, 'square', 0.08);
    }

    function createExplosion(x, y, color = '#ff007f') {
      for (let i = 0; i < 15; i++) {
        particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          alpha: 1,
          color,
          size: Math.random() * 4 + 2
        });
      }
      playBeep(180, 'sawtooth', 0.2);
    }

    function restart() {
      score = 0;
      gameOver = false;
      player.x = 240;
      bullets = [];
      enemies = [];
      particles = [];
      scoreDisplay.textContent = 'SCORE: 0';
    }

    let frame = 0;
    function update() {
      frame++;
      if (gameOver) return;

      // Player Movement
      if (keys['arrowleft'] || keys['a']) player.x -= player.speed;
      if (keys['arrowright'] || keys['d']) player.x += player.speed;
      player.x = Math.max(player.w/2, Math.min(canvas.width - player.w/2, player.x));

      // Spawn Enemies
      if (frame % 45 === 0) {
        enemies.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: -20,
          w: 24, h: 24,
          vy: Math.random() * 2.5 + 2,
          color: frame % 90 === 0 ? '#ff007f' : '#00f0ff'
        });
      }

      // Update Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y += bullets[i].vy;
        if (bullets[i].y < 0) bullets.splice(i, 1);
      }

      // Update Enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += e.vy;

        // Collision with player
        const dist = Math.hypot(e.x - player.x, e.y - player.y);
        if (dist < 26) {
          createExplosion(player.x, player.y, '#ff3366');
          gameOver = true;
          playBeep(100, 'sawtooth', 0.5);
          break;
        }

        // Bullet collision
        for (let j = bullets.length - 1; j >= 0; j--) {
          const b = bullets[j];
          if (Math.hypot(e.x - b.x, e.y - b.y) < 20) {
            createExplosion(e.x, e.y, e.color);
            enemies.splice(i, 1);
            bullets.splice(j, 1);
            score += 100;
            scoreDisplay.textContent = 'SCORE: ' + score;
            break;
          }
        }

        if (e.y > canvas.height + 20) {
          enemies.splice(i, 1);
        }
      }

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) particles.splice(i, 1);
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Starfield background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 20; i++) {
        const sx = ((i * 37 + frame * 0.5) % canvas.width);
        const sy = ((i * 73 + frame * 1.5) % canvas.height);
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Draw Player Ship
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(16, 16);
      ctx.lineTo(0, 10);
      ctx.lineTo(-16, 16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Draw Bullets
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 10;
      for (const b of bullets) {
        ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
      }

      // Draw Enemies
      for (const e of enemies) {
        ctx.save();
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Particles
      for (const p of particles) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Game Over Screen
      if (gameOver) {
        ctx.fillStyle = 'rgba(6, 7, 18, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff007f';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 20;
        ctx.font = '900 32px system-ui';
        ctx.fillText('MISSION FAILED', canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 20px system-ui';
        ctx.fillText('FINAL SCORE: ' + score, canvas.width / 2, canvas.height / 2 + 10);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px system-ui';
        ctx.fillText('Tap ⚡ or Press SPACE to Replay', canvas.width / 2, canvas.height / 2 + 50);
      }

      requestAnimationFrame(() => {
        update();
        draw();
      });
    }

    draw();
  </script>
</body>
</html>`;
}

// 1. Fast tips & micro-cheats (gemini-3.1-flash-lite)
app.post('/api/gemini/fast-tips', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { gameTitle, category, currentScore, query } = req.body;
    const prompt = `You are a high-speed esports game assistant. Give 3 razor-sharp, actionable bullet-point tips or secret shortcuts for the game "${gameTitle || 'Retro Arcade'}" (${category || 'General'}). User context: ${query || 'How to achieve a high score or master core controls?'}. Current score: ${currentScore || 0}. Keep it punchy, practical, under 80 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: 'You are an ultra-fast competitive esports coach providing immediate concise tips.',
      },
    });

    res.json({ tips: response.text });
  } catch (err: any) {
    console.error('fast-tips error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch tips' });
  }
});

// 1.5. Prompt to Game Generator (gemini-3.8-flash)
// Generates a fully working self-contained playable HTML5/Canvas game from any user prompt
app.post('/api/gemini/generate-game', async (req, res) => {
  if (!checkApiKey(res)) return;
  const { prompt: userPrompt, genre } = req.body;
  const chosenGenre = genre || 'Action';
  let sanitizedPrompt = (userPrompt || 'Neon Space Dodge Shooter').trim();
  // Protect against excessively huge inputs
  if (sanitizedPrompt.length > 2500) {
    sanitizedPrompt = sanitizedPrompt.slice(0, 2500);
  }

  const fallbackTitle = sanitizedPrompt.length > 30 ? sanitizedPrompt.slice(0, 30) + '...' : sanitizedPrompt;

  try {
    const systemPrompt = `You are an expert HTML5 Canvas and JavaScript game developer.
The user wants to generate a complete, working, high-fun playable mini-game based on this prompt: "${sanitizedPrompt}" (Genre: ${chosenGenre}).

Output a single, complete, 100% self-contained HTML5 file with embedded <style> and <script>.
Do NOT wrap in JSON. Do NOT explain anything. Output ONLY the valid HTML code starting with <!DOCTYPE html>.
Do NOT include raw unescaped ASCII control characters in script strings.

CRITICAL REQUIREMENTS:
1. Self-Contained: All CSS and JavaScript must be inline inside <style> and <script> tags. No external libraries or scripts.
2. Structure: Include a <title>Game Title</title> and a <meta name="controls" content="Instructions e.g. WASD or Touch to Move">.
3. Canvas & Game Loop: Use HTML5 <canvas> filling the screen, 60fps requestAnimationFrame loop.
4. Responsive & Touch-Ready: Listen to BOTH Keyboard (Arrow keys, WASD, Space) AND Touch/Mouse events (canvas touchstart/touchmove/touchend or on-screen virtual buttons) so it is 100% playable on mobile phones and desktop.
5. Cyberpunk / Neon Visuals: Dark background (#060712), vibrant glowing colors (cyan, magenta, yellow, green).
6. Web Audio API: Generate simple sound effects using procedural AudioContext (beeps, laser sounds, explosion rumble, score chimes) wrapped in try/catch.
7. Game State: Score counter, Game Over screen with interactive "Play Again" button.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Create a complete self-contained HTML5 game for: "${sanitizedPrompt}". Output ONLY the HTML document starting with <!DOCTYPE html>.`,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    let rawText = response.text || '';

    // Strip markdown code fences if present (```html ... ```, ```json ... ```, ```xml ... ```)
    let cleanHtml = rawText;
    if (cleanHtml.includes('```html')) {
      cleanHtml = cleanHtml.split('```html')[1].split('```')[0].trim();
    } else if (cleanHtml.includes('```xml')) {
      cleanHtml = cleanHtml.split('```xml')[1].split('```')[0].trim();
    } else if (cleanHtml.includes('```json')) {
      cleanHtml = cleanHtml.split('```json')[1].split('```')[0].trim();
    } else if (cleanHtml.includes('```')) {
      cleanHtml = cleanHtml.split('```')[1].split('```')[0].trim();
    }

    // Fallback if model output was wrapped in JSON
    if (cleanHtml.trim().startsWith('{')) {
      try {
        const sanitized = sanitizeJsonString(cleanHtml);
        const parsed = JSON.parse(sanitized);
        if (parsed.html) cleanHtml = parsed.html;
        else if (parsed.code) cleanHtml = parsed.code;
      } catch {
        const htmlMatch = cleanHtml.match(/<!DOCTYPE[\s\S]*<\/html>/i) || cleanHtml.match(/<html[\s\S]*<\/html>/i);
        if (htmlMatch) cleanHtml = htmlMatch[0];
      }
    }

    // Extract title from <title> or fallback
    const titleMatch = cleanHtml.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : fallbackTitle;

    // Extract controls from <meta name="controls" content="...">
    const controlsMatch = cleanHtml.match(/<meta[^>]*name=["']controls["'][^>]*content=["']([^"']+)["']/i);
    const instructions = controlsMatch ? controlsMatch[1].trim() : 'Touch or Arrow Keys to Play';

    // If for any reason cleanHtml doesn't contain a canvas or basic html, use our robust fallback game
    if (!cleanHtml.includes('<canvas') && !cleanHtml.includes('<body')) {
      cleanHtml = generateFallbackGameHtml(title, sanitizedPrompt, chosenGenre);
    }

    res.json({
      title,
      genre: chosenGenre,
      instructions,
      html: cleanHtml,
    });
  } catch (err: any) {
    console.warn('generate-game warning (providing fallback game):', err?.message || err);
    // Provide an immediate procedural fallback game so the user's experience is NEVER broken!
    const fallbackHtml = generateFallbackGameHtml(fallbackTitle, sanitizedPrompt, chosenGenre);
    res.json({
      title: fallbackTitle,
      genre: chosenGenre,
      instructions: 'Keyboard Arrow Keys or On-Screen Virtual Touch Buttons',
      html: fallbackHtml,
      recovered: true,
    });
  }
});

// 2. Comprehensive Game Coach & Walkthrough (gemini-3.8-flash)
app.post('/api/gemini/game-coach', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { gameTitle, userQuery, history } = req.body;
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [
        {
          text: `Game: ${gameTitle}. User query: ${userQuery}. Provide expert tactical advice, controls breakdown, combo strategies, and common pitfalls to avoid. Format with clean markdown headers and bullet points.`,
        },
      ],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction:
          'You are ApexCoach, a grandmaster competitive gaming and speedrunning mentor for GAMING HUB. You give deep tactical insights, frame-data tips, and encouraging guidance.',
      },
    });

    res.json({ reply: response.text });
  } catch (err: any) {
    console.error('game-coach error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate coaching response' });
  }
});

// 3. High Thinking Deep Analysis (gemini-4-argon with thinkingLevel: HIGH)
app.post('/api/gemini/deep-analysis', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { topic, mechanics, complexQuestion } = req.body;
    const prompt = `Perform an exhaustive, master-level mathematical and tactical breakdown for:
Topic / Game: ${topic}
Mechanics: ${mechanics || 'Physics, momentum, RNG distribution, trajectory optimization'}
Question / Goal: ${complexQuestion}

Break down optimal decision trees, theoretical speedrun routes, input timing windows (in frames/milliseconds), and optimal risk-reward ratios.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    res.json({ analysis: response.text });
  } catch (err: any) {
    console.error('deep-analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute deep reasoning' });
  }
});

// 4. Video Understanding / Gameplay Review (gemini-4-argon)
app.post('/api/gemini/analyze-video', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { videoBase64, mimeType, gameTitle, analysisFocus } = req.body;
    if (!videoBase64) {
      return res.status(400).json({ error: 'Missing video data' });
    }

    const videoPart = {
      inlineData: {
        mimeType: mimeType || 'video/mp4',
        data: videoBase64,
      },
    };

    const textPart = {
      text: `Analyze this gameplay video clip of "${gameTitle || 'Gameplay'}". Focus area: ${analysisFocus || 'Combat execution, positioning mistakes, missed opportunities, and technical mechanics'}. Detail key timestamps and suggest 3 high-impact corrective adjustments.`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: { parts: [videoPart, textPart] },
    });

    res.json({ report: response.text });
  } catch (err: any) {
    console.error('analyze-video error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze video' });
  }
});

// 5. Audio Transcription (gemini-3.5-transcribe)
app.post('/api/gemini/transcribe', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: audioBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcribe this gaming voice command or question verbatim into clear text.' },
        ],
      },
    });

    res.json({ transcript: response.text });
  } catch (err: any) {
    console.error('transcribe error:', err);
    res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
});

// 6. High-Quality Image Generation (gemini-3-pro-image-preview with 1K, 2K, 4K size)
app.post('/api/gemini/generate-image', async (req, res) => {
  if (!checkApiKey(res)) return;
  try {
    const { prompt, aspectRatio = '16:9', imageSize = '1K' } = req.body;
    const validSizes = ['1K', '2K', '4K'];
    const chosenSize = validSizes.includes(imageSize) ? imageSize : '1K';

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: `High quality esports and video game concept art: ${prompt}. Cinematic lighting, vibrant neon accents, 8k render, octane render style, highly detailed.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: chosenSize as any,
        },
      },
    });

    let imageUrl = '';
    let caption = '';

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image was returned by the model.' });
    }

    res.json({ imageUrl, caption, imageSize: chosenSize, aspectRatio });
  } catch (err: any) {
    console.error('generate-image error:', err);
    res.status(500).json({ error: err.message || 'Image generation failed' });
  }
});

// Create HTTP server for Express and WebSocket
const server = http.createServer(app);

// 7. Live API Voice Conversations (gemini-3.8-live) WebSocket bridge
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Gemini Live voice bridge');
  let liveSession: any = null;

  try {
    if (!process.env.GEMINI_API_KEY) {
      clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY is not configured.' }));
      clientWs.close();
      return;
    }

    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction:
          'You are ApexLive, an instantaneous voice co-pilot and real-time esports strategist. Keep your voice responses concise, energetic, and highly tactical during gaming sessions.',
      },
      callbacks: {
        onmessage: (message: any) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ closed: true }));
          }
        },
      },
    });

    clientWs.on('message', (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio && liveSession) {
          liveSession.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err) {
        console.error('Error handling live client audio message:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client closed live voice connection');
      if (liveSession && typeof liveSession.close === 'function') {
        liveSession.close();
      }
    });
  } catch (err: any) {
    console.error('Live session initialization error:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: err.message || 'Live session error' }));
      clientWs.close();
    }
  }
});

// Serve public assets (manifest, robots, sitemap, icon)
app.use(express.static(path.resolve(__dirname, 'public')));

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 GAMING HUB Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
