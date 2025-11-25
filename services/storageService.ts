import { TournamentData, Match } from '../types';

const STORAGE_KEY = 'foosball_tournament_v1';

export const saveToStorage = (data: TournamentData) => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.error("Failed to save to local storage", e);
    alert("Warning: Storage limit reached. Images might be too large.");
  }
};

// Helper type for migration
interface LegacyTeam {
  player1Id?: string;
  player2Id?: string;
  attackerId?: string;
  defenderId?: string;
  score: number;
}

interface LegacyMatch extends Omit<Match, 'team1' | 'team2'> {
  team1: LegacyTeam;
  team2: LegacyTeam;
}

export const loadFromStorage = (): TournamentData | null => {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;

    const data = JSON.parse(item);

    // Migration: Ensure matches use attackerId/defenderId
    if (data.matches) {
      data.matches = data.matches.map((m: LegacyMatch) => ({
        ...m,
        team1: {
          attackerId: m.team1.attackerId || m.team1.player1Id || '',
          defenderId: m.team1.defenderId || m.team1.player2Id || '',
          score: m.team1.score
        },
        team2: {
          attackerId: m.team2.attackerId || m.team2.player1Id || '',
          defenderId: m.team2.defenderId || m.team2.player2Id || '',
          score: m.team2.score
        }
      }));
    }

    // Migration: Ensure players have new stats and fields
    if (data.players) {
      data.players = data.players.map((p: any) => ({
        ...p,
        attackPlayed: p.attackPlayed || 0,
        defensePlayed: p.defensePlayed || 0,
        isAvailable: p.isAvailable !== undefined ? p.isAvailable : true, // Default to true
        points: p.points || 0,
        unicorns: p.unicorns || 0
      }));
    }
    
    // Migration: Ensure default positional mode if undefined
    if (data.isPositionMode === undefined) {
        data.isPositionMode = true;
    }

    return data as TournamentData;
  } catch (e) {
    console.error("Failed to load from storage", e);
    return null;
  }
};

export const exportData = (data: TournamentData) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `foosball_data_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};