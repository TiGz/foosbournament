
export interface Player {
  id: string;
  nickname: string;
  photoUrl: string | null;
  wins: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  gamesPlayed: number;
  // Position stats
  attackPlayed: number;
  defensePlayed: number;
  // New Stats & State
  isAvailable: boolean;
  points: number;     // 1 for win, +1 for Unicorn (10-0)
  unicorns: number;   // Count of 10-0 wins
}

export interface Team {
  attackerId: string;
  defenderId: string;
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

export interface TournamentData {
  players: Player[];
  matches: Match[];
  isPositionMode: boolean;
}

export enum AppView {
  SETUP = 'SETUP',
  DASHBOARD = 'DASHBOARD',
  ACTIVE_MATCH = 'ACTIVE_MATCH',
}
