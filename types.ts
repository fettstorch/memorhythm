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
