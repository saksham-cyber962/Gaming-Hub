import React, { useEffect, useState } from 'react';
import { Trophy, Award, Zap, Compass, Sparkles, X } from 'lucide-react';
import { Achievement } from '../types';

export const ACHIEVEMENTS_LIST: Achievement[] = [
  {
    id: 'first_launch',
    title: 'Player One',
    description: 'Launched your first game on GAMING HUB.',
    icon: 'Zap',
  },
  {
    id: 'high_roller',
    title: 'High Roller',
    description: 'Played 5 or more games across the platform.',
    icon: 'Trophy',
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Piloted the 3D Cyber Racer hovercraft in the arena.',
    icon: 'Award',
  },
  {
    id: 'master_mind',
    title: 'Master Strategist',
    description: 'Tested deduction skills in a puzzle or strategy title.',
    icon: 'Compass',
  },
  {
    id: 'ai_sync',
    title: 'AI Synchronized',
    description: 'Consulted the Apex AI Coach or engaged Live Voice.',
    icon: 'Sparkles',
  },
];

interface AchievementToastProps {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onDismiss }) => {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 border border-cyan-400 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,240,255,0.4)] animate-slide-up max-w-sm">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 p-0.5 flex-shrink-0">
        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-400">
          <Trophy className="w-6 h-6 animate-bounce" />
        </div>
      </div>

      <div className="flex-1">
        <div className="text-[10px] font-orbitron uppercase text-cyan-400 font-bold tracking-widest">
          Achievement Unlocked!
        </div>
        <div className="text-sm font-orbitron font-black text-white">{achievement.title}</div>
        <div className="text-xs font-rajdhani text-slate-300">{achievement.description}</div>
      </div>

      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
