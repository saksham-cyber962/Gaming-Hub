import React, { useEffect, useState } from 'react';
import { Zap, X, Loader2, Sparkles } from 'lucide-react';
import { Game } from '../types';

interface FastTipsModalProps {
  game: Game;
  onClose: () => void;
}

export const FastTipsModal: React.FC<FastTipsModalProps> = ({ game, onClose }) => {
  const [tips, setTips] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchTips = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/gemini/fast-tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameTitle: game.title,
            category: game.category_slug,
          }),
        });
        const data = await res.json();
        if (isMounted) {
          if (data.error) setTips(`Could not load tips: ${data.error}`);
          else setTips(data.tips || 'Focus on pacing and rhythm to boost score!');
        }
      } catch (err: any) {
        if (isMounted) setTips('⚡ Tip: Master lane shifting timing early to avoid sudden obstacle clusters.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTips();
    return () => {
      isMounted = false;
    };
  }, [game]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Zap className="w-5 h-5 fill-cyan-400 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-orbitron font-bold text-white tracking-wide">
                INSTANT PRO TIPS
              </h3>
              <p className="text-[11px] font-rajdhani text-slate-400">
                Powered by Gemini 3.1 Flash Lite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4">
          <div className="text-xs font-orbitron text-cyan-400 font-bold mb-2">
            {game.title}
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-xs font-orbitron text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              Fetching fast competitive tactics...
            </div>
          ) : (
            <div className="text-sm font-rajdhani text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              {tips}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-cyan-300 transition-colors"
        >
          Got It, Resume Playing
        </button>
      </div>
    </div>
  );
};
            
