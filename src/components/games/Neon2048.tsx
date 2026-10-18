import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCw, Undo2, ArrowLeft, Trophy } from 'lucide-react';

interface Neon2048Props {
  onExit?: () => void;
  onRecordScore?: (score: number) => void;
}

export const Neon2048: React.FC<Neon2048Props> = ({ onExit, onRecordScore }) => {
  const [board, setBoard] = useState<number[][]>(() => createInitialBoard());
  const [prevBoard, setPrevBoard] = useState<number[][] | null>(null);
  const [score, setScore] = useState(0);
  const [prevScore, setPrevScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('gh_2048_high') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [gameOver, setGameOver] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function createInitialBoard(): number[][] {
    const b = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    addRandomTile(b);
    addRandomTile(b);
    return b;
  }

  function addRandomTile(b: number[][]) {
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    b[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  const slide = (row: number[]): { newRow: number[]; gained: number } => {
    let arr = row.filter((x) => x !== 0);
    let gained = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        gained += arr[i];
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < 4) {
      arr.push(0);
    }
    return { newRow: arr, gained };
  };

  const move = useCallback(
    (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
      if (gameOver) return;

      let changed = false;
      let roundGained = 0;
      const next = board.map((row) => [...row]);

      if (dir === 'LEFT') {
        for (let r = 0; r < 4; r++) {
          const { newRow, gained } = slide(next[r]);
          if (newRow.some((val, idx) => val !== next[r][idx])) changed = true;
          next[r] = newRow;
          roundGained += gained;
        }
      } else if (dir === 'RIGHT') {
        for (let r = 0; r < 4; r++) {
          const reversed = [...next[r]].reverse();
          const { newRow, gained } = slide(reversed);
          newRow.reverse();
          if (newRow.some((val, idx) => val !== next[r][idx])) changed = true;
          next[r] = newRow;
          roundGained += gained;
        }
      } else if (dir === 'UP') {
        for (let c = 0; c < 4; c++) {
          const col = [next[0][c], next[1][c], next[2][c], next[3][c]];
          const { newRow, gained } = slide(col);
          for (let r = 0; r < 4; r++) {
            if (next[r][c] !== newRow[r]) changed = true;
            next[r][c] = newRow[r];
          }
          roundGained += gained;
        }
      } else if (dir === 'DOWN') {
        for (let c = 0; c < 4; c++) {
          const col = [next[3][c], next[2][c], next[1][c], next[0][c]];
          const { newRow, gained } = slide(col);
          for (let r = 0; r < 4; r++) {
            if (next[3 - r][c] !== newRow[r]) changed = true;
            next[3 - r][c] = newRow[r];
          }
          roundGained += gained;
        }
      }

      if (changed) {
        setPrevBoard(board.map((r) => [...r]));
        setPrevScore(score);
        addRandomTile(next);
        setBoard(next);
        const newScore = score + roundGained;
        setScore(newScore);

        if (newScore > highScore) {
          setHighScore(newScore);
          try {
            localStorage.setItem('gh_2048_high', newScore.toString());
          } catch {}
        }
        if (onRecordScore) onRecordScore(newScore);

        // Check game over condition
        if (checkGameOver(next)) {
          setGameOver(true);
        }
      }
    },
    [board, gameOver, highScore, onRecordScore, score]
  );

  const checkGameOver = (b: number[][]): boolean => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (b[r][c] === 0) return false;
        if (r < 3 && b[r][c] === b[r + 1][c]) return false;
        if (c < 3 && b[r][c] === b[r][c + 1]) return false;
      }
    }
    return true;
  };

  const restart = () => {
    setBoard(createInitialBoard());
    setPrevBoard(null);
    setScore(0);
    setGameOver(false);
  };

  const undo = () => {
    if (!prevBoard) return;
    setBoard(prevBoard);
    setScore(prevScore);
    setPrevBoard(null);
    setGameOver(false);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        move('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        move('RIGHT');
      } else if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        move('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        move('DOWN');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 30) {
      if (absX > absY) {
        move(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        move(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStartRef.current = null;
  };

  const getTileStyle = (val: number) => {
    switch (val) {
      case 2:
        return 'bg-slate-900 border-cyan-500/30 text-cyan-400';
      case 4:
        return 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300';
      case 8:
        return 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300';
      case 16:
        return 'bg-purple-950/80 border-purple-500/60 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.4)]';
      case 32:
        return 'bg-purple-900/90 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.6)]';
      case 64:
        return 'bg-pink-950/90 border-pink-500 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.5)]';
      case 128:
        return 'bg-pink-900 border-pink-400 text-white shadow-[0_0_18px_rgba(236,72,153,0.7)]';
      case 256:
        return 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)]';
      case 512:
        return 'bg-amber-900 border-amber-400 text-white shadow-[0_0_22px_rgba(245,158,11,0.8)]';
      case 1024:
        return 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.7)]';
      case 2048:
        return 'bg-emerald-900 border-emerald-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.9)] animate-pulse';
      default:
        return val > 2048
          ? 'bg-cyan-900 border-cyan-300 text-white shadow-[0_0_35px_rgba(0,240,255,1)]'
          : 'bg-slate-900/40 border-slate-800 text-slate-600';
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto bg-slate-950 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl p-5 sm:p-6 flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-orbitron font-black text-cyan-400 tracking-wider">2048 NEON</div>
          <div className="text-xs font-rajdhani text-slate-400">Join the tiles to reach 2048!</div>
        </div>

        <div className="flex gap-2">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <div className="text-[10px] font-orbitron uppercase text-slate-400">Score</div>
            <div className="text-sm font-orbitron font-bold text-white tabular-nums">{score}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-center min-w-[70px]">
            <div className="text-[10px] font-orbitron uppercase text-purple-400 flex items-center justify-center gap-1">
              <Trophy className="w-2.5 h-2.5" /> Best
            </div>
            <div className="text-sm font-orbitron font-bold text-purple-300 tabular-nums">{highScore}</div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full flex justify-between items-center mb-4">
        <button
          onClick={undo}
          disabled={!prevBoard}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 text-xs font-orbitron flex items-center gap-1.5"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>

        <button
          onClick={restart}
          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20 text-xs font-orbitron flex items-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" /> New Game
        </button>
      </div>

      {/* 4x4 Grid with Touch Handlers */}
      <div
        className="relative aspect-square w-full rounded-2xl bg-slate-900/90 border border-slate-800 p-3 grid grid-cols-4 grid-rows-4 gap-2.5 touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {board.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className={`rounded-xl border flex items-center justify-center font-orbitron font-black text-xl sm:text-2xl transition-all duration-150 ${getTileStyle(
                val
              )}`}
            >
              {val > 0 ? val : ''}
            </div>
          ))
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-orbitron font-black text-red-400 mb-1">GAME OVER</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-4">No more valid moves remaining!</p>
            <button
              onClick={restart}
              className="px-6 py-2.5 rounded-full bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-transform active:scale-95 shadow-lg flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-[11px] font-rajdhani text-slate-400 text-center">
        Swipe on screen or use WASD / Arrow keys on keyboard.
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
