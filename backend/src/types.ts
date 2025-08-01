export enum GameState {
  Idle = 'IDLE',
  Playback = 'PLAYBACK',
  PlayerTurn = 'PLAYER_TURN',
  Calculating = 'CALCULATING',
  Scoring = 'SCORING',
}

export interface CircleDefinition {
  id: number;
  x: number;
  y: number;
  color: string;
  frequency: number;
  time: number; // Time offset from the start of the sequence in ms
}

export interface PlayerClick {
  x: number;
  y: number;
  time: number; // Timestamp of the click
}

export interface Score {
  position: number; // 0-100
  rhythm: number; // 0-100
  total: number; // 0-100
}

export interface Animation {
  id: number;
  startTime: number;
  duration: number;
  x: number;
  y: number;
  color: string;
  isInitial: boolean; // Differentiates playback animation from player click animation
}

// Leaderboard types
export type ScoreCategory = 'position' | 'rhythm' | 'total' | 'round';

export interface LeaderboardEntry {
  user: string;
  score: number;
  round: number;
  rank?: number;
}

export interface LeaderboardResponse {
  category: ScoreCategory;
  entries: LeaderboardEntry[];
}

export interface ScoreSubmission {
  user: string;
  position: number;
  rhythm: number;
  total: number;
  round: number;
}
