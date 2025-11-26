import { GlobalPlayer, TournamentData, TournamentSummary, AppState, DEFAULT_TOURNAMENT_SETTINGS, FoosballExport, NicknameConflict } from '../types';

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

export const saveGlobalPlayers = (players: GlobalPlayer[]): boolean => {
  try {
    localStorage.setItem(KEYS.PLAYERS, JSON.stringify(players));
    return true;
  } catch (e) {
    console.error("Failed to save players", e);
    return false;
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

export const saveTournament = (data: TournamentData): boolean => {
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
    return true;
  } catch (e) {
    console.error("Failed to save tournament", e);
    return false;
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
// Export Data (Legacy - single tournament)
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
// Full Import/Export (all data)
// ============================================

// Export all app data
export const exportAllData = (): FoosballExport => {
  const globalPlayers = loadGlobalPlayers();
  const tournamentSummaries = loadTournamentList();
  const tournaments = tournamentSummaries
    .map(s => loadTournament(s.id))
    .filter((t): t is TournamentData => t !== null);

  return {
    version: 1,
    exportedAt: Date.now(),
    globalPlayers,
    tournaments,
  };
};

// Validate import data structure
export const validateImport = (data: unknown): FoosballExport | null => {
  if (!data || typeof data !== 'object') return null;

  const d = data as Record<string, unknown>;

  // Check version
  if (d.version !== 1) return null;

  // Check required arrays
  if (!Array.isArray(d.globalPlayers)) return null;
  if (!Array.isArray(d.tournaments)) return null;

  // Check exportedAt
  if (typeof d.exportedAt !== 'number') return null;

  return data as FoosballExport;
};

// Find nickname conflicts between import data and existing data
export const findNicknameConflicts = (data: FoosballExport): NicknameConflict[] => {
  const existingPlayers = loadGlobalPlayers();
  const conflicts: NicknameConflict[] = [];

  for (const importingPlayer of data.globalPlayers) {
    // If ID matches, it's the same player - no conflict
    const existingById = existingPlayers.find(p => p.id === importingPlayer.id);
    if (existingById) continue;

    // Check for nickname collision (case-insensitive)
    const existingByNickname = existingPlayers.find(
      p => p.nickname.toLowerCase() === importingPlayer.nickname.toLowerCase()
    );
    if (existingByNickname) {
      conflicts.push({ importingPlayer, existingPlayer: existingByNickname });
    }
  }

  return conflicts;
};

// Clear all existing data
const clearAllData = () => {
  // Get all tournament IDs first
  const tournamentSummaries = loadTournamentList();

  // Remove all tournament data
  for (const summary of tournamentSummaries) {
    localStorage.removeItem(KEYS.TOURNAMENT_PREFIX + summary.id);
  }

  // Clear lists
  localStorage.removeItem(KEYS.PLAYERS);
  localStorage.removeItem(KEYS.TOURNAMENTS);
  localStorage.removeItem(KEYS.APP_STATE);
};

// Import with overwrite (replace all existing data)
export const importOverwrite = (data: FoosballExport): void => {
  // Clear everything first
  clearAllData();

  // Save all global players
  saveGlobalPlayers(data.globalPlayers);

  // Save all tournaments (this also updates the tournament list)
  for (const tournament of data.tournaments) {
    saveTournament(tournament);
  }
};

// Import with merge
// resolutions: Map of importing player ID -> 'merge' (use existing) | new nickname string
export const importMerge = (
  data: FoosballExport,
  resolutions: Map<string, 'merge' | string>
): void => {
  const existingPlayers = loadGlobalPlayers();
  const existingPlayersByNickname = new Map(
    existingPlayers.map(p => [p.nickname.toLowerCase(), p])
  );
  const existingPlayersById = new Map(existingPlayers.map(p => [p.id, p]));

  // Track ID mappings: importing ID -> final ID (for updating tournament references)
  const idMappings = new Map<string, string>();

  // Process players
  const newPlayers = [...existingPlayers];

  for (const importingPlayer of data.globalPlayers) {
    // If ID already exists locally, skip (keep local data)
    if (existingPlayersById.has(importingPlayer.id)) {
      idMappings.set(importingPlayer.id, importingPlayer.id);
      continue;
    }

    // Check if there's a resolution for this player (nickname conflict)
    const resolution = resolutions.get(importingPlayer.id);

    if (resolution === 'merge') {
      // Merge with existing player - find by nickname
      const existingPlayer = existingPlayersByNickname.get(importingPlayer.nickname.toLowerCase());
      if (existingPlayer) {
        idMappings.set(importingPlayer.id, existingPlayer.id);
        continue;
      }
    } else if (resolution && resolution !== 'merge') {
      // Create with new nickname
      const newPlayer: GlobalPlayer = {
        ...importingPlayer,
        id: generateId(), // Generate new ID to avoid any conflicts
        nickname: resolution,
      };
      newPlayers.push(newPlayer);
      idMappings.set(importingPlayer.id, newPlayer.id);
      continue;
    }

    // No conflict - add as new player
    newPlayers.push(importingPlayer);
    idMappings.set(importingPlayer.id, importingPlayer.id);
  }

  // Save merged players
  saveGlobalPlayers(newPlayers);

  // Process tournaments
  const existingTournaments = loadTournamentList();
  const existingTournamentIds = new Set(existingTournaments.map(t => t.id));

  for (const tournament of data.tournaments) {
    // Skip if tournament ID already exists
    if (existingTournamentIds.has(tournament.id)) {
      continue;
    }

    // Update player references in tournament
    const updatedTournament: TournamentData = {
      ...tournament,
      players: tournament.players.map(tp => ({
        ...tp,
        globalPlayerId: idMappings.get(tp.globalPlayerId) || tp.globalPlayerId,
      })),
      matches: tournament.matches.map(m => ({
        ...m,
        team1: {
          ...m.team1,
          attackerId: idMappings.get(m.team1.attackerId) || m.team1.attackerId,
          defenderId: idMappings.get(m.team1.defenderId) || m.team1.defenderId,
        },
        team2: {
          ...m.team2,
          attackerId: idMappings.get(m.team2.attackerId) || m.team2.attackerId,
          defenderId: idMappings.get(m.team2.defenderId) || m.team2.defenderId,
        },
      })),
    };

    saveTournament(updatedTournament);
  }
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
