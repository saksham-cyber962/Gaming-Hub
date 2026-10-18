import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCw, Volume2, VolumeX, ArrowLeft } from 'lucide-react';

interface NeonSnakeProps {
  onExit?: () => void;
  onRecordScore?: (score: number) => void;
}

export const NeonSnake: React.FC<NeonSnakeProps> = ({ onExit, onRecordScore }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('gh_snake_high') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>('title');
  const [muted, setMuted] = useState(false);

  const stateRef = useRef({
    gridSize: 20,
    tileCount: 20,
    snake: [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }],
    velocity: { x: 0, y: -1 },
    nextVelocity: { x: 0, y: -1 },
    food: { x: 15, y: 5 },
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>,
    score: 0,
    speed: 120, // ms per tick
    lastTick: 0,
    running: false,
    muted: false,
  });

  const playBeep = useCallback((freq = 440) => {
    if (stateRef.current.muted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {}
  }, []);

  const spawnFood = () => {
    const s = stateRef.current;
    let newX: number;
    let newY: number;
    let collision = true;
    while (collision) {
      newX = Math.floor(Math.random() * s.tileCount);
      newY = Math.floor(Math.random() * s.tileCount);
      // eslint-disable-next-line no-loop-func
      collision = s.snake.some((seg) => seg.x === newX && seg.y === newY);
      if (!collision) {
        s.food = { x: newX, y: newY };
      }
    }
  };

  const createParticles = (x: number, y: number, color = '#00f0ff') => {
    for (let i = 0; i < 12; i++) {
      stateRef.current.particles.push({
        x: x * 20 + 10,
        y: y * 20 + 10,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1.0,
        color,
      });
    }
  };

  const startGame = () => {
    const s = stateRef.current;
    s.snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    s.velocity = { x: 0, y: -1 };
    s.nextVelocity = { x: 0, y: -1 };
    s.score = 0;
    s.speed = 120;
    s.particles = [];
    s.running = true;
    spawnFood();
    setScore(0);
    setGameState('playing');
  };

  const handleGameOver = () => {
    const s = stateRef.current;
    s.running = false;
    setGameState('gameover');
    playBeep(180);
    if (s.score > highScore) {
      setHighScore(s.score);
      try {
        localStorage.setItem('gh_snake_high', s.score.toString());
      } catch {}
    }
    if (onRecordScore) {
      onRecordScore(s.score);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const gameLoop = (timestamp: number) => {
      animId = requestAnimationFrame(gameLoop);
      const s = stateRef.current;

      // Update simulation if running
      if (s.running && timestamp - s.lastTick > s.speed) {
        s.lastTick = timestamp;
        s.velocity = { ...s.nextVelocity };

        const head = { x: s.snake[0].x + s.velocity.x, y: s.snake[0].y + s.velocity.y };

        // Wall collision or self collision
        if (
          head.x < 0 ||
          head.x >= s.tileCount ||
          head.y < 0 ||
          head.y >= s.tileCount ||
          s.snake.some((seg) => seg.x === head.x && seg.y === head.y)
        ) {
          handleGameOver();
          return;
        }

        s.snake.unshift(head);

        // Check food collision
        if (head.x === s.food.x && head.y === s.food.y) {
          s.score += 100;
          setScore(s.score);
          createParticles(s.food.x, s.food.y, '#10b981');
          playBeep(620);
          spawnFood();
          s.speed = Math.max(70, s.speed - 1.5); // Accelerate
        } else {
          s.snake.pop();
        }
      }

      // Render Canvas
      ctx.fillStyle = '#060712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint cyber grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Glowing Food
      const fx = s.food.x * 20 + 10;
      const fy = s.food.y * 20 + 10;
      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(fx, fy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Snake Body
      s.snake.forEach((seg, idx) => {
        const isHead = idx === 0;
        ctx.save();
        if (isHead) {
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#00f0ff';
        } else {
          const ratio = 1 - idx / s.snake.length;
          ctx.fillStyle = `rgba(168, 85, 247, ${0.4 + ratio * 0.6})`;
        }
        ctx.beginPath();
        ctx.roundRect(seg.x * 20 + 2, seg.y * 20 + 2, 16, 16, 4);
        ctx.fill();
        ctx.restore();
      });

      // Update & Draw Particles
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

    animId = requestAnimationFrame(gameLoop);

    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (['ArrowUp', 'KeyW'].includes(e.code) && s.velocity.y === 0) {
        s.nextVelocity = { x: 0, y: -1 };
        e.preventDefault();
      } else if (['ArrowDown', 'KeyS'].includes(e.code) && s.velocity.y === 0) {
        s.nextVelocity = { x: 0, y: 1 };
        e.preventDefault();
      } else if (['ArrowLeft', 'KeyA'].includes(e.code) && s.velocity.x === 0) {
        s.nextVelocity = { x: -1, y: 0 };
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD'].includes(e.code) && s.velocity.x === 0) {
        s.nextVelocity = { x: 1, y: 0 };
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKey);
    };
  }, [highScore, onRecordScore, playBeep]);

  const setDir = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const s = stateRef.current;
    if (dir === 'UP' && s.velocity.y === 0) s.nextVelocity = { x: 0, y: -1 };
    if (dir === 'DOWN' && s.velocity.y === 0) s.nextVelocity = { x: 0, y: 1 };
    if (dir === 'LEFT' && s.velocity.x === 0) s.nextVelocity = { x: -1, y: 0 };
    if (dir === 'RIGHT' && s.velocity.x === 0) s.nextVelocity = { x: 1, y: 0 };
  };

  return (
    <div className="relative w-full max-w-xl mx-auto bg-slate-950 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl p-4 sm:p-6 flex flex-col items-center">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-orbitron font-black text-cyan-400 tracking-wider">NEON SNAKE</div>
          <span className="text-[10px] font-orbitron uppercase bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
            Self-Hosted
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] font-orbitron uppercase text-slate-400">Score</div>
            <div className="text-lg font-orbitron font-black text-white tabular-nums">{score}</div>
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

      {/* Canvas Wrapper */}
      <div className="relative aspect-square w-full max-w-[400px] rounded-xl overflow-hidden border border-slate-800 bg-black">
        <canvas ref={canvasRef} width={400} height={400} className="w-full h-full block" />

        {gameState === 'title' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-orbitron font-black text-cyan-400 mb-2">NEON SNAKE</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-6">
              Swipe or use Arrow Keys to guide the glowing serpent. Avoid grid boundaries and self-intersections.
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
            <h3 className="text-2xl font-orbitron font-black text-red-400 mb-1">CIRCUIT CRASH</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-4">Collision detected. Final score: {score}</p>
            <button
              onClick={startGame}
              className="px-8 py-3 rounded-full bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-transform active:scale-95 shadow-lg flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      {/* Mobile Virtual D-Pad */}
      <div className="mt-4 flex flex-col items-center gap-1 sm:hidden">
        <button
          onClick={() => setDir('UP')}
          className="w-12 h-12 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 font-bold text-lg active:bg-cyan-500/20"
        >
          ▲
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => setDir('LEFT')}
            className="w-12 h-12 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 font-bold text-lg active:bg-cyan-500/20"
          >
            ◀
          </button>
          <button
            onClick={() => setDir('DOWN')}
            className="w-12 h-12 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 font-bold text-lg active:bg-cyan-500/20"
          >
            ▼
          </button>
          <button
            onClick={() => setDir('RIGHT')}
            className="w-12 h-12 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-400 font-bold text-lg active:bg-cyan-500/20"
          >
            ▶
          </button>
        </div>
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
