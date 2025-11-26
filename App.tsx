import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GlobalPlayer,
  TournamentPlayer,
  TournamentData,
  TournamentSummary,
  PlayerView,
  Match,
  AppView,
  TournamentSettings,
  DEFAULT_TOURNAMENT_SETTINGS,
  FoosballExport,
  NicknameConflict,
  Toast,
} from './types';
import Lobby from './components/Lobby';
import PlayerSetup from './components/PlayerSetup';
import MatchView from './components/MatchView';
import Dashboard from './components/Dashboard';
import OfflineBanner from './components/OfflineBanner';
import UpdatePrompt from './components/UpdatePrompt';
import NicknameConflictModal from './components/NicknameConflictModal';
import ToastContainer from './components/ToastContainer';
import { generateNextMatch, generateMatchQueue, updatePlayerStats, getWinningScore, getUnicornBonus, getLeaderboard } from './services/tournamentLogic';
import {
  loadGlobalPlayers,
  saveGlobalPlayers,
  loadTournamentList,
  loadTournament,
  saveTournament,
  deleteTournament,
  loadAppState,
  saveAppState,
  exportAllData,
  validateImport,
  findNicknameConflicts,
  importOverwrite,
  importMerge,
  generateId,
  formatTournamentDate,
} from './services/storageService';
import { jsonFilePlugin } from './services/jsonFilePlugin';
import { resizeImage } from './services/imageService';
import { useToast } from './hooks/useToast';
import { avatarQueueService } from './services/avatarQueueService';

// Helper: Merge GlobalPlayer + TournamentPlayer into PlayerView for components
const createPlayerViews = (globalPlayers: GlobalPlayer[], tournamentPlayers: TournamentPlayer[]): PlayerView[] => {
  return tournamentPlayers.map(tp => {
    const gp = globalPlayers.find(g => g.id === tp.globalPlayerId);
    return {
      id: tp.globalPlayerId,
      nickname: gp?.nickname || 'Unknown',
      photoUrl: gp?.photoUrl || null,
      wins: tp.wins,
      losses: tp.losses,
      goalsScored: tp.goalsScored,
      goalsConceded: tp.goalsConceded,
      gamesPlayed: tp.gamesPlayed,
      attackPlayed: tp.attackPlayed,
      defensePlayed: tp.defensePlayed,
      points: tp.points,
      unicorns: tp.unicorns,
      isAvailable: tp.isAvailable,
    };
  });
};

// Helper: Create empty tournament player stats
const createEmptyTournamentPlayer = (globalPlayerId: string): TournamentPlayer => ({
  globalPlayerId,
  wins: 0,
  losses: 0,
  goalsScored: 0,
  goalsConceded: 0,
  gamesPlayed: 0,
  attackPlayed: 0,
  defensePlayed: 0,
  points: 0,
  unicorns: 0,
  isAvailable: true,
});

