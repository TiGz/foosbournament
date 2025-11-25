import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GlobalPlayer,
  TournamentPlayer,
  TournamentData,
  TournamentSummary,
  PlayerView,
  Match,
  AppView,
} from './types';
import Lobby from './components/Lobby';
import PlayerSetup from './components/PlayerSetup';
import MatchView from './components/MatchView';
import Dashboard from './components/Dashboard';
import { generateNextMatch, generateMatchQueue, updatePlayerStats, WINNING_SCORE } from './services/tournamentLogic';
import {
  loadGlobalPlayers,
  saveGlobalPlayers,
  loadTournamentList,
  loadTournament,
  saveTournament,
  deleteTournament,
  loadAppState,
  saveAppState,
  exportTournamentData,
  generateId,
  formatTournamentDate,
} from './services/storageService';

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

  const handleUpdateGlobalPlayer = (player: GlobalPlayer) => {
    setGlobalPlayers(prev => prev.map(p => p.id === player.id ? player : p));
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

  const handleCreateAndAddPlayer = (nickname: string, photoUrl: string | null) => {
    // Create global player
    const newGlobalPlayer: GlobalPlayer = {
      id: generateId(),
      nickname,
      photoUrl,
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
      alert("Could not generate a balanced round. Try enabling more players.");
    }
  };

  const handleClearQueue = () => {
    if (!currentTournament) return;

    setCurrentTournament(prev => prev ? {
      ...prev,
      matches: prev.matches.filter(m => m.status !== 'scheduled'),
    } : null);
  };

  const handleStartMatch = () => {
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

    // Generate single match
    const playerViews = createPlayerViews(globalPlayers, currentTournament.players);
    const nextMatch = generateNextMatch(playerViews, currentTournament.matches);

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
      alert("Not enough available players to generate a match. Ensure at least 4 players are enabled.");
    }
  };

  const handleTogglePositionMode = () => {
    if (!currentTournament) return;

    setCurrentTournament(prev => prev ? {
      ...prev,
      isPositionMode: !prev.isPositionMode,
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

  const handleExport = () => {
    if (currentTournament) {
      exportTournamentData(currentTournament, globalPlayers);
    }
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

    const winner = currentMatch.team1.score >= WINNING_SCORE ? 'team1' :
                   currentMatch.team2.score >= WINNING_SCORE ? 'team2' : undefined;

    if (!winner) return;

    const completedMatch: Match = { ...currentMatch, status: 'completed', winner, timestamp: Date.now() };

    // Update tournament players
    const playerViews = createPlayerViews(globalPlayers, currentTournament.players);
    const updatedPlayerViews = updatePlayerStats(playerViews, completedMatch);

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
        lifetimePoints: gp.lifetimePoints + (isWinner ? 1 : 0) + (isWinner && isUnicorn ? 1 : 0),
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
      {view === AppView.LOBBY && (
        <Lobby
          tournaments={tournaments}
          globalPlayers={globalPlayers}
          onSelectTournament={handleSelectTournament}
          onCreateTournament={handleCreateTournament}
          onDeleteTournament={handleDeleteTournament}
          onUpdatePlayer={handleUpdateGlobalPlayer}
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
        />
      )}

      {view === AppView.DASHBOARD && currentTournament && (
        <Dashboard
          players={playerViews}
          matches={currentTournament.matches}
          tournamentName={currentTournament.name}
          onStartMatch={handleStartMatch}
          onGenerateRound={handleGenerateRound}
          onClearQueue={handleClearQueue}
          onExportData={handleExport}
          canStartMatch={playerViews.filter(p => p.isAvailable).length >= 4}
          isPositionMode={currentTournament.isPositionMode}
          onTogglePositionMode={handleTogglePositionMode}
          onTogglePlayerAvailability={handleTogglePlayerAvailability}
          onBackToLobby={handleBackToLobby}
          onEditRoster={handleEditRoster}
        />
      )}

      {view === AppView.ACTIVE_MATCH && currentMatch && currentTournament && (
        <MatchView
          match={currentMatch}
          players={playerViews}
          onUpdateScore={handleUpdateScore}
          onFinishMatch={handleFinishMatch}
          onCancelMatch={handleCancelMatch}
          isPositionMode={currentTournament.isPositionMode}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < scoreHistory.length - 1}
        />
      )}
    </div>
  );
};

export default App;
