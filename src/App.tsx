import React, { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2,
  Search,
  Sparkles,
  Heart,
  Flame,
  Clock,
  Car,
  Footprints,
  Boxes,
  Compass,
  Trophy,
  ShieldAlert,
  Play,
  Zap,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Radio,
  X,
  Volume2,
  FileCode,
  Wand2,
  Smartphone,
} from 'lucide-react';
import { Game, Category, Achievement, ContinueSession } from './types';
import { VERIFIED_GAMES, CATEGORIES } from './data/gamesCatalog';
import { GamePlayer } from './components/GamePlayer';
import { AIAssistantModal } from './components/AIAssistantModal';
import { FastTipsModal } from './components/FastTipsModal';
import { AchievementToast, ACHIEVEMENTS_LIST } from './components/AchievementToast';
import { PromptGameStudio } from './components/PromptGameStudio';
import { PlatformBlueprintModal } from './components/PlatformBlueprintModal';
import { InstallGuideModal } from './components/InstallGuideModal';

export default function App() {
  const [games, setGames] = useState<Game[]>(VERIFIED_GAMES.filter((game) => game.is_self_hosted));
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'instant' | 'trending' | 'favorites'>('all');

  // Modals
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [fastTipsGame, setFastTipsGame] = useState<Game | null>(null);
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handlePromptGameCreated = (newGame: Game) => {
    setGames((prev) => [newGame, ...prev]);
    setSelectedGame(newGame);
    unlockAchievement('first_launch');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // User State & Persistence
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gh_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gh_recently_played') || '[]');
    } catch {
      return [];
    }
  });

  const [continueStates, setContinueStates] = useState<Record<string, ContinueSession>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gh_continue_state') || '{}');
    } catch {
      return {};
    }
  });

  // Achievements
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gh_achievements') || '[]');
    } catch {
      return [];
    }
  });
  const [currentToast, setCurrentToast] = useState<Achievement | null>(null);

  const unlockAchievement = (id: string) => {
    if (unlockedAchievements.includes(id)) return;
    const target = ACHIEVEMENTS_LIST.find((a) => a.id === id);
    if (target) {
      const next = [...unlockedAchievements, id];
      setUnlockedAchievements(next);
      try {
        localStorage.setItem('gh_achievements', JSON.stringify(next));
      } catch {}
      setCurrentToast(target);
    }
  };

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);
    unlockAchievement('first_launch');

    // Check count for high roller
    const playedCount = recentlyPlayed.length + 1;
    if (playedCount >= 5) {
      unlockAchievement('high_roller');
    }

    if (game.internal_game_id === 'cyber-racer-3d') {
      unlockAchievement('speed_demon');
    }

    if (game.category_slug === 'puzzle' || game.category_slug === 'strategy') {
      unlockAchievement('master_mind');
    }

    // Scroll smoothly to player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavorite = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let next: string[];
    if (favorites.includes(slug)) {
      next = favorites.filter((s) => s !== slug);
    } else {
      next = [...favorites, slug];
    }
    setFavorites(next);
    try {
      localStorage.setItem('gh_favorites', JSON.stringify(next));
    } catch {}
  };

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // Category filter
      if (selectedCategory !== 'all' && game.category_slug !== selectedCategory) {
        return false;
      }
      // Filter type
      if (filterType === 'instant' && !game.is_self_hosted) return false;
      if (filterType === 'trending' && !game.is_trending) return false;
      if (filterType === 'favorites' && !favorites.includes(game.slug)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = game.title.toLowerCase().includes(q);
        const matchesTags = game.tags.some((t) => t.toLowerCase().includes(q));
        const matchesDesc = game.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTags && !matchesDesc) return false;
      }

      return true;
    });
  }, [games, selectedCategory, filterType, favorites, searchQuery]);

  // Featured Hero Game
  const heroGame = useMemo(() => {
    return games.find((g) => g.internal_game_id === 'cyber-racer-3d') || games[0];
  }, [games]);

  // Get recently played game objects
  const recentGamesList = useMemo(() => {
    return recentlyPlayed
      .map((slug) => games.find((g) => g.slug === slug))
      .filter((g): g is Game => Boolean(g))
      .slice(0, 6);
  }, [recentlyPlayed, games]);

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'action':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'racing':
        return <Car className="w-4 h-4 text-cyan-400" />;
      case 'endless-runner':
        return <Footprints className="w-4 h-4 text-emerald-400" />;
      case 'puzzle':
        return <Boxes className="w-4 h-4 text-purple-400" />;
      case 'arcade':
        return <Gamepad2 className="w-4 h-4 text-pink-400" />;
      case 'adventure':
        return <Compass className="w-4 h-4 text-amber-400" />;
      case 'sports':
        return <Trophy className="w-4 h-4 text-yellow-400" />;
      case 'strategy':
        return <ShieldAlert className="w-4 h-4 text-indigo-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#06070f] text-slate-100 cyber-grid flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* 1. Portal Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#080914]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo Lockup */}
          <div
            onClick={() => {
              setSelectedGame(null);
              setSelectedCategory('all');
              setFilterType('all');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)] group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#070712] rounded-[10px] flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-orbitron font-black text-lg tracking-wider bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  GAMING HUB
                </span>
                <span className="text-[9px] font-orbitron font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                  ESPORTS
                </span>
              </div>
              <p className="text-[10px] font-rajdhani text-slate-400 tracking-widest uppercase">
                Original games · playable catalog
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games, genres, tags..."
                className="w-full bg-[#0d0f1e] border border-slate-700/60 rounded-full pl-10 pr-4 py-2 text-xs font-rajdhani text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setInstallModalOpen(true)}
              className="px-3.5 py-2 rounded-full bg-cyan-950/90 border border-cyan-400/50 text-cyan-300 font-orbitron text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-500/20 transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)]"
              title="Search & Install Setup (Bina link open karein)"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Search & Install</span>
            </button>

            <button
              onClick={() => setBlueprintModalOpen(true)}
              className="px-3.5 py-2 rounded-full bg-slate-900/90 border border-purple-500/40 text-purple-300 font-orbitron text-xs font-bold flex items-center gap-1.5 hover:bg-purple-500/20 transition-all shadow-[0_0_15px_rgba(168,85,247,0.25)]"
              title="Platform Specs & Prompt Blueprint"
            >
              <FileCode className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Prompt Specs</span>
            </button>

            <button
              onClick={() => {
                setAiModalOpen(true);
                unlockAchievement('ai_sync');
              }}
              className="group relative px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-400/40 text-cyan-300 font-orbitron text-xs font-bold flex items-center gap-2 hover:bg-cyan-500/30 transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            >
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">AI Co-Pilot</span>
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            </button>

            <button
              onClick={() => setFilterType(filterType === 'favorites' ? 'all' : 'favorites')}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
                filterType === 'favorites'
                  ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                  : 'bg-[#0d0f1e] border-slate-700/60 text-slate-300 hover:text-white'
              }`}
              title="Saved Favorites"
            >
              <Heart className={`w-4 h-4 ${favorites.length > 0 ? 'fill-pink-500 text-pink-500' : ''}`} />
              <span className="text-xs font-orbitron font-bold tabular-nums">{favorites.length}</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="mt-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games, genres, tags..."
              className="w-full bg-[#0d0f1e] border border-slate-700/60 rounded-full pl-10 pr-4 py-2 text-xs font-rajdhani text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </header>

      {/* 2. Main Portal Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 space-y-8">
        {/* Active Game Player (When a game is selected) */}
        {selectedGame ? (
          <div className="space-y-4 animate-fade-in">
            <GamePlayer
              game={selectedGame}
              onClose={() => setSelectedGame(null)}
              onOpenAiTips={(g) => {
                setFastTipsGame(g);
                unlockAchievement('ai_sync');
              }}
              onRecordScore={(s) => console.log('Game recorded score:', s)}
            />
          </div>
        ) : (
          /* Hero Showcase (When no game is active) */
          <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-r from-[#0c0e24] via-[#101438] to-[#140b2e] p-6 sm:p-10 shadow-[0_0_50px_rgba(0,240,255,0.15)]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 bg-cyan-500/15 border border-cyan-500/30 px-3 py-1 rounded-full text-cyan-400 font-orbitron text-xs font-bold uppercase tracking-widest mb-4">
                <Zap className="w-3.5 h-3.5 fill-cyan-400" /> Featured 3D Arena Title
              </div>

              <h1 className="text-3xl sm:text-5xl font-orbitron font-black text-white uppercase tracking-tight leading-none mb-3">
                CYBER RACER 3D
                <span className="block text-2xl sm:text-3xl font-light text-cyan-400 mt-1">
                  HYPERDRIVE • 60 FPS
                </span>
              </h1>

              <p className="font-rajdhani text-slate-300 text-sm sm:text-base leading-relaxed mb-6 max-w-xl">
                Experience zero-latency anti-gravity racing built on WebGL & Three.js. Pilot aerodynamic hovercraft through neon circuits, blast thrusters, and dodge defensive security pylons.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => handleSelectGame(heroGame)}
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 text-slate-950 font-orbitron font-black text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5"
                >
                  <Play className="w-5 h-5 fill-slate-950 text-slate-950" /> Play Instant 3D
                </button>

                <button
                  onClick={() => {
                    setFastTipsGame(heroGame);
                    unlockAchievement('ai_sync');
                  }}
                  className="px-6 py-3.5 rounded-full bg-slate-900/80 border border-slate-700 text-cyan-300 font-orbitron font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" /> AI Tactics
                </button>
              </div>

              <div className="mt-8 flex items-center gap-6 text-xs font-rajdhani text-slate-400">
                <span>⚡ 60 FPS Simulation</span>
                <span>🛡️ Procedural PBR Studio Lighting</span>
                <span>🎮 Full Touch & Gamepad Support</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Recently Played / Continue Session Strip */}
        {recentGamesList.length > 0 && !selectedGame && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-orbitron font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> Continue Playing
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {recentGamesList.map((game) => (
                <div
                  key={game.slug}
                  onClick={() => handleSelectGame(game)}
                  className="group relative bg-[#0a0c1b] border border-slate-800 rounded-xl p-2 cursor-pointer hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all"
                >
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 relative mb-2">
                    <img
                      src={game.thumbnail}
                      alt={game.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-6 h-6 text-cyan-400 fill-cyan-400" />
                    </div>
                  </div>
                  <div className="font-orbitron font-bold text-xs text-white truncate">{game.title}</div>
                  <div className="text-[10px] font-rajdhani text-slate-400 uppercase">{game.category_slug}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Prompt to Game Studio */}
        <PromptGameStudio onGameCreated={handlePromptGameCreated} />

        {/* 4. Filter Pills & Category Navigation */}
        <div className="space-y-4">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-orbitron font-bold transition-all ${
                  filterType === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                    : 'bg-[#0d0f1e] border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Games ({games.length})
              </button>

              <button
                onClick={() => setFilterType('instant')}
                className={`px-4 py-1.5 rounded-full text-xs font-orbitron font-bold transition-all flex items-center gap-1.5 ${
                  filterType === 'instant'
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                    : 'bg-[#0d0f1e] border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Self-Hosted / Zero Lag
              </button>

              <button
                onClick={() => setFilterType('trending')}
                className={`px-4 py-1.5 rounded-full text-xs font-orbitron font-bold transition-all flex items-center gap-1.5 ${
                  filterType === 'trending'
                    ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-[#0d0f1e] border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> Trending
              </button>
            </div>

            <div className="text-xs font-rajdhani text-slate-400">
              Showing <span className="text-cyan-400 font-bold tabular-nums">{filteredGames.length}</span> titles
            </div>
          </div>

          {/* Category Scroller */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-orbitron font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-cyan-500/20 border border-cyan-500/60 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                  : 'bg-[#0a0c1b] border border-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-4 h-4" /> All Categories
            </button>

            {CATEGORIES.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2.5 rounded-xl text-xs font-orbitron font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  selectedCategory === cat.slug
                    ? 'bg-cyan-500/20 border border-cyan-500/60 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                    : 'bg-[#0a0c1b] border border-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {getCategoryIcon(cat.slug)} {cat.name} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* 5. Games Grid (Playable Games) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredGames.map((game) => {
            const isFav = favorites.includes(game.slug);
            return (
              <div
                key={game.id}
                onClick={() => handleSelectGame(game)}
                className="group relative bg-[#090b1a] border border-slate-800/90 rounded-2xl overflow-hidden hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(0,240,255,0.2)] transition-all cursor-pointer flex flex-col justify-between"
              >
                {/* Thumbnail Header */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                  <img
                    src={game.thumbnail}
                    alt={game.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    {game.is_self_hosted && (
                      <span className="text-[9px] font-orbitron uppercase bg-cyan-500 text-slate-950 font-black px-2 py-0.5 rounded shadow">
                        0-Lag
                      </span>
                    )}
                    {game.is_trending && (
                      <span className="text-[9px] font-orbitron uppercase bg-purple-600 text-white font-bold px-2 py-0.5 rounded shadow">
                        Hot
                      </span>
                    )}
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(game.slug, e)}
                    className={`absolute top-2.5 right-2.5 p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                      isFav
                        ? 'bg-pink-500/80 text-white'
                        : 'bg-black/40 text-slate-300 hover:text-white hover:bg-black/60'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-white' : ''}`} />
                  </button>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.8)] transform group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-orbitron uppercase text-cyan-400 tracking-wider">
                        {game.category_slug}
                      </span>
                      <span className="text-xs font-orbitron text-amber-400 font-bold">
                        Original game
                      </span>
                    </div>

                    <h3 className="font-orbitron font-bold text-sm text-white group-hover:text-cyan-400 transition-colors line-clamp-1 mb-1">
                      {game.title}
                    </h3>

                    <p className="font-rajdhani text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                      {game.description}
                    </p>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-rajdhani text-slate-400">
                    <span className="tabular-nums">Play in browser</span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFastTipsGame(game);
                        unlockAchievement('ai_sync');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-orbitron text-[10px] uppercase font-bold flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" /> Tips
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. CLS-Safe Aspect Ratio Sponsorship / Esports Slot (FTC/ASCI Compliant) */}
        <div className="min-h-[90px] w-full rounded-2xl bg-[#090b1a] border border-slate-800/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                Official Gaming Hub Esports Network
              </div>
              <p className="text-xs font-rajdhani text-slate-400">
                Original games • Third-party games pending verification
              </p>
            </div>
          </div>
          <div className="text-[10px] font-rajdhani text-slate-500 uppercase tracking-widest">
            Sponsored Partner Slot
          </div>
        </div>
      </main>

      {/* 7. Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070814] px-4 sm:px-8 py-8 mt-12 text-xs font-rajdhani text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="font-orbitron font-black text-cyan-400 tracking-wider">GAMING HUB</span>
            <span>• Mobile-First Esports & HTML5 Gaming Platform</span>
            <span className="hidden sm:inline">•</span>
            <button
              onClick={() => setBlueprintModalOpen(true)}
              className="text-purple-400 hover:text-purple-300 underline font-orbitron font-bold text-[11px]"
            >
              📋 View Prompt Architecture & Specs
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-500">
            <span>Action (25)</span>
            <span>Racing (20)</span>
            <span>Runners (15)</span>
            <span>Puzzle (15)</span>
            <span>Arcade (25)</span>
            <span>Adventure (20)</span>
            <span>Sports (10)</span>
            <span>Strategy (10)</span>
            <span>Casual (10)</span>
          </div>
        </div>
      </footer>

      {/* Gemini AI Suite Modal */}
      <AIAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        activeGame={selectedGame}
      />

      {/* Fast Tips Modal (gemini-3.1-flash-lite) */}
      {fastTipsGame && (
        <FastTipsModal
          game={fastTipsGame}
          onClose={() => setFastTipsGame(null)}
        />
      )}

      {/* Milestone Achievement Toast */}
      <AchievementToast
        achievement={currentToast}
        onDismiss={() => setCurrentToast(null)}
      />

      {/* Engineering Architecture & Prompt Specs Modal */}
      <PlatformBlueprintModal
        isOpen={blueprintModalOpen}
        onClose={() => setBlueprintModalOpen(false)}
      />

      {/* Direct Search & PWA Install Guide Modal */}
      <InstallGuideModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
      />
    </div>
  );
}
