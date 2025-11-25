// Global player identity + lifetime stats (persistent across tournaments)
export interface GlobalPlayer {
  id: string;
  nickname: string;
  photoUrl: string | null;
  createdAt: number;
  // Lifetime stats (aggregated across all tournaments)
  lifetimeWins: number;
  lifetimeLosses: number;
  lifetimeGoalsScored: number;
  lifetimeGoalsConceded: number;
  lifetimeGamesPlayed: number;
  lifetimePoints: number;
  lifetimeUnicorns: number;
}

// Tournament-specific player stats (linked by globalPlayerId)
export interface TournamentPlayer {
  globalPlayerId: string;
  wins: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  gamesPlayed: number;
  attackPlayed: number;
  defensePlayed: number;
  points: number;
  unicorns: number;
  isAvailable: boolean;
}

// Combined view for components (GlobalPlayer info + TournamentPlayer stats)
export interface PlayerView {
  id: string;              // globalPlayerId
  nickname: string;
  photoUrl: string | null;
  wins: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  gamesPlayed: number;
  attackPlayed: number;
  defensePlayed: number;
  points: number;
  unicorns: number;
  isAvailable: boolean;
}

export interface Team {
  attackerId: string;      // globalPlayerId
  defenderId: string;      // globalPlayerId
  score: number;
}

export interface Match {
  id: string;
  team1: Team;
  team2: Team;
  status: 'scheduled' | 'active' | 'completed';
  timestamp: number;
  winner?: 'team1' | 'team2';
}

// Tournament summary for lobby list
export interface TournamentSummary {
  id: string;
  name: string;
  playerCount: number;
  lastUpdatedAt: number;
}

// Full tournament data
export interface TournamentData {
  id: string;
  name: string;
  createdAt: number;
  lastUpdatedAt: number;
  isPositionMode: boolean;
  players: TournamentPlayer[];
  matches: Match[];
}

// App-level persistent state
export interface AppState {
  lastActiveTournamentId: string | null;
}

export enum AppView {
  LOBBY = 'LOBBY',
  SETUP = 'SETUP',
  DASHBOARD = 'DASHBOARD',
  ACTIVE_MATCH = 'ACTIVE_MATCH',
}

// Legacy Player interface for backward compatibility during refactor
export interface Player {
  id: string;
  nickname: string;
  photoUrl: string | null;
  wins: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  gamesPlayed: number;
  attackPlayed: number;
  defensePlayed: number;
  isAvailable: boolean;
  points: number;
  unicorns: number;
}
