import React, { useState, useEffect, useCallback } from 'react';
import { Player, Match, AppView, TournamentData } from './types';
import PlayerSetup from './components/PlayerSetup';
import MatchView from './components/MatchView';
import Dashboard from './components/Dashboard';
import { generateNextMatch, generateMatchQueue, updatePlayerStats, WINNING_SCORE } from './services/tournamentLogic';
import { saveToStorage, loadFromStorage, exportData } from './services/storageService';

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [view, setView] = useState<AppView>(AppView.SETUP);
  // Default to true as requested
  const [isPositionMode, setIsPositionMode] = useState(true);

  // Load initial data
  useEffect(() => {
    const data = loadFromStorage();
    if (data) {
      setPlayers(data.players);
      setMatches(data.matches);
      // If saving from older version without isPositionMode, it might be undefined.
      // But we prefer it to be true by default for this version.
      // However, if user explicitly set it to false and saved, we should respect that?
      // For now, load if exists, else default true.
      if (data.isPositionMode !== undefined) {
          setIsPositionMode(data.isPositionMode);
      }

      if (data.players.length >= 4) {
        setView(AppView.DASHBOARD);
      }
      const active = data.matches.find(m => m.status === 'active');
      if (active) {
        setCurrentMatch(active);
        setView(AppView.ACTIVE_MATCH);
      }
    }
  }, []);

  // Save on change
  useEffect(() => {
    const data: TournamentData = { players, matches, isPositionMode };
    if (players.length > 0) {
        saveToStorage(data);
    }
  }, [players, matches, isPositionMode]);

  const handleAddPlayer = (player: Player) => {
    setPlayers(prev => [...prev, player]);
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleFinishSetup = () => {
    setView(AppView.DASHBOARD);
  };

  const handleGenerateRound = () => {
      const newMatches = generateMatchQueue(players, matches);
      if (newMatches.length > 0) {
          setMatches(prev => [...prev, ...newMatches]);
      } else {
          alert("Could not generate a balanced round. Try enabling more players.");
      }
  };

  const handleClearQueue = () => {
      setMatches(prev => prev.filter(m => m.status !== 'scheduled'));
  };

  const handleStartMatch = () => {
    // 1. Check for scheduled matches first
    const scheduledMatchIndex = matches.findIndex(m => m.status === 'scheduled');
    
    if (scheduledMatchIndex !== -1) {
        const matchToStart = { ...matches[scheduledMatchIndex], status: 'active' as const };
        setCurrentMatch(matchToStart);
        setMatches(prev => {
            const copy = [...prev];
            copy[scheduledMatchIndex] = matchToStart;
            return copy;
        });
        setView(AppView.ACTIVE_MATCH);
        return;
    }

    // 2. Fallback: Generate single match immediately if queue is empty
    const nextMatch = generateNextMatch(players, matches);
    if (nextMatch) {
      const activeMatch = { ...nextMatch, status: 'active' as const };
      setCurrentMatch(activeMatch);
      setMatches(prev => [...prev, activeMatch]);
      setView(AppView.ACTIVE_MATCH);
    } else {
        alert("Not enough available players to generate a match. Ensure at least 4 players are enabled.");
    }
  };

  const handleUpdateScore = useCallback((team: 'team1' | 'team2', delta: number) => {
    if (!currentMatch) return;

    setCurrentMatch(prev => {
      if (!prev) return null;
      const newScore = Math.max(0, prev[team].score + delta);
      
      return {
        ...prev,
        [team]: { ...prev[team], score: newScore }
      };
    });
  }, [currentMatch]);

  const handleFinishMatch = () => {
    if (!currentMatch) return;

    const winner = currentMatch.team1.score >= WINNING_SCORE ? 'team1' : 
                   currentMatch.team2.score >= WINNING_SCORE ? 'team2' : undefined;

    if (!winner) return;

    const completedMatch: Match = { ...currentMatch, status: 'completed', winner, timestamp: Date.now() };

    setMatches(prev => prev.map(m => m.id === completedMatch.id ? completedMatch : m));
    setPlayers(prev => updatePlayerStats(prev, completedMatch));
    setCurrentMatch(null);
    setView(AppView.DASHBOARD);
  };

  const handleCancelMatch = () => {
      if(!currentMatch) return;
      // If it was previously scheduled, we should probably revert it to scheduled? 
      // Or delete it? For simplicity, delete it. User can regenerate.
      setMatches(prev => prev.filter(m => m.id !== currentMatch.id));
      setCurrentMatch(null);
      setView(AppView.DASHBOARD);
  }

  const handleExport = () => {
    exportData({ players, matches, isPositionMode });
  };

  const handleTogglePlayerAvailability = (id: string) => {
      setPlayers(prev => prev.map(p => 
          p.id === id ? { ...p, isAvailable: !p.isAvailable } : p
      ));
  };

  return (
    <div className="font-sans text-slate-100 bg-foos-dark min-h-screen">
      {view === AppView.SETUP && (
        <PlayerSetup 
          players={players} 
          onAddPlayer={handleAddPlayer} 
          onRemovePlayer={handleRemovePlayer}
          onFinishSetup={handleFinishSetup}
        />
      )}
      
      {view === AppView.DASHBOARD && (
        <Dashboard 
          players={players}
          matches={matches}
          onStartMatch={handleStartMatch}
          onGenerateRound={handleGenerateRound}
          onClearQueue={handleClearQueue}
          onExportData={handleExport}
          canStartMatch={players.filter(p => p.isAvailable).length >= 4}
          isPositionMode={isPositionMode}
          onTogglePositionMode={() => setIsPositionMode(prev => !prev)}
          onTogglePlayerAvailability={handleTogglePlayerAvailability}
        />
      )}

      {view === AppView.ACTIVE_MATCH && currentMatch && (
        <MatchView 
          match={currentMatch}
          players={players}
          onUpdateScore={handleUpdateScore}
          onFinishMatch={handleFinishMatch}
          onCancelMatch={handleCancelMatch}
          isPositionMode={isPositionMode}
        />
      )}
    </div>
  );
};

export default App;