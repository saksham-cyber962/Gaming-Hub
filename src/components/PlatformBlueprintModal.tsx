import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Shield, Server, Gamepad2, Sparkles } from 'lucide-react';

interface PlatformBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlatformBlueprintModal: React.FC<PlatformBlueprintModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const rawPromptText = `## Executive Summary & Engineering Architecture
GAMING HUB (https://gaming-hub-platform-wp1i.bolt.host) has been transformed into a production-ready, mobile-first Web3/HTML5 esports and casual gaming platform designed to perform on affordable Android devices (MediaTek Helio G85–G99, Snapdragon 680–695/4 Gen 2, 4GB–6GB RAM) running on 4G/5G mobile networks.

### Diagnostic Findings & Systemic Repairs:
1. Build Configuration: Fixed missing remotePatterns, enabled Brotli/Gzip compression, CSP frame-ancestors.
2. Supabase Client: Fault-tolerant static fallback with embedded 150+ verified games catalog.
3. Catalog & Iframes: Purged 100% dead/blocked URLs; verified partner embeds + 6 built-in self-hosted games.
4. Game Player Engine: Active touch wrapper with Swipe gesture dispatch, scroll-locking, 9s watchdog timer, and auto-fallback recovery.
5. User Retention: Client-side localStorage state synchronizers (gh_favorites, gh_recently_played, gh_continue_state) and 5-tier Achievement Engine.
6. Technical SEO: Dynamic robots.ts, sitemap.ts, schema.org JSON-LD, and canonical meta tags.
7. Monetization: Strict CLS-safe aspect ratio ad slots and FTC/ASCI compliance.

### 150+ Verified Playable Games Distribution:
- Action: 25 Games
- Racing: 20 Games (including 3D Cyber Racer Three.js)
- Endless Runner: 15 Games (Subway Surfers & Temple Run styles)
- Puzzle: 15 Games (2048 Neon, Minesweeper, Sudoku, etc.)
- Arcade: 25 Games (Neon Snake, Breakout, Pong, Asteroids, etc.)
- Adventure: 20 Games (Duck Life, Snail Bob, Skyblock, etc.)
- Sports: 10 Games (Basket Random, Football Masters, Table Tennis, etc.)
- Strategy: 10 Games (Tank Trouble, Battleship, Checkers, Gomoku, etc.)
- Casual: 10 Games (Cookie Clicker, Tic-Tac-Toe Minimax AI, Darts, etc.)`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawPromptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[85vh] max-h-[750px] bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,240,255,0.25)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FileCode className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-orbitron font-black text-white tracking-wider">
                GAMING HUB BLUEPRINT & PROMPT SPECS
              </h2>
              <p className="text-xs font-rajdhani text-cyan-400">
                Aapka Engineering Prompt & System Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 text-xs font-orbitron flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Prompt'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm font-rajdhani text-slate-300 leading-relaxed">
          {/* Hindi Welcome Banner */}
          <div className="bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-transparent border border-cyan-500/30 rounded-2xl p-4">
            <h3 className="font-orbitron font-bold text-sm text-cyan-300 flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Aapka Diya Hua Prompt Successfully Apply Ho Gaya Hai!
            </h3>
            <p className="text-xs text-slate-300">
              Aapne jo executive summary aur engineering specifications di thin, wo puri tarah Gaming Hub platform ke andar implement kar di gayi hain: 150+ verified games, 3D Three.js Cyber Racer, 6 self-hosted games, touch swipe gestures, watchdog auto-recovery, aur full-stack Gemini AI suite!
            </p>
          </div>

          {/* Diagnostic Findings & Systemic Repairs Table */}
          <div>
            <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> 1. Diagnostic Findings & Systemic Repairs
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80">
              <div className="grid grid-cols-3 bg-slate-900/90 p-3 text-xs font-orbitron font-bold text-cyan-400 border-b border-slate-800">
                <div>Subsystem</div>
                <div>Discovered Flaw</div>
                <div>Architectural Repair Applied</div>
              </div>
              <div className="divide-y divide-slate-800/60 text-xs">
                <div className="grid grid-cols-3 p-3">
                  <div className="font-bold text-white">Build Config</div>
                  <div className="text-slate-400">next.config.js missing, image domain crashes</div>
                  <div className="text-emerald-400">remotePatterns, Brotli/Gzip, CSP frame-ancestors</div>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <div className="font-bold text-white">Database / Supabase</div>
                  <div className="text-slate-400">Crashed during static build if env was missing</div>
                  <div className="text-emerald-400">Fault-tolerant mock client + 150 static games catalog</div>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <div className="font-bold text-white">Catalog & Iframes</div>
                  <div className="text-slate-400">60% URLs dead or blocked SAMEORIGIN</div>
                  <div className="text-emerald-400">Purged dead URLs, verified 150+ embeddable partners</div>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <div className="font-bold text-white">Game Player Engine</div>
                  <div className="text-slate-400">Lacked swipe gestures, scroll hijacking</div>
                  <div className="text-emerald-400">Active touch wrapper, 9s watchdog timer, auto-fallback</div>
                </div>
                <div className="grid grid-cols-3 p-3">
                  <div className="font-bold text-white">User Retention</div>
                  <div className="text-slate-400">No session saves or favorites</div>
                  <div className="text-emerald-400">gh_favorites, gh_recently_played, 5 Achievement badges</div>
                </div>
              </div>
            </div>
          </div>

          {/* Catalog Distribution */}
          <div>
            <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" /> 2. 150+ Verified Playable Games (9 Categories)
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 text-xs font-orbitron text-center">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-orange-400 font-bold text-base">25</div>
                <div className="text-slate-400 text-[10px]">Action</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-cyan-400 font-bold text-base">20</div>
                <div className="text-slate-400 text-[10px]">Racing</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-emerald-400 font-bold text-base">15</div>
                <div className="text-slate-400 text-[10px]">Runners</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-purple-400 font-bold text-base">15</div>
                <div className="text-slate-400 text-[10px]">Puzzle</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-pink-400 font-bold text-base">25</div>
                <div className="text-slate-400 text-[10px]">Arcade</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-amber-400 font-bold text-base">20</div>
                <div className="text-slate-400 text-[10px]">Adventure</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-yellow-400 font-bold text-base">10</div>
                <div className="text-slate-400 text-[10px]">Sports</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-indigo-400 font-bold text-base">10</div>
                <div className="text-slate-400 text-[10px]">Strategy</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
                <div className="text-cyan-400 font-bold text-base">10</div>
                <div className="text-slate-400 text-[10px]">Casual</div>
              </div>
              <div className="bg-cyan-500/15 border border-cyan-500/40 rounded-xl p-2.5">
                <div className="text-white font-black text-base">150+</div>
                <div className="text-cyan-300 text-[10px]">Total Games</div>
              </div>
            </div>
          </div>

          {/* Raw Prompt Code Block */}
          <div>
            <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-pink-400 mb-2 flex items-center gap-2">
              <Server className="w-4 h-4" /> 3. Raw Engineering Prompt Blueprint
            </h4>
            <pre className="bg-black/80 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-48 whitespace-pre">
              {rawPromptText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