const App: React.FC = () => {
  // Global state
  const [globalPlayers, setGlobalPlayers] = useState<GlobalPlayer[]>([]);
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);

  // Current tournament state
  const [currentTournament, setCurrentTournament] = useState<TournamentData | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  // View state
  const [view, setView] = useState<AppView>(AppView.LOBBY);

  // Score history for undo/redo
  const [scoreHistory, setScoreHistory] = useState<{team1: number, team2: number}[]>([{team1: 0, team2: 0}]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyRef = useRef(scoreHistory);
  const indexRef = useRef(historyIndex);
  historyRef.current = scoreHistory;
  indexRef.current = historyIndex;

  // Track previous leaderboard state for animations when returning from match
  const [previousLeaderboard, setPreviousLeaderboard] = useState<{id: string, points: number, rank: number}[] | null>(null);

  // Import/export state
  const [nicknameConflicts, setNicknameConflicts] = useState<NicknameConflict[]>([]);
  const [pendingImportData, setPendingImportData] = useState<FoosballExport | null>(null);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Load initial data
  useEffect(() => {
    const players = loadGlobalPlayers();
    const tournamentList = loadTournamentList();
    const appState = loadAppState();

    setGlobalPlayers(players);
    setTournaments(tournamentList);

    // Auto-resume last active tournament
    if (appState.lastActiveTournamentId) {
      const tournament = loadTournament(appState.lastActiveTournamentId);
      if (tournament) {
        setCurrentTournament(tournament);

        // Check for active match
        const activeMatch = tournament.matches.find(m => m.status === 'active');
        if (activeMatch) {
          setCurrentMatch(activeMatch);
          setView(AppView.ACTIVE_MATCH);
        } else if (tournament.players.length >= 4) {
          setView(AppView.DASHBOARD);
        } else {
          setView(AppView.SETUP);
        }
      }
    }
  }, []);

  // Save tournament on change
  useEffect(() => {
    if (currentTournament) {
      const updated = { ...currentTournament, lastUpdatedAt: Date.now() };
      saveTournament(updated);
      saveAppState({ lastActiveTournamentId: currentTournament.id });
    }
  }, [currentTournament]);

  // Save global players on change
  useEffect(() => {
    if (globalPlayers.length > 0) {
      saveGlobalPlayers(globalPlayers);
    }
  }, [globalPlayers]);

  // Subscribe to avatar generation completions
  useEffect(() => {
    const unsubscribe = avatarQueueService.subscribe((job) => {
      if (job.status === 'completed' && job.result) {
        // Find the player and update their photo
        setGlobalPlayers((prev) => {
          const player = prev.find((p) => p.id === job.playerId);
          if (!player) return prev; // Player was deleted
          return prev.map((p) =>
            p.id === job.playerId ? { ...p, photoUrl: job.result! } : p
          );
        });
        addToast({ type: 'success', message: `Avatar ready for ${job.nickname}!` });
        avatarQueueService.acknowledgeJob(job.id);
      } else if (job.status === 'failed') {
        addToast({ type: 'error', message: `Avatar failed for ${job.nickname}: ${job.error || 'Unknown error'}` });
        avatarQueueService.acknowledgeJob(job.id);
      }
    });
    return unsubscribe;
  }, [addToast]);

  // ============================================
  // Lobby Handlers
  // ============================================

  const handleSelectTournament = (id: string) => {
    const tournament = loadTournament(id);
    if (tournament) {
      setCurrentTournament(tournament);
      saveAppState({ lastActiveTournamentId: id });

      if (tournament.players.length >= 4) {
        setView(AppView.DASHBOARD);
      } else {
        setView(AppView.SETUP);
      }
    }
  };

  const handleCreateTournament = () => {
    const newTournament: TournamentData = {
      id: generateId(),
      name: formatTournamentDate(),
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
      isPositionMode: true,
      settings: { ...DEFAULT_TOURNAMENT_SETTINGS },
      players: [],
      matches: [],
    };

    setCurrentTournament(newTournament);
    saveTournament(newTournament);
    setTournaments(loadTournamentList());
    saveAppState({ lastActiveTournamentId: newTournament.id });
    setView(AppView.SETUP);
  };

  const handleDeleteTournament = (id: string) => {
    deleteTournament(id);
    setTournaments(loadTournamentList());

    if (currentTournament?.id === id) {
      setCurrentTournament(null);
      saveAppState({ lastActiveTournamentId: null });
    }
  };

  const handleUpdateGlobalPlayer = async (player: GlobalPlayer) => {
    // Check if photoUrl has changed and needs resizing
    const existingPlayer = globalPlayers.find(p => p.id === player.id);
    let updatedPlayer = player;

    if (player.photoUrl && player.photoUrl !== existingPlayer?.photoUrl) {
      // Resize image for storage (keep high quality during editing, compress on save)
      const resizedPhotoUrl = await resizeImage(player.photoUrl);
      updatedPlayer = { ...player, photoUrl: resizedPhotoUrl };
    }

    setGlobalPlayers(prev => prev.map(p => p.id === player.id ? updatedPlayer : p));
  };

  const handleBackToLobby = () => {
    setCurrentTournament(null);
    setCurrentMatch(null);
    saveAppState({ lastActiveTournamentId: null });
    setTournaments(loadTournamentList()); // Refresh list
    setView(AppView.LOBBY);
  };

  // ============================================
  // Setup Handlers
  // ============================================

  const handleAddPlayerToTournament = (globalPlayerId: string) => {
    if (!currentTournament) return;
    if (currentTournament.players.some(p => p.globalPlayerId === globalPlayerId)) return;

    const newPlayer = createEmptyTournamentPlayer(globalPlayerId);
    setCurrentTournament(prev => prev ? {
      ...prev,
      players: [...prev.players, newPlayer],
    } : null);
  };

  const handleCreateAndAddPlayer = async (nickname: string, photoUrl: string | null): Promise<string> => {
    // Resize image for storage (keep high quality during editing, compress on save)
    const resizedPhotoUrl = photoUrl ? await resizeImage(photoUrl) : null;

    // Create global player
    const newGlobalPlayer: GlobalPlayer = {
      id: generateId(),
      nickname,
      photoUrl: resizedPhotoUrl,
      createdAt: Date.now(),
      lifetimeWins: 0,
      lifetimeLosses: 0,
      lifetimeGoalsScored: 0,
      lifetimeGoalsConceded: 0,
      lifetimeGamesPlayed: 0,
      lifetimePoints: 0,
      lifetimeUnicorns: 0,
    };

    setGlobalPlayers(prev => [...prev, newGlobalPlayer]);

    // Add to current tournament
    handleAddPlayerToTournament(newGlobalPlayer.id);

    return newGlobalPlayer.id;
  };

  const handleRemovePlayerFromTournament = (globalPlayerId: string) => {
    if (!currentTournament) return;

    setCurrentTournament(prev => prev ? {
      ...prev,
      players: prev.players.filter(p => p.globalPlayerId !== globalPlayerId),
    } : null);
  };

  const handleFinishSetup = () => {
    setView(AppView.DASHBOARD);
  };

  // ============================================
  // Dashboard Handlers
  // ============================================

  const handleGenerateRound = () => {
    if (!currentTournament) return;

    const playerViews = createPlayerViews(globalPlayers, currentTournament.players);
    const newMatches = generateMatchQueue(playerViews, currentTournament.matches);

    if (newMatches.length > 0) {
      setCurrentTournament(prev => prev ? {
        ...prev,
        matches: [...prev.matches, ...newMatches],
      } : null);
    } else {
      addToast({ type: 'error', message: 'Could not generate a balanced round. Try enabling more players.' });
    }
  };

  const handleClearQueue = () => {
    if (!currentTournament) return;

    setCurrentTournament(prev => prev ? {
      ...prev,
      matches: prev.matches.filter(m => m.status !== 'scheduled'),
    } : null);
  };

  const handleStartMatch = (previewMatch?: Match) => {
    if (!currentTournament) return;

    // Check for scheduled matches first
    const scheduledMatchIndex = currentTournament.matches.findIndex(m => m.status === 'scheduled');

    if (scheduledMatchIndex !== -1) {
      const matchToStart = { ...currentTournament.matches[scheduledMatchIndex], status: 'active' as const };
      setCurrentMatch(matchToStart);
      setScoreHistory([{team1: 0, team2: 0}]);
      setHistoryIndex(0);

      setCurrentTournament(prev => {
        if (!prev) return null;
        const newMatches = [...prev.matches];
        newMatches[scheduledMatchIndex] = matchToStart;
        return { ...prev, matches: newMatches };
      });

      setView(AppView.ACTIVE_MATCH);
      return;
    }

    // Use preview match if provided, otherwise generate a new one
    const nextMatch = previewMatch || generateNextMatch(
      createPlayerViews(globalPlayers, currentTournament.players),
      currentTournament.matches
    );

    if (nextMatch) {
      const activeMatch = { ...nextMatch, status: 'active' as const };
      setCurrentMatch(activeMatch);
      setScoreHistory([{team1: 0, team2: 0}]);
      setHistoryIndex(0);

      setCurrentTournament(prev => prev ? {
        ...prev,
        matches: [...prev.matches, activeMatch],
      } : null);

      setView(AppView.ACTIVE_MATCH);
    } else {
      addToast({ type: 'error', message: 'Not enough available players to generate a match. Ensure at least 4 players are enabled.' });
    }
  };

  const handleUpdateSettings = (newSettings: TournamentSettings) => {
    if (!currentTournament) return;

    setCurrentTournament(prev => prev ? {
      ...prev,
      settings: newSettings,
      isPositionMode: newSettings.isPositionMode, // Keep legacy field in sync
    } : null);
  };

  const handleTogglePlayerAvailability = (globalPlayerId: string) => {
    if (!currentTournament) return;

    setCurrentTournament(prev => {
      if (!prev) return null;
      return {
        ...prev,
        players: prev.players.map(p =>
          p.globalPlayerId === globalPlayerId ? { ...p, isAvailable: !p.isAvailable } : p
        ),
      };
    });
  };

  // ============================================
  // Import/Export Handlers
  // ============================================

  const handleExportAllData = async () => {
    const data = exportAllData();
    await jsonFilePlugin.export(data);
  };

  const handleImportData = async (mode: 'overwrite' | 'merge') => {
    const data = await jsonFilePlugin.import();
    if (!data) return; // User cancelled or error

    const validated = validateImport(data);
    if (!validated) {
      addToast({ type: 'error', message: 'Invalid backup file format. Please select a valid Foosbournament backup file.' });
      return;
    }

    if (mode === 'overwrite') {
      importOverwrite(validated);
      // Reload all data
      setGlobalPlayers(loadGlobalPlayers());
      setTournaments(loadTournamentList());
      setCurrentTournament(null);
      saveAppState({ lastActiveTournamentId: null });
      addToast({ type: 'success', message: 'Data imported successfully!' });
    } else {
      // Check for nickname conflicts
      const conflicts = findNicknameConflicts(validated);
      if (conflicts.length > 0) {
        // Show conflict resolution modal
        setNicknameConflicts(conflicts);
        setPendingImportData(validated);
      } else {
        // No conflicts, proceed with merge
        importMerge(validated, new Map());
        // Reload all data
        setGlobalPlayers(loadGlobalPlayers());
        setTournaments(loadTournamentList());
        addToast({ type: 'success', message: 'Data merged successfully!' });
      }
    }
  };

  const handleResolveConflicts = (resolutions: Map<string, 'merge' | string>) => {
    if (!pendingImportData) return;

    importMerge(pendingImportData, resolutions);

    // Reload all data
    setGlobalPlayers(loadGlobalPlayers());
    setTournaments(loadTournamentList());

    // Clear conflict state
    setNicknameConflicts([]);
    setPendingImportData(null);

    addToast({ type: 'success', message: 'Data merged successfully!' });
  };

  const handleCancelConflictResolution = () => {
    setNicknameConflicts([]);
    setPendingImportData(null);
  };

  const handleEditRoster = () => {
    setView(AppView.SETUP);
  };

  // ============================================
  // Match Handlers
  // ============================================

  const handleUpdateScore = useCallback((team: 'team1' | 'team2', delta: number) => {
    setCurrentMatch(prev => {
      if (!prev) return null;
      const newScore = Math.max(0, prev[team].score + delta);
      const newMatch = {
        ...prev,
        [team]: { ...prev[team], score: newScore }
      };

      const currentIndex = indexRef.current;
      const newHistory = historyRef.current.slice(0, currentIndex + 1);
      newHistory.push({
        team1: newMatch.team1.score,
        team2: newMatch.team2.score
      });
      setScoreHistory(newHistory);
      setHistoryIndex(currentIndex + 1);

      return newMatch;
    });
  }, []);

  const handleUndo = useCallback(() => {
    const currentIndex = indexRef.current;
    if (currentIndex <= 0) return;
    const newIndex = currentIndex - 1;
    const prevState = historyRef.current[newIndex];
    setHistoryIndex(newIndex);
    setCurrentMatch(prev => {
      if (!prev) return null;
      return {
        ...prev,
        team1: { ...prev.team1, score: prevState.team1 },
        team2: { ...prev.team2, score: prevState.team2 }
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    const currentIndex = indexRef.current;
    const history = historyRef.current;
    if (currentIndex >= history.length - 1) return;
    const newIndex = currentIndex + 1;
    const nextState = history[newIndex];
    setHistoryIndex(newIndex);
    setCurrentMatch(prev => {
      if (!prev) return null;
      return {
        ...prev,
        team1: { ...prev.team1, score: nextState.team1 },
        team2: { ...prev.team2, score: nextState.team2 }
      };
    });
  }, []);

  const handleFinishMatch = () => {
    if (!currentMatch || !currentTournament) return;

    const settings = currentTournament.settings ?? DEFAULT_TOURNAMENT_SETTINGS;
    const winningScore = getWinningScore(settings);
    const unicornBonus = getUnicornBonus(settings);

    const winner = currentMatch.team1.score >= winningScore ? 'team1' :
                   currentMatch.team2.score >= winningScore ? 'team2' : undefined;

    if (!winner) return;

    const completedMatch: Match = { ...currentMatch, status: 'completed', winner, timestamp: Date.now() };

    // Capture the previous leaderboard state BEFORE updating stats
    const playerViews = createPlayerViews(globalPlayers, currentTournament.players);
    const prevLeaderboard = getLeaderboard(playerViews);
    setPreviousLeaderboard(prevLeaderboard.map((p, index) => ({ id: p.id, points: p.points, rank: index })));

    // Update tournament players
    const updatedPlayerViews = updatePlayerStats(playerViews, completedMatch, settings);

    // Map back to TournamentPlayer
    const updatedTournamentPlayers = currentTournament.players.map(tp => {
      const updatedView = updatedPlayerViews.find(pv => pv.id === tp.globalPlayerId);
      if (updatedView) {
        return {
          ...tp,
          wins: updatedView.wins,
          losses: updatedView.losses,
          goalsScored: updatedView.goalsScored,
          goalsConceded: updatedView.goalsConceded,
          gamesPlayed: updatedView.gamesPlayed,
          attackPlayed: updatedView.attackPlayed,
          defensePlayed: updatedView.defensePlayed,
          points: updatedView.points,
          unicorns: updatedView.unicorns,
        };
      }
      return tp;
    });

    // Update lifetime stats for global players
    const winningTeam = completedMatch[winner];
    const losingTeam = completedMatch[winner === 'team1' ? 'team2' : 'team1'];
    const isUnicorn = losingTeam.score === 0;

    setGlobalPlayers(prev => prev.map(gp => {
      const isWinner = gp.id === winningTeam.attackerId || gp.id === winningTeam.defenderId;
      const isLoser = gp.id === losingTeam.attackerId || gp.id === losingTeam.defenderId;

      if (!isWinner && !isLoser) return gp;

      const goalsFor = isWinner ? winningTeam.score : losingTeam.score;
      const goalsAgainst = isWinner ? losingTeam.score : winningTeam.score;

      return {
        ...gp,
        lifetimeWins: gp.lifetimeWins + (isWinner ? 1 : 0),
        lifetimeLosses: gp.lifetimeLosses + (isLoser ? 1 : 0),
        lifetimeGoalsScored: gp.lifetimeGoalsScored + goalsFor,
        lifetimeGoalsConceded: gp.lifetimeGoalsConceded + goalsAgainst,
        lifetimeGamesPlayed: gp.lifetimeGamesPlayed + 1,
        lifetimePoints: gp.lifetimePoints + (isWinner ? 1 : 0) + (isWinner && isUnicorn ? unicornBonus : 0),
        lifetimeUnicorns: gp.lifetimeUnicorns + (isWinner && isUnicorn ? 1 : 0),
      };
    }));

    // Update tournament
    setCurrentTournament(prev => {
      if (!prev) return null;
      return {
        ...prev,
        matches: prev.matches.map(m => m.id === completedMatch.id ? completedMatch : m),
        players: updatedTournamentPlayers,
      };
    });

    setCurrentMatch(null);
    setView(AppView.DASHBOARD);
  };

  const handleCancelMatch = () => {
    if (!currentMatch || !currentTournament) return;

    setCurrentTournament(prev => {
      if (!prev) return null;
      return {
        ...prev,
        matches: prev.matches.filter(m => m.id !== currentMatch.id),
      };
    });

    setCurrentMatch(null);
    setView(AppView.DASHBOARD);
  };

  // ============================================
  // Render
  // ============================================

  // Get player views for current tournament
  const playerViews = currentTournament
    ? createPlayerViews(globalPlayers, currentTournament.players)
    : [];

  return (
    <div className="font-sans text-slate-100 bg-foos-dark min-h-screen">
      <OfflineBanner />
      <UpdatePrompt />

      {view === AppView.LOBBY && (
        <Lobby
          tournaments={tournaments}
          globalPlayers={globalPlayers}
          onSelectTournament={handleSelectTournament}
          onCreateTournament={handleCreateTournament}
          onDeleteTournament={handleDeleteTournament}
          onUpdatePlayer={handleUpdateGlobalPlayer}
          onExportData={handleExportAllData}
          onImportData={handleImportData}
          addToast={addToast}
        />
      )}

      {view === AppView.SETUP && currentTournament && (
        <PlayerSetup
          players={playerViews}
          globalPlayers={globalPlayers}
          tournamentName={currentTournament.name}
          onAddPlayer={handleAddPlayerToTournament}
          onCreatePlayer={handleCreateAndAddPlayer}
          onRemovePlayer={handleRemovePlayerFromTournament}
          onFinishSetup={handleFinishSetup}
          onBackToLobby={handleBackToLobby}
          addToast={addToast}
        />
      )}

      {view === AppView.DASHBOARD && currentTournament && (
        <Dashboard
          players={playerViews}
          globalPlayers={globalPlayers}
          matches={currentTournament.matches}
          tournamentName={currentTournament.name}
          onStartMatch={handleStartMatch}
          onGenerateRound={handleGenerateRound}
          onClearQueue={handleClearQueue}
          canStartMatch={playerViews.filter(p => p.isAvailable).length >= 4}
          settings={currentTournament.settings ?? DEFAULT_TOURNAMENT_SETTINGS}
          onUpdateSettings={handleUpdateSettings}
          onTogglePlayerAvailability={handleTogglePlayerAvailability}
          onBackToLobby={handleBackToLobby}
          onEditRoster={handleEditRoster}
          onUpdatePlayer={handleUpdateGlobalPlayer}
          previousLeaderboard={previousLeaderboard}
          onAnimationComplete={() => setPreviousLeaderboard(null)}
          addToast={addToast}
        />
      )}

      {view === AppView.ACTIVE_MATCH && currentMatch && currentTournament && (
        <MatchView
          match={currentMatch}
          players={playerViews}
          onUpdateScore={handleUpdateScore}
          onFinishMatch={handleFinishMatch}
          onCancelMatch={handleCancelMatch}
          settings={currentTournament.settings ?? DEFAULT_TOURNAMENT_SETTINGS}
          onUpdateSettings={handleUpdateSettings}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < scoreHistory.length - 1}
        />
      )}

      {/* Nickname Conflict Resolution Modal */}
      <NicknameConflictModal
        isOpen={nicknameConflicts.length > 0}
        conflicts={nicknameConflicts}
        onResolve={handleResolveConflicts}
        onCancel={handleCancelConflictResolution}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default App;
