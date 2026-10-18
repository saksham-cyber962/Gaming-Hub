import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCw, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

interface CyberBreakoutProps {
  onExit?: () => void;
  onRecordScore?: (score: number) => void;
}

export const CyberBreakout: React.FC<CyberBreakoutProps> = ({ onExit, onRecordScore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover' | 'victory'>('title');
  const [muted, setMuted] = useState(false);

  const stateRef = useRef({
    paddleX: 160,
    paddleW: 80,
    paddleH: 12,
    ballX: 200,
    ballY: 300,
    ballVx: 4,
    ballVy: -4,
    ballR: 6,
    bricks: [] as Array<{ x: number; y: number; w: number; h: number; color: string; alive: boolean; points: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>,
    lives: 3,
    score: 0,
    running: false,
    muted: false,
  });

  const playTone = useCallback((freq = 440, type: OscillatorType = 'sine', duration = 0.1) => {
    if (stateRef.current.muted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, []);

  const initBricks = () => {
    const rows = 5;
    const cols = 8;
    const w = 44;
    const h = 18;
    const padding = 6;
    const offsetX = 10;
    const offsetY = 40;
    const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#00f0ff'];

    const bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: offsetX + c * (w + padding),
          y: offsetY + r * (h + padding),
          w,
          h,
          color: colors[r],
          alive: true,
          points: (rows - r) * 50,
        });
      }
    }
    stateRef.current.bricks = bricks;
  };

  const createBurst = (x: number, y: number, color: string) => {
    for (let i = 0; i < 14; i++) {
      stateRef.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color,
      });
    }
  };

  const startGame = () => {
    const s = stateRef.current;
    s.score = 0;
    s.lives = 3;
    s.paddleX = 160;
    s.ballX = 200;
    s.ballY = 320;
    s.ballVx = (Math.random() > 0.5 ? 1 : -1) * 3.5;
    s.ballVy = -4.5;
    s.particles = [];
    s.running = true;
    initBricks();
    setScore(0);
    setLives(3);
    setGameState('playing');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const loop = () => {
      animId = requestAnimationFrame(loop);
      const s = stateRef.current;

      if (s.running) {
        // Move ball
        s.ballX += s.ballVx;
        s.ballY += s.ballVy;

        // Wall collisions
        if (s.ballX - s.ballR <= 0) {
          s.ballX = s.ballR;
          s.ballVx = -s.ballVx;
          playTone(300);
        } else if (s.ballX + s.ballR >= canvas.width) {
          s.ballX = canvas.width - s.ballR;
          s.ballVx = -s.ballVx;
          playTone(300);
        }

        if (s.ballY - s.ballR <= 0) {
          s.ballY = s.ballR;
          s.ballVy = -s.ballVy;
          playTone(300);
        } else if (s.ballY + s.ballR >= canvas.height) {
          // Ball lost
          s.lives -= 1;
          setLives(s.lives);
          playTone(150, 'sawtooth', 0.3);

          if (s.lives <= 0) {
            s.running = false;
            setGameState('gameover');
            if (onRecordScore) onRecordScore(s.score);
          } else {
            // Reset ball
            s.ballX = 200;
            s.ballY = 320;
            s.ballVx = (Math.random() > 0.5 ? 1 : -1) * 3.5;
            s.ballVy = -4.5;
          }
        }

        // Paddle Collision
        const paddleY = canvas.height - 30;
        if (
          s.ballY + s.ballR >= paddleY &&
          s.ballY - s.ballR <= paddleY + s.paddleH &&
          s.ballX >= s.paddleX &&
          s.ballX <= s.paddleX + s.paddleW
        ) {
          s.ballVy = -Math.abs(s.ballVy);
          // Angle deflection based on hit position
          const hitOffset = (s.ballX - (s.paddleX + s.paddleW / 2)) / (s.paddleW / 2);
          s.ballVx = hitOffset * 5.5;
          playTone(480, 'triangle');
        }

        // Brick Collisions
        let remainingBricks = 0;
        for (const brick of s.bricks) {
          if (!brick.alive) continue;
          remainingBricks++;

          if (
            s.ballX + s.ballR >= brick.x &&
            s.ballX - s.ballR <= brick.x + brick.w &&
            s.ballY + s.ballR >= brick.y &&
            s.ballY - s.ballR <= brick.y + brick.h
          ) {
            brick.alive = false;
            s.score += brick.points;
            setScore(s.score);
            s.ballVy = -s.ballVy;
            createBurst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);
            playTone(600 + Math.random() * 200);
            break;
          }
        }

        if (remainingBricks === 0) {
          s.running = false;
          setGameState('victory');
          playTone(800, 'sine', 0.5);
          if (onRecordScore) onRecordScore(s.score);
        }
      }

      // Draw Screen
      ctx.fillStyle = '#060712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint cyber grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw Bricks
      for (const brick of s.bricks) {
        if (!brick.alive) continue;
        ctx.save();
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = brick.color;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4);
        ctx.fill();
        ctx.restore();
      }

      // Draw Paddle
      const paddleY = canvas.height - 30;
      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.roundRect(s.paddleX, paddleY, s.paddleW, s.paddleH, 6);
      ctx.fill();
      ctx.restore();

      // Draw Ball
      ctx.save();
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(s.ballX, s.ballY, s.ballR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Particles
      for (let p = s.particles.length - 1; p >= 0; p--) {
        const part = s.particles[p];
        part.x += part.vx;
        part.y += part.vy;
        part.life -= 0.04;
        if (part.life <= 0) {
          s.particles.splice(p, 1);
          continue;
        }
        ctx.save();
        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.life;
        ctx.beginPath();
        ctx.arc(part.x, part.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    animId = requestAnimationFrame(loop);

    // Mouse / Touch paddle steer
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const scale = canvas.width / rect.width;
      stateRef.current.paddleX = Math.max(0, Math.min(canvas.width - stateRef.current.paddleW, x * scale - stateRef.current.paddleW / 2));
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, [onRecordScore, playTone]);

  return (
    <div className="relative w-full max-w-md mx-auto bg-slate-950 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl p-5 sm:p-6 flex flex-col items-center select-none">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <div className="text-xl font-orbitron font-black text-cyan-400 tracking-wider">CYBER BREAKOUT</div>
          <div className="text-xs font-rajdhani text-slate-400">Paddle physics & neon bricks</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-orbitron uppercase text-slate-400">Score</div>
            <div className="text-lg font-orbitron font-black text-white tabular-nums">{score}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-orbitron uppercase text-purple-400">Shields</div>
            <div className="text-lg font-orbitron font-black text-purple-300 tabular-nums">{'♥'.repeat(lives)}</div>
          </div>
          <button
            onClick={() => {
              setMuted(!muted);
              stateRef.current.muted = !muted;
            }}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300"
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden border border-slate-800 bg-black">
        <canvas ref={canvasRef} width={400} height={500} className="w-full h-full block" />

        {gameState === 'title' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-orbitron font-black text-cyan-400 mb-2">CYBER BREAKOUT</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-6 max-w-xs">
              Slide paddle with finger or mouse. Deflect the cyber ball to destroy defensive security matrices.
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-full bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-transform active:scale-95 shadow-lg flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-slate-950" /> Start Game
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-orbitron font-black text-red-400 mb-1">SHIELDS EXHAUSTED</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-4">All defense orbs lost. Final score: {score}</p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-full bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-transform active:scale-95 shadow-lg flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-orbitron font-black text-emerald-400 mb-1">GRID CLEARED</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-4">All defensive nodes smashed! Score: {score}</p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-full bg-emerald-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-emerald-300 transition-transform active:scale-95 shadow-lg flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Play Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] font-rajdhani text-slate-400 text-center">
        Move pointer or drag finger across screen to slide paddle.
      </div>

      {onExit && (
        <button
          onClick={onExit}
          className="mt-4 text-xs font-rajdhani text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Catalog
        </button>
      )}
    </div>
  );
};
