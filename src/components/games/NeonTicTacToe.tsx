import React, { useState } from 'react';
import { RotateCw, ArrowLeft, Bot, User, Sparkles } from 'lucide-react';

interface NeonTicTacToeProps {
  onExit?: () => void;
  onRecordScore?: (score: number) => void;
}

type SquareValue = 'X' | 'O' | null;

export const NeonTicTacToe: React.FC<NeonTicTacToeProps> = ({ onExit, onRecordScore }) => {
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [difficulty, setDifficulty] = useState<'master' | 'casual'>('master');
  const [streak, setStreak] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const checkWinner = (b: SquareValue[]): { winner: SquareValue; line: number[] | null } => {
    for (const combo of winningCombinations) {
      const [a, bIndex, c] = combo;
      if (b[a] && b[a] === b[bIndex] && b[a] === b[c]) {
        return { winner: b[a], line: combo };
      }
    }
    if (b.every((cell) => cell !== null)) {
      return { winner: null, line: null };
    }
    return { winner: null, line: null };
  };

  const minimax = (newBoard: SquareValue[], player: 'X' | 'O'): { score: number; index?: number } => {
    const availSpots = newBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((idx) => idx !== null) as number[];

    const result = checkWinner(newBoard);
    if (result.winner === 'X') return { score: -10 };
    if (result.winner === 'O') return { score: 10 };
    if (availSpots.length === 0) return { score: 0 };

    const moves: Array<{ index: number; score: number }> = [];

    for (let i = 0; i < availSpots.length; i++) {
      const idx = availSpots[i];
      newBoard[idx] = player;

      if (player === 'O') {
        const nextResult = minimax(newBoard, 'X');
        moves.push({ index: idx, score: nextResult.score });
      } else {
        const nextResult = minimax(newBoard, 'O');
        moves.push({ index: idx, score: nextResult.score });
      }

      newBoard[idx] = null;
    }

    let bestMove = 0;
    if (player === 'O') {
      let bestScore = -10000;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score > bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    } else {
      let bestScore = 10000;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score < bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    }

    return moves[bestMove];
  };

  const makeAiMove = (currentBoard: SquareValue[]) => {
    const available = currentBoard
      .map((val, idx) => (val === null ? idx : null))
      .filter((idx) => idx !== null) as number[];

    if (available.length === 0) return;

    let targetIdx: number;
    if (difficulty === 'casual' && Math.random() < 0.45) {
      // Random move in casual mode
      targetIdx = available[Math.floor(Math.random() * available.length)];
    } else {
      // Unbeatable Minimax AI
      const best = minimax([...currentBoard], 'O');
      targetIdx = best.index ?? available[0];
    }

    const next = [...currentBoard];
    next[targetIdx] = 'O';
    setBoard(next);

    const outcome = checkWinner(next);
    if (outcome.winner === 'O') {
      setWinner('AI Wins');
      setWinningLine(outcome.line);
      setStreak(0);
    } else if (next.every((sq) => sq !== null)) {
      setWinner('Draw');
    }
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;

    const next = [...board];
    next[index] = 'X';
    setBoard(next);

    const outcome = checkWinner(next);
    if (outcome.winner === 'X') {
      setWinner('Player Wins');
      setWinningLine(outcome.line);
      setStreak((s) => s + 1);
      if (onRecordScore) onRecordScore(300);
      return;
    } else if (next.every((sq) => sq !== null)) {
      setWinner('Draw');
      return;
    }

    // AI Turn with brief delay
    setTimeout(() => {
      makeAiMove(next);
    }, 220);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine(null);
  };

  return (
    <div className="relative w-full max-w-md mx-auto bg-slate-950 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl p-5 sm:p-6 flex flex-col items-center select-none">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <div className="text-xl font-orbitron font-black text-cyan-400 tracking-wider">NEON TIC-TAC-TOE</div>
          <div className="text-xs font-rajdhani text-slate-400">Minimax Unbeatable AI Engine</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl text-center">
            <div className="text-[10px] font-orbitron text-cyan-400">Streak</div>
            <div className="text-sm font-orbitron font-bold text-white tabular-nums">{streak}</div>
          </div>
          <button
            onClick={reset}
            className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20"
            title="Reset"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Difficulty Switch */}
      <div className="w-full flex justify-between items-center mb-4 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => {
            setDifficulty('master');
            reset();
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center justify-center gap-1.5 transition-all ${
            difficulty === 'master'
              ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> MASTER AI
        </button>
        <button
          onClick={() => {
            setDifficulty('casual');
            reset();
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-orbitron font-bold flex items-center justify-center gap-1.5 transition-all ${
            difficulty === 'casual'
              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.5)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" /> CASUAL
        </button>
      </div>

      {/* 3x3 Grid */}
      <div className="relative aspect-square w-full max-w-[300px] bg-slate-900/90 border border-slate-800 rounded-2xl p-3 grid grid-cols-3 grid-rows-3 gap-2.5">
        {board.map((val, idx) => {
          const isWinning = winningLine?.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleClick(idx)}
              className={`rounded-xl border font-orbitron font-black text-3xl sm:text-4xl flex items-center justify-center transition-all ${
                isWinning
                  ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.8)] animate-pulse'
                  : 'bg-slate-950/80 border-slate-800/80 hover:border-cyan-500/50'
              } ${val === 'X' ? 'text-cyan-400 glow-text-cyan' : 'text-purple-400 glow-text-purple'}`}
            >
              {val}
            </button>
          );
        })}

        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-4 text-center">
            <h3
              className={`text-2xl font-orbitron font-black mb-1 ${
                winner === 'Player Wins'
                  ? 'text-cyan-400'
                  : winner === 'AI Wins'
                  ? 'text-purple-400'
                  : 'text-amber-400'
              }`}
            >
              {winner.toUpperCase()}
            </h3>
            <p className="text-xs font-rajdhani text-slate-300 mb-3">
              {winner === 'Player Wins'
                ? 'Flawless calculation! You defeated the AI.'
                : winner === 'AI Wins'
                ? 'Minimax calculation predicted your sequence.'
                : 'Stalemate reached on grid.'}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2 rounded-full bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase"
            >
              Rematch
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 text-xs font-rajdhani text-slate-400 flex items-center gap-2">
        <span>Player (X: Cyan)</span> • <span>AI (O: Purple)</span>
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
