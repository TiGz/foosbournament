import { GlobalPlayer, TournamentData, TournamentSummary, AppState, DEFAULT_TOURNAMENT_SETTINGS } from '../types';

// Storage keys
const KEYS = {
  PLAYERS: 'foosball_players',
  TOURNAMENTS: 'foosball_tournaments',
  APP_STATE: 'foosball_app_state',
  TOURNAMENT_PREFIX: 'foosball_tournament_',
};

// ============================================
// Global Players
// ============================================

export const loadGlobalPlayers = (): GlobalPlayer[] => {
  try {
    const item = localStorage.getItem(KEYS.PLAYERS);
    if (!item) return [];
    return JSON.parse(item);
  } catch (e) {
    console.error("Failed to load players", e);
    return [];
  }
};

export const saveGlobalPlayers = (players: GlobalPlayer[]) => {
  try {
    localStorage.setItem(KEYS.PLAYERS, JSON.stringify(players));
  } catch (e) {
    console.error("Failed to save players", e);
    alert("Warning: Storage limit reached. Images might be too large.");
  }
};

// ============================================
// Tournament List (summaries for lobby)
// ============================================

export const loadTournamentList = (): TournamentSummary[] => {
  try {
    const item = localStorage.getItem(KEYS.TOURNAMENTS);
    if (!item) return [];
    return JSON.parse(item);
  } catch (e) {
    console.error("Failed to load tournament list", e);
    return [];
  }
};

export const saveTournamentList = (list: TournamentSummary[]) => {
  try {
    localStorage.setItem(KEYS.TOURNAMENTS, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save tournament list", e);
  }
};

// ============================================
// Individual Tournament Data
// ============================================

// Migrate old tournament data to include settings
const migrateTournamentData = (data: TournamentData): TournamentData => {
  if (data.settings) {
    return data;
  }
  // Migrate from old format - use legacy isPositionMode if it exists
  return {
    ...data,
    settings: {
      ...DEFAULT_TOURNAMENT_SETTINGS,
      isPositionMode: data.isPositionMode ?? true,
    },
  };
};

export const loadTournament = (id: string): TournamentData | null => {
  try {
    const item = localStorage.getItem(KEYS.TOURNAMENT_PREFIX + id);
    if (!item) return null;
    return migrateTournamentData(JSON.parse(item));
  } catch (e) {
    console.error("Failed to load tournament", e);
    return null;
  }
};

export const saveTournament = (data: TournamentData) => {
  try {
    localStorage.setItem(KEYS.TOURNAMENT_PREFIX + data.id, JSON.stringify(data));

    // Also update the tournament list summary
    const list = loadTournamentList();
    const existingIndex = list.findIndex(t => t.id === data.id);
    const summary: TournamentSummary = {
      id: data.id,
      name: data.name,
      playerCount: data.players.length,
      lastUpdatedAt: data.lastUpdatedAt,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = summary;
    } else {
      list.push(summary);
    }
    saveTournamentList(list);
  } catch (e) {
    console.error("Failed to save tournament", e);
    alert("Warning: Storage limit reached. Images might be too large.");
  }
};

export const deleteTournament = (id: string) => {
  try {
    localStorage.removeItem(KEYS.TOURNAMENT_PREFIX + id);

    // Remove from tournament list
    const list = loadTournamentList();
    const filteredList = list.filter(t => t.id !== id);
    saveTournamentList(filteredList);
  } catch (e) {
    console.error("Failed to delete tournament", e);
  }
};

// ============================================
// App State (lastActiveTournamentId)
// ============================================

export const loadAppState = (): AppState => {
  try {
    const item = localStorage.getItem(KEYS.APP_STATE);
    if (!item) return { lastActiveTournamentId: null };
    return JSON.parse(item);
  } catch (e) {
    console.error("Failed to load app state", e);
    return { lastActiveTournamentId: null };
  }
};

export const saveAppState = (state: AppState) => {
  try {
    localStorage.setItem(KEYS.APP_STATE, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save app state", e);
  }
};

// ============================================
// Export Data
// ============================================

export const exportTournamentData = (data: TournamentData, globalPlayers: GlobalPlayer[]) => {
  const exportData = {
    tournament: data,
    players: globalPlayers.filter(p =>
      data.players.some(tp => tp.globalPlayerId === p.id)
    ),
    exportedAt: new Date().toISOString(),
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `foosball_${data.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

// ============================================
// Utility: Generate ID
// ============================================

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// ============================================
// Utility: Format date for tournament name
// ============================================

export const formatTournamentDate = (date: Date = new Date()): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
