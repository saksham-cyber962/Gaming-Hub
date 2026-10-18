import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw, Flag, ArrowLeft, Bomb, Trophy } from 'lucide-react';

interface RetroMinesweeperProps {
  onExit?: () => void;
  onRecordScore?: (score: number) => void;
}

type Cell = {
  r: number;
  c: number;
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
};

export const RetroMinesweeper: React.FC<RetroMinesweeperProps> = ({ onExit, onRecordScore }) => {
  const rows = 9;
  const cols = 9;
  const mineCount = 10;

  const [grid, setGrid] = useState<Cell[][]>([]);
  const [flagMode, setFlagMode] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [time, setTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const initGame = useCallback(() => {
    // Generate empty board
    const newGrid: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          r,
          c,
          mine: false,
          revealed: false,
          flagged: false,
          adjacentMines: 0,
        });
      }
      newGrid.push(row);
    }

    // Place mines
    let placed = 0;
    while (placed < mineCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!newGrid[r][c].mine) {
        newGrid[r][c].mine = true;
        placed++;
      }
    }

    // Compute adjacent mines
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (newGrid[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newGrid[nr][nc].mine) {
              count++;
            }
          }
        }
        newGrid[r][c].adjacentMines = count;
      }
    }

    setGrid(newGrid);
    setGameOver(false);
    setVictory(false);
    setTime(0);
    setTimerActive(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    let interval: any;
    if (timerActive && !gameOver && !victory) {
      interval = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameOver, victory]);

  const revealCell = (r: number, c: number) => {
    if (gameOver || victory) return;
    if (!timerActive) setTimerActive(true);

    const cell = grid[r][c];
    if (cell.revealed || cell.flagged) return;

    if (flagMode) {
      toggleFlag(r, c);
      return;
    }

    const next = grid.map((row) => row.map((item) => ({ ...item })));

    if (cell.mine) {
      // Game Over: reveal all mines
      for (let ro = 0; ro < rows; ro++) {
        for (let co = 0; co < cols; co++) {
          if (next[ro][co].mine) next[ro][co].revealed = true;
        }
      }
      setGrid(next);
      setGameOver(true);
      setTimerActive(false);
      return;
    }

    // Flood fill empty cells
    const flood = (cr: number, cc: number) => {
      if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) return;
      const target = next[cr][cc];
      if (target.revealed || target.flagged || target.mine) return;

      target.revealed = true;
      if (target.adjacentMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            flood(cr + dr, cc + dc);
          }
        }
      }
    };

    flood(r, c);
    setGrid(next);

    // Check Victory
    let unrevealedSafe = 0;
    for (let ro = 0; ro < rows; ro++) {
      for (let co = 0; co < cols; co++) {
        if (!next[ro][co].mine && !next[ro][co].revealed) {
          unrevealedSafe++;
        }
      }
    }

    if (unrevealedSafe === 0) {
      setVictory(true);
      setTimerActive(false);
      if (onRecordScore) onRecordScore(Math.max(10, 1000 - time * 10));
    }
  };

  const toggleFlag = (r: number, c: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (gameOver || victory) return;
    const next = grid.map((row) => row.map((item) => ({ ...item })));
    if (next[r][c].revealed) return;
    next[r][c].flagged = !next[r][c].flagged;
    setGrid(next);
  };

  const flagCount = grid.reduce((acc, row) => acc + row.filter((c) => c.flagged).length, 0);

  return (
    <div className="relative w-full max-w-md mx-auto bg-slate-950 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl p-5 sm:p-6 flex flex-col items-center select-none">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <div className="text-xl font-orbitron font-black text-cyan-400 tracking-wider">RETRO MINES</div>
          <div className="text-xs font-rajdhani text-slate-400">Cyberpunk Minefield Protocol</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-center">
            <div className="text-[10px] font-orbitron text-red-400">Mines</div>
            <div className="text-sm font-orbitron font-bold text-white tabular-nums">{mineCount - flagCount}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-center">
            <div className="text-[10px] font-orbitron text-cyan-400">Timer</div>
            <div className="text-sm font-orbitron font-bold text-white tabular-nums">{time}s</div>
          </div>
          <button
            onClick={initGame}
            className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20"
            title="Restart"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Flag Mode Toggle on Mobile */}
      <div className="w-full flex justify-between items-center mb-3">
        <span className="text-xs font-rajdhani text-slate-400">Right click or tap toggle to place flags</span>
        <button
          onClick={() => setFlagMode(!flagMode)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-orbitron flex items-center gap-1.5 transition-all ${
            flagMode
              ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <Flag className="w-3.5 h-3.5" /> {flagMode ? 'FLAGGING ON' : 'REVEAL MODE'}
        </button>
      </div>

      {/* Mines Grid */}
      <div className="relative aspect-square w-full max-w-[340px] bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 grid grid-cols-9 grid-rows-9 gap-1">
        {grid.map((row, r) =>
          row.map((cell, c) => {
            let content = '';
            let style = 'bg-slate-800/90 border-slate-700/80 text-white hover:bg-slate-700/90';

            if (cell.revealed) {
              if (cell.mine) {
                content = '💥';
                style = 'bg-red-950 border-red-500 text-white animate-bounce';
              } else {
                style = 'bg-slate-950 border-slate-900 text-cyan-300 font-bold';
                if (cell.adjacentMines > 0) {
                  content = cell.adjacentMines.toString();
                  if (cell.adjacentMines === 1) style += ' text-cyan-400';
                  else if (cell.adjacentMines === 2) style += ' text-emerald-400';
                  else if (cell.adjacentMines === 3) style += ' text-amber-400';
                  else style += ' text-pink-400';
                }
              }
            } else if (cell.flagged) {
              content = '🚩';
              style = 'bg-red-950/60 border-red-500/80 text-red-400';
            }

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => revealCell(r, c)}
                onContextMenu={(e) => toggleFlag(r, c, e)}
                className={`rounded border text-xs sm:text-sm font-orbitron flex items-center justify-center transition-all ${style}`}
              >
                {content}
              </button>
            );
          })
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 text-center">
            <Bomb className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
            <h3 className="text-xl font-orbitron font-black text-red-400 mb-1">DETONATION TRIGGERED</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-3">You triggered a concealed mine.</p>
            <button
              onClick={initGame}
              className="px-6 py-2 rounded-full bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase"
            >
              Reset Protocol
            </button>
          </div>
        )}

        {victory && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-4 text-center">
            <Trophy className="w-8 h-8 text-emerald-400 mb-2" />
            <h3 className="text-xl font-orbitron font-black text-emerald-400 mb-1">FIELD NEUTRALIZED</h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-3">All safe nodes revealed in {time} seconds!</p>
            <button
              onClick={initGame}
              className="px-6 py-2 rounded-full bg-emerald-400 text-slate-950 font-orbitron font-bold text-xs uppercase"
            >
              Next Mission
            </button>
          </div>
        )}
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
