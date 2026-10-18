import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Maximize,
  Minimize,
  Play,
  RotateCw,
  Share2,
  Heart,
  Volume2,
  VolumeX,
  Sparkles,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { Game } from '../types';
import { CyberRacer3D } from './games/CyberRacer3D';
import { NeonRunner } from './games/NeonRunner';
import { NeonSnake } from './games/NeonSnake';
import { Neon2048 } from './games/Neon2048';
import { CyberBreakout } from './games/CyberBreakout';
import { RetroMinesweeper } from './games/RetroMinesweeper';
import { NeonTicTacToe } from './games/NeonTicTacToe';

interface GamePlayerProps {
  game: Game;
  onClose?: () => void;
  onOpenAiTips?: (game: Game) => void;
  onRecordScore?: (score: number) => void;
}

export const GamePlayer: React.FC<GamePlayerProps> = ({
  game,
  onClose,
  onOpenAiTips,
  onRecordScore,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [playing, setPlaying] = useState(Boolean(game.is_self_hosted || game.raw_html));
  const [fullscreen, setFullscreen] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Synchronize favorites from localStorage
  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('gh_favorites') || '[]');
      setIsFavorited(favs.includes(game.slug));
    } catch {}
  }, [game.slug]);

  const toggleFavorite = () => {
    try {
      const favs = JSON.parse(localStorage.getItem('gh_favorites') || '[]');
      let updated: string[];
      if (favs.includes(game.slug)) {
        updated = favs.filter((s: string) => s !== game.slug);
        setIsFavorited(false);
      } else {
        updated = [...favs, game.slug];
        setIsFavorited(true);
      }
      localStorage.setItem('gh_favorites', JSON.stringify(updated));
    } catch {}
  };

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Update Recently Played and session state
  useEffect(() => {
    if (playing) {
      try {
        const raw = localStorage.getItem('gh_recently_played');
        const list: string[] = raw ? JSON.parse(raw) : [];
        const next = [game.slug, ...list.filter((s) => s !== game.slug)].slice(0, 16);
        localStorage.setItem('gh_recently_played', JSON.stringify(next));

        const saveState = JSON.parse(localStorage.getItem('gh_continue_state') || '{}');
        saveState[game.slug] = { timestamp: Date.now(), title: game.title, thumbnail: game.thumbnail };
        localStorage.setItem('gh_continue_state', JSON.stringify(saveState));
      } catch {}
    }
  }, [playing, game]);

  // Cross-origin iframe load cannot prove gameplay works; offer manual recovery on timeout.
  useEffect(() => {
    if (!playing || game.is_self_hosted) {
      setLoadFailed(false);
      return;
    }
    setLoadFailed(false);
    const timer = setTimeout(() => {
      // In cross-origin scenarios, check if iframe rendered or timed out
      if (!iframeRef.current) setLoadFailed(true);
    }, 9000);

    return () => clearTimeout(timer);
  }, [playing, reloadKey, game.is_self_hosted]);

  const handleIframeLoad = useCallback(() => {
    // A load event does not verify that a cross-origin game is playable.
    setLoadFailed(false);
  }, []);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request denied or not supported', e);
    }
  };

  const handleReload = () => {
    setLoadFailed(false);
    setReloadKey((k) => k + 1);
  };

  const startPlaying = () => {
    setPlaying(true);
    setLoadFailed(false);
    setReloadKey((k) => k + 1);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  // Touch Swipe Synthesizer for Endless Runners and Action Games
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !iframeRef.current?.contentWindow) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    let key = '';
    if (Math.max(absX, absY) > 30) {
      if (absX > absY) {
        key = dx > 0 ? 'ArrowRight' : 'ArrowLeft';
      } else {
        key = dy > 0 ? 'ArrowDown' : 'ArrowUp';
      }
    }

    if (key) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'KEYDOWN', key }, new URL(game.embed_url, window.location.href).origin);
      } catch {}
    }
    touchStartRef.current = null;
  };

  // Render Internal Self-Hosted Games Directly
  const renderInternalGame = () => {
    switch (game.internal_game_id) {
      case 'cyber-racer-3d':
        return <CyberRacer3D onExit={onClose} onRecordScore={onRecordScore} />;
      case 'neon-runner':
        return <NeonRunner onExit={onClose} onRecordScore={onRecordScore} />;
      case 'neon-snake':
        return <NeonSnake onExit={onClose} onRecordScore={onRecordScore} />;
      case 'neon-2048':
        return <Neon2048 onExit={onClose} onRecordScore={onRecordScore} />;
      case 'cyber-breakout':
        return <CyberBreakout onExit={onClose} onRecordScore={onRecordScore} />;
      case 'neon-minesweeper':
        return <RetroMinesweeper onExit={onClose} onRecordScore={onRecordScore} />;
      case 'neon-tictactoe':
        return <NeonTicTacToe onExit={onClose} onRecordScore={onRecordScore} />;
      default:
        return <CyberRacer3D onExit={onClose} onRecordScore={onRecordScore} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950 shadow-2xl transition-all ${
        fullscreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none border-0' : ''
      }`}
    >
      {/* Game Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Close game player"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-orbitron font-black text-white tracking-wide truncate max-w-[200px] sm:max-w-md">
                {game.title}
              </h2>
              <span className="text-[10px] font-orbitron uppercase bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">
                {game.category_slug}
              </span>
            </div>
            {game.controls && (
              <p className="text-[11px] font-rajdhani text-slate-400 truncate max-w-sm sm:max-w-xl">
                🎮 {game.controls}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAiTips && (
            <button
              onClick={() => onOpenAiTips(game)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300 font-orbitron text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-500/30 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">AI Pro Coach</span>
            </button>
          )}

          <button
            onClick={toggleFavorite}
            className={`p-2 rounded-xl border transition-colors ${
              isFavorited
                ? 'border-pink-500/60 bg-pink-500/20 text-pink-400'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title={isFavorited ? 'Remove Favorite' : 'Save to Favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-pink-500' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-colors"
            title="Share Game"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {!game.is_self_hosted && (
            <button
              onClick={handleReload}
              disabled={!playing}
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-40"
              title="Reload frame"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all font-orbitron text-xs font-bold flex items-center gap-1"
            title="Fullscreen"
          >
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {copiedShare && (
        <div className="absolute top-16 right-6 z-30 bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs px-3 py-1.5 rounded-lg shadow-lg animate-fade-in">
          Link copied to clipboard!
        </div>
      )}

      {/* Main Game Viewport */}
      {game.is_self_hosted ? (
        <div className="w-full">{renderInternalGame()}</div>
      ) : (
        <div
          className="relative aspect-video sm:aspect-[16/10] lg:aspect-video w-full select-none overflow-hidden bg-black"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {playing ? (
            loadFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-950/40 via-slate-950 to-slate-950 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mb-4 shadow-lg">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="font-orbitron text-lg font-bold uppercase tracking-wider text-red-400">
                  Game Stream Unavailable
                </h3>
                <p className="mt-2 max-w-md font-rajdhani text-sm text-slate-300">
                  The external provider blocked cross-origin embedding or timed out under current network policy.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={handleReload}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 px-5 py-2.5 font-orbitron text-xs font-bold uppercase text-slate-950 shadow-lg hover:scale-105 transition-all"
                  >
                    <RotateCw className="w-4 h-4" /> Try Again
                  </button>
                  <a
                    href={game.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 font-orbitron text-xs font-bold uppercase text-slate-300 hover:text-white"
                  >
                    <ExternalLink className="w-4 h-4" /> Open in New Tab
                  </a>
                  <button
                    onClick={() => setPlaying(false)}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-2.5 font-orbitron text-xs font-bold uppercase text-slate-400 hover:text-white"
                  >
                    Exit Game
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                key={reloadKey}
                ref={iframeRef}
                src={game.raw_html ? undefined : game.embed_url}
                srcDoc={game.raw_html ? game.raw_html : undefined}
                title={`${game.title} — Play Free on GAMING HUB`}
                allow="autoplay; fullscreen; gamepad; gyroscope; accelerometer; pointer-lock"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
                referrerPolicy="no-referrer"
                onLoad={handleIframeLoad}
                sandbox={game.raw_html ? "allow-scripts allow-pointer-lock" : "allow-scripts allow-same-origin allow-pointer-lock allow-orientation-lock allow-presentation"}
              />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-cyan-950/20 via-slate-950 to-purple-950/30 p-6 text-center">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-sm"
                style={{ backgroundImage: `url(${game.thumbnail})` }}
              />
              <div className="relative z-10 max-w-md">
                <button
                  onClick={startPlaying}
                  className="group relative inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 px-8 py-4 font-orbitron text-sm font-black uppercase tracking-wider text-slate-950 shadow-[0_0_35px_rgba(0,240,255,0.6)] hover:scale-105 active:scale-95 transition-all"
                >
                  <Play className="h-5 w-5 fill-slate-950" />
                  Launch Game Stream
                </button>
                <p className="mt-4 font-rajdhani text-xs uppercase tracking-widest text-slate-400">
                  🛡️ Verified Safe Partner Stream • No Install Required
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Info Strip */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 bg-slate-900/60 px-4 py-2 text-xs font-rajdhani text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {playing ? 'Session Active' : 'Ready'}
          </span>
          
          
        </div>
        <div className="text-[11px] text-slate-500">{game.license || 'GAMING HUB Verified'}</div>
      </div>
    </div>
  );
};
