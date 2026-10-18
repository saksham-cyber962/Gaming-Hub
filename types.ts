export interface Game {
  id: string;
  title: string;
  slug: string;
  category_slug: 'action' | 'racing' | 'endless-runner' | 'puzzle' | 'arcade' | 'adventure' | 'sports' | 'strategy' | 'casual';
  embed_url: string;
  thumbnail: string;
  description: string;
  tags: string[];
  plays: number;
  is_trending?: boolean;
  is_new?: boolean;
  is_recommended?: boolean;
  is_featured?: boolean;
  is_downloadable?: boolean;
  is_self_hosted?: boolean;
  internal_game_id?: string;
  rating: number;
  created_at: string;
  updated_at?: string;
  controls?: string;
  license?: string;
  raw_html?: string;
  prompt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: 'action' | 'racing' | 'endless-runner' | 'puzzle' | 'arcade' | 'adventure' | 'sports' | 'strategy' | 'casual';
  icon: string;
  count: number;
  description: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface ContinueSession {
  slug: string;
  title: string;
  timestamp: number;
  thumbnail?: string;
}
