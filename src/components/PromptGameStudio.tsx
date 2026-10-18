import React, { useState } from 'react';
import { Sparkles, Play, Loader2, Wand2, Compass, Flame, Gamepad2, History, Trash2 } from 'lucide-react';
import { Game } from '../types';

interface PromptGameStudioProps {
  onGameCreated: (game: Game) => void;
}

const PRESET_PROMPTS = [
  {
    title: 'Neon Meteor Dodge',
    prompt: 'A fast-paced neon asteroid dodging game. Player ship moves with arrow keys/mouse/touch. Collect green energy crystals, dodge red fireballs. 60fps with explosion sound effects.',
    genre: 'action',
  },
  {
    title: 'Gaming Hub Esports Arena',
    prompt: 'Mobile-first Web3/HTML5 esports arcade game. Player controls a neon cyan ship with touch/WASD, shoots laser bolts at incoming enemy drones, collects multiplier orbs, 60fps loop with sound effects.',
    genre: 'action',
  },
  {
    title: 'Laser Defender 2D',
    prompt: 'Space defense shooter. Waves of alien invaders dive from top of screen. Player moves horizontally and shoots laser bolts with Space or screen tap. Particle sparks on hits.',
    genre: 'action',
  },
  {
    title: 'Cyber Gravity Jumper',
    prompt: 'Endless vertical platform jumper. Character automatically bounces on glowing platforms. Tilt or tap left/right to aim landings. Avoid crumbling traps.',
    genre: 'endless-runner',
  },
  {
    title: 'Retro Pong Overdrive',
    prompt: 'High speed cyberpunk Pong against clever AI. Ball speeds up every paddle bounce. Curved deflection physics and neon trailing effects.',
    genre: 'arcade',
  },
  {
    title: 'Highway Cyber Racer (Hindi)',
    prompt: 'Ek mast fast highway cyber racer game jisme traffic cars ko overtake karna hai, coins collect karne hain, engine sound aur touch controls ke saath.',
    genre: 'racing',
  },
  {
    title: 'Space Shooter (Hindi)',
    prompt: 'Ek mast space shooter game jisme player ki ship lasers fire kare aur dushman ships ko destroy kare, score aur sound effects ke saath.',
    genre: 'action',
  },
];

export const PromptGameStudio: React.FC<PromptGameStudioProps> = ({ onGameCreated }) => {
  const [promptText, setPromptText] = useState('');
  const [genre, setGenre] = useState('action');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Game[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gh_prompt_games') || '[]');
    } catch {
      return [];
    }
  });

  const handleGenerate = async (textToUse?: string, genreToUse?: string) => {
    const finalPrompt = textToUse || promptText;
    const finalGenre = genreToUse || genre;
    if (!finalPrompt.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/gemini/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          genre: finalGenre,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.warn('Failed to parse response JSON:', jsonErr);
      }

      if (data.error && !data.html) {
        throw new Error(data.error);
      }
      if (!data.html) {
        throw new Error('Model did not return game code. Please try a simpler prompt.');
      }

      const newGame: Game = {
        id: `prompt-game-${Date.now()}`,
        title: data.title || (finalPrompt.length > 25 ? finalPrompt.slice(0, 25) + '...' : finalPrompt),
        slug: `prompt-game-${Date.now()}`,
        category_slug: (finalGenre as any) || 'arcade',
        embed_url: 'about:blank',
        thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
        description: `Generated from prompt: "${finalPrompt}"`,
        tags: ['ai-generated', 'prompt-game', finalGenre],
        plays: 1,
        is_self_hosted: false,
        raw_html: data.html,
        prompt: finalPrompt,
        rating: 5.0,
        created_at: new Date().toISOString(),
        controls: data.instructions || 'Keyboard / Touch controls supported',
        license: 'Custom Prompt Generated with Gemini 3.8',
      };

      // Save to history
      const updatedHistory = [newGame, ...history.slice(0, 9)];
      setHistory(updatedHistory);
      try {
        localStorage.setItem('gh_prompt_games', JSON.stringify(updatedHistory));
      } catch {}

      onGameCreated(newGame);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Game generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('gh_prompt_games');
    } catch {}
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-br from-[#0c0e22] via-[#090b1c] to-[#120826] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,240,255,0.15)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 px-3 py-1 rounded-full text-cyan-300 font-orbitron text-xs font-bold uppercase tracking-wider mb-2">
            <Wand2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            AI Prompt to Playable Game Engine
          </div>
          <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-white uppercase tracking-tight">
            Prompt Studio • <span className="text-cyan-400">Apna Game Prompt Daalo</span>
          </h2>
          <p className="font-rajdhani text-slate-300 text-sm mt-1 max-w-2xl">
            Type any prompt in English, Hindi, or Hinglish. Gemini will generate a complete, working HTML5 Canvas game with 60fps loop, synthesized sound, and touch controls on the fly!
          </p>
        </div>
      </div>

      {/* Prompt Input Box */}
      <div className="space-y-4">
        <div className="relative">
          <textarea
            rows={3}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Type your game prompt here... e.g. 'Ek retro space dodging game banao jisme glowing meteors ho aur shield pickups ho' or 'Neon cyber runner with double jump'..."
            className="w-full bg-[#05060f] border border-cyan-500/40 rounded-2xl p-4 text-sm font-rajdhani text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
          />
        </div>

        {error && (
          <div className="text-xs font-rajdhani text-red-400 bg-red-950/40 border border-red-500/40 px-4 py-2 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-orbitron text-slate-400">Genre:</span>
            {(['action', 'racing', 'endless-runner', 'arcade', 'puzzle'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-orbitron font-bold uppercase border transition-all ${
                  genre === g
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={loading || !promptText.trim()}
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-slate-950 font-orbitron font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:scale-105 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                Generating Playable Code...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-slate-950" />
                Generate & Play Game
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset Prompt Suggestions */}
      <div>
        <div className="text-xs font-orbitron text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Quick Preset Prompts (Click to Try)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {PRESET_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPromptText(p.prompt);
                setGenre(p.genre);
                handleGenerate(p.prompt, p.genre);
              }}
              disabled={loading}
              className="text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3 transition-all group"
            >
              <div className="text-xs font-orbitron font-bold text-cyan-300 group-hover:text-cyan-400 flex items-center justify-between">
                <span>{p.title}</span>
                <span className="text-[9px] uppercase text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  {p.genre}
                </span>
              </div>
              <p className="text-[11px] font-rajdhani text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {p.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Prompt Games History */}
      {history.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-orbitron text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> My Generated Prompt Games ({history.length})
            </div>
            <button
              onClick={clearHistory}
              className="text-[11px] font-rajdhani text-slate-500 hover:text-red-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear History
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {history.map((game) => (
              <div
                key={game.id}
                onClick={() => onGameCreated(game)}
                className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3 cursor-pointer flex items-center justify-between group transition-all"
              >
                <div>
                  <div className="font-orbitron font-bold text-xs text-white group-hover:text-cyan-400 truncate max-w-[200px]">
                    {game.title}
                  </div>
                  <div className="text-[10px] font-rajdhani text-slate-400 truncate max-w-[200px]">
                    {game.prompt}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
