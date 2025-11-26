
import React, { useState, useEffect, useMemo } from 'react';
import { PlayerView, Match, GlobalPlayer, TournamentSettings, Toast } from '../types';
import { getLeaderboard, generateNextMatch } from '../services/tournamentLogic';
import { Play, Crown, History, Shield, Sword, Power, Sparkles, X, List, CalendarClock, Zap, AlertTriangle, RefreshCw, ArrowLeft, UserPlus, Camera, Settings, ChevronDown } from 'lucide-react';
import AvatarEditor from './AvatarEditor';
import OptionsModal from './OptionsModal';
import { useAvatarQueue } from '../hooks/useAvatarQueue';

interface PreviousLeaderboardEntry {
  id: string;
  points: number;
  rank: number;
}

interface Props {
  players: PlayerView[];
  globalPlayers: GlobalPlayer[];
  matches: Match[];
  tournamentName: string;
  onStartMatch: (previewMatch?: Match) => void;
  onGenerateRound: () => void;
  onClearQueue: () => void;
  onBackToLobby: () => void;
  onEditRoster: () => void;
  onUpdatePlayer: (player: GlobalPlayer) => void;
  canStartMatch: boolean;
  settings: TournamentSettings;
  onUpdateSettings: (settings: TournamentSettings) => void;
  onTogglePlayerAvailability: (id: string) => void;
  previousLeaderboard?: PreviousLeaderboardEntry[] | null;
  onAnimationComplete?: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => string;
}

type LeaderboardMode = 'leaderboard' | 'leastPlayed';

// Sound effect for new leader celebration
const playNewLeaderSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Triumphant fanfare - ascending notes
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const durations = [0.15, 0.15, 0.15, 0.4];

    let time = audioContext.currentTime;

    notes.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'triangle';

      gainNode.gain.setValueAtTime(0.3, time);
      gainNode.gain.exponentialDecayTo ? gainNode.gain.exponentialDecayTo(0.01, time + durations[i]) : gainNode.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);

      oscillator.start(time);
      oscillator.stop(time + durations[i]);

      time += durations[i] * 0.8; // Slight overlap
    });

    // Add sparkle sound at the end
    setTimeout(() => {
      const sparkleContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const osc = sparkleContext.createOscillator();
          const gain = sparkleContext.createGain();
          osc.connect(gain);
          gain.connect(sparkleContext.destination);
          osc.frequency.value = 2000 + Math.random() * 2000;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.1, sparkleContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, sparkleContext.currentTime + 0.1);
          osc.start();
          osc.stop(sparkleContext.currentTime + 0.1);
        }, i * 100);
      }
    }, 400);
  } catch (e) {
    console.log('Audio not supported');
  }
};

const Dashboard: React.FC<Props> = ({
    players,
    globalPlayers,
    matches,
    tournamentName,
    onStartMatch,
    onGenerateRound,
    onClearQueue,
    onBackToLobby,
    onEditRoster,
    onUpdatePlayer,
    canStartMatch,
    settings,
    onUpdateSettings,
    onTogglePlayerAvailability,
    previousLeaderboard,
    onAnimationComplete,
    addToast,
}) => {
  const { isGenerating } = useAvatarQueue();
  const isPositionMode = settings.isPositionMode;
  const completedMatches = matches.filter(m => m.status === 'completed').sort((a, b) => b.timestamp - a.timestamp);
  const scheduledMatches = matches.filter(m => m.status === 'scheduled');

  const recentMatches = completedMatches.slice(0, 5);
  const totalGames = completedMatches.length;
  const totalGoals = players.reduce((acc, p) => acc + p.goalsScored, 0);

  // Modals state
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerView | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCancelRoundConfirm, setShowCancelRoundConfirm] = useState(false);
  const [editingAvatarPlayer, setEditingAvatarPlayer] = useState<GlobalPlayer | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Leaderboard mode state
  const [leaderboardMode, setLeaderboardMode] = useState<LeaderboardMode>('leaderboard');

  // Next match preview state (for single match mode)
  const [previewMatch, setPreviewMatch] = useState<Match | null>(null);

  // Player modal tab state
  const [playerModalTab, setPlayerModalTab] = useState<'stats' | 'history'>('stats');

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [newLeaderIds, setNewLeaderIds] = useState<Set<string>>(new Set());
  const [positionChanges, setPositionChanges] = useState<Map<string, number>>(new Map());
  const animationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sorted players based on leaderboard mode
  const sortedPlayers = useMemo(() => {
    if (leaderboardMode === 'leastPlayed') {
      return [...players].sort((a, b) => a.gamesPlayed - b.gamesPlayed);
    }
    return getLeaderboard(players);
  }, [players, leaderboardMode]);

  // Calculate top score and all leaders (for joint leader display)
  const topScore = sortedPlayers.length > 0 ? sortedPlayers[0].points : 0;
  const leaderIds = useMemo(() => {
    if (leaderboardMode !== 'leaderboard' || sortedPlayers.length === 0) return new Set<string>();
    const top = sortedPlayers[0].points;
    return new Set(sortedPlayers.filter(p => p.points === top && p.isAvailable).map(p => p.id));
  }, [sortedPlayers, leaderboardMode]);
  const hasJointLeaders = leaderIds.size > 1;

  // Generate preview match when in single match mode and players change
  useEffect(() => {
    if (scheduledMatches.length === 0 && canStartMatch) {
      const nextMatch = generateNextMatch(players, matches);
      setPreviewMatch(nextMatch);
    } else {
      setPreviewMatch(null);
    }
  }, [players, matches, scheduledMatches.length, canStartMatch]);

  // Reset player modal tab when selecting a new player
  useEffect(() => {
    if (selectedPlayer) {
      setPlayerModalTab('stats');
    }
  }, [selectedPlayer?.id]);

  // Sync selectedPlayer with latest player data (e.g., when avatar updates)
  useEffect(() => {
    if (selectedPlayer) {
      const updatedPlayer = players.find(p => p.id === selectedPlayer.id);
      if (updatedPlayer && updatedPlayer.photoUrl !== selectedPlayer.photoUrl) {
        setSelectedPlayer(updatedPlayer);
      }
    }
  }, [players, selectedPlayer]);

  // Handle leaderboard animation when returning from a completed match
  useEffect(() => {
    if (previousLeaderboard && previousLeaderboard.length > 0 && sortedPlayers.length > 0) {
      // Calculate position changes
      const changes = new Map<string, number>();

      // Get previous leader(s) - all players who had the top score
      const prevTopScore = previousLeaderboard[0]?.points ?? 0;
      const previousLeaderIdSet = new Set(
        previousLeaderboard.filter(p => p.points === prevTopScore).map(p => p.id)
      );

      sortedPlayers.forEach((player, newRank) => {
        const prevEntry = previousLeaderboard.find(p => p.id === player.id);
        if (prevEntry) {
          const rankChange = prevEntry.rank - newRank; // positive = moved up
          if (rankChange !== 0) {
            changes.set(player.id, rankChange);
          }
        }
      });

      setPositionChanges(changes);

      // Check for leadership changes that deserve celebration:
      // 1. Someone who wasn't a leader before but is now
      // 2. Someone who was a joint leader but is now sole leader (pulled ahead)
      const newLeaders = new Set<string>();
      const wasJointLeaders = previousLeaderIdSet.size > 1;
      const isNowSoleLeader = leaderIds.size === 1;

      leaderIds.forEach(id => {
        // Case 1: Brand new leader (wasn't a leader before)
        if (!previousLeaderIdSet.has(id)) {
          newLeaders.add(id);
        }
        // Case 2: Was joint leader, now sole leader (pulled ahead of the pack)
        else if (wasJointLeaders && isNowSoleLeader && previousLeaderIdSet.has(id)) {
          newLeaders.add(id);
        }
      });

      if (newLeaders.size > 0) {
        setNewLeaderIds(newLeaders);
        // Play celebration sound with a small delay for dramatic effect
        setTimeout(() => {
          playNewLeaderSound();
        }, 300);
      }

      // Start animation
      setIsAnimating(true);

      // Clear animation after duration
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
        setNewLeaderIds(new Set());
        setPositionChanges(new Map());
        onAnimationComplete?.();
      }, 3000);

      return () => {
        if (animationTimeoutRef.current) {
          clearTimeout(animationTimeoutRef.current);
        }
      };
    }
  }, [previousLeaderboard, sortedPlayers, leaderIds, onAnimationComplete]);

  // Handler to refresh the preview match
  const handleRefreshPreview = () => {
    const nextMatch = generateNextMatch(players, matches);
    setPreviewMatch(nextMatch);
  };

  // Get matches for a specific player
  const getPlayerMatches = (playerId: string): Match[] => {
    return completedMatches.filter(m =>
      m.team1.attackerId === playerId || m.team1.defenderId === playerId ||
      m.team2.attackerId === playerId || m.team2.defenderId === playerId
    );
  };

  // Helper to get formatted name for a team
  const getTeamNames = (team: any) => {
    const p1 = players.find(p => p.id === team.attackerId)?.nickname || '?';
    const p2 = players.find(p => p.id === team.defenderId)?.nickname || '?';
    return { p1, p2 };
  };

  const getPlayerNick = (id: string) => players.find(p => p.id === id)?.nickname || 'Unknown';

  const handleConfirmCancelRound = () => {
      onClearQueue();
      setShowCancelRoundConfirm(false);
  };

  return (
    <div className="h-screen w-screen bg-foos-dark text-white flex overflow-hidden font-sans">

      {/* Left Sidebar: Leaderboard */}
      <div className="w-[120px] sm:w-[160px] md:w-[220px] lg:w-[280px] xl:w-[320px] bg-foos-panel border-r border-slate-800 flex flex-col shadow-2xl z-10 flex-shrink-0">
        <div className="p-2 sm:p-3 md:p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
          <button
            onClick={() => setLeaderboardMode(prev => prev === 'leaderboard' ? 'leastPlayed' : 'leaderboard')}
            className="flex items-center gap-1 md:gap-2 group w-full"
          >
            <h2 className="text-fluid-sm sm:text-fluid-base md:text-fluid-lg lg:text-fluid-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foos-gold to-yellow-200 flex items-center gap-1 md:gap-2 italic uppercase">
              <Crown className="w-4 h-4 md:w-5 md:h-5 text-foos-gold" />
              <span className="hidden sm:inline">{leaderboardMode === 'leaderboard' ? 'Leaderboard' : 'Least Played'}</span>
              <span className="sm:hidden">{leaderboardMode === 'leaderboard' ? 'Ranks' : 'Played'}</span>
            </h2>
            <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-foos-gold/50 group-hover:text-foos-gold transition" />
          </button>
          <p className="text-slate-500 text-2xs md:text-fluid-xs font-bold tracking-wider mt-0.5 uppercase hidden md:block">
            {leaderboardMode === 'leaderboard'
              ? `${settings.winningScore}-0 = Unicorn ${settings.unicornBonus > 0 ? `(+${settings.unicornBonus} pt${settings.unicornBonus > 1 ? 's' : ''})` : '(No bonus)'}`
              : 'Sorted by games played'}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 md:p-3 space-y-1 md:space-y-2">
          {sortedPlayers.map((player, index) => {
            const rankChange = positionChanges.get(player.id) || 0;
            const isLeader = leaderIds.has(player.id);
            const isNewLeader = newLeaderIds.has(player.id);
            const hasRankChange = rankChange !== 0 && isAnimating;
            const isPlayerGenerating = isGenerating(player.id);

            return (
            <div
              key={player.id}
              className={`relative flex items-center p-1.5 sm:p-2 md:p-3 rounded-card border transition-all duration-500 group min-h-[44px] ${
                !player.isAvailable ? 'opacity-50 grayscale border-slate-800 bg-slate-900' :
                isNewLeader
                  ? 'bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent border-amber-400/50 shadow-amber-500/30 shadow-lg ring-2 ring-amber-400/30 animate-pulse'
                  : leaderboardMode === 'leaderboard' && isLeader
                  ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30 shadow-amber-900/10 shadow-lg'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:shadow-card-hover'
              } ${hasRankChange && rankChange > 0 ? 'animate-[slideInFromBelow_0.5s_ease-out]' : ''}`}
              style={hasRankChange ? {
                animationDelay: `${index * 50}ms`,
              } : undefined}
            >
               {/* New Leader Sparkles */}
               {isNewLeader && (
                 <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-card">
                   {[...Array(8)].map((_, i) => (
                     <div
                       key={i}
                       className="absolute w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-400"
                       style={{
                         left: `${10 + (i * 12)}%`,
                         top: `${20 + (i % 3) * 30}%`,
                         animation: `sparkle 1.5s ease-in-out infinite`,
                         animationDelay: `${i * 0.15}s`,
                         boxShadow: '0 0 6px 2px rgba(251, 191, 36, 0.6)',
                       }}
                     />
                   ))}
                 </div>
               )}

               {/* Rank Change Indicator */}
               {hasRankChange && rankChange !== 0 && (
                 <div className={`absolute -right-1 md:-right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 rounded text-2xs font-bold z-10 ${
                   rankChange > 0
                     ? 'bg-emerald-500 text-white shadow-emerald-500/50 shadow-lg'
                     : 'bg-red-500 text-white shadow-red-500/50 shadow-lg'
                 }`}>
                   {rankChange > 0 ? `↑${rankChange}` : `↓${Math.abs(rankChange)}`}
                 </div>
               )}

               {/* Rank Badge (only in leaderboard mode) */}
               {leaderboardMode === 'leaderboard' && (
                 <div className={`absolute -left-1 md:-left-2 top-1/2 -translate-y-1/2 ${hasJointLeaders && isLeader ? 'w-6 md:w-8' : 'w-5 md:w-6'} h-5 md:h-6 rounded-full flex items-center justify-center text-2xs md:text-fluid-xs font-bold border-2 transition-all duration-300 ${
                     !player.isAvailable ? 'bg-slate-800 text-slate-500 border-slate-600' :
                     isNewLeader ? 'bg-amber-400 text-slate-900 border-amber-200 shadow-lg shadow-amber-400/50 scale-110' :
                     isLeader ? 'bg-foos-gold text-slate-900 border-white' : 'bg-slate-800 text-slate-400 border-slate-700'
                 }`}>
                     {hasJointLeaders && isLeader ? '1=' : index + 1}
                 </div>
               )}

              {/* Avatar - Clickable (hidden on small screens) */}
              <div
                onClick={() => setSelectedPlayer(player)}
                className={`relative hidden sm:flex w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 flex-shrink-0 bg-slate-800 cursor-pointer hover:scale-105 transition ${leaderboardMode === 'leaderboard' ? 'ml-3' : 'ml-1'} ${
                  isPlayerGenerating ? 'border-foos-brand animate-pulse' : 'border-slate-700 hover:border-foos-accent'
                }`}
              >
                {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-fluid-xs font-bold text-slate-600">{player.nickname.charAt(0)}</div>
                )}
                {isPlayerGenerating && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-foos-brand rounded-full flex items-center justify-center">
                    <Sparkles className="w-2 h-2 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className={`flex-1 min-w-0 cursor-pointer ${leaderboardMode === 'leaderboard' ? 'ml-4 sm:ml-2 md:ml-3' : 'ml-2 md:ml-3'}`} onClick={() => setSelectedPlayer(player)}>
                <div className="flex items-center gap-1 md:gap-2">
                    <div className={`font-bold truncate text-fluid-xs sm:text-fluid-sm md:text-fluid-base leading-tight ${leaderboardMode === 'leaderboard' && isLeader ? 'text-foos-gold' : 'text-slate-200'}`}>{player.nickname}</div>
                    {leaderboardMode === 'leaderboard' && player.unicorns > 0 && (
                         <div className="hidden lg:flex items-center text-2xs text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full border border-pink-500/20 gap-0.5" title={`${player.unicorns} Unicorns`}>
                             <Sparkles className="w-3 h-3" /> {player.unicorns}
                         </div>
                    )}
                </div>
                {leaderboardMode === 'leaderboard' && (
                    <div className="hidden md:flex gap-2 mt-0.5 text-2xs text-slate-500">
                        <span><span className="text-green-400">{player.wins}W</span> <span className="text-red-400">{player.losses}L</span></span>
                        {isPositionMode && (
                            <span className="hidden lg:flex gap-1.5 font-mono">
                                <span className="flex items-center gap-0.5"><Sword className="w-2 h-2"/> {player.attackPlayed}</span>
                                <span className="flex items-center gap-0.5"><Shield className="w-2 h-2"/> {player.defensePlayed}</span>
                            </span>
                        )}
                    </div>
                )}
              </div>

              <div className="text-right flex flex-col items-end gap-0.5">
                {leaderboardMode === 'leaderboard' ? (
                  <div className={`text-fluid-sm sm:text-fluid-base md:text-fluid-lg lg:text-fluid-xl font-black tabular-nums leading-none font-mono transition-all duration-300 ${
                    isNewLeader ? 'text-amber-400 scale-110' : 'text-foos-accent'
                  }`}>{player.points}</div>
                ) : (
                  <div className="text-fluid-sm md:text-fluid-base font-bold text-slate-400 tabular-nums leading-none font-mono">{player.gamesPlayed} <span className="text-2xs md:text-fluid-xs text-slate-600">games</span></div>
                )}

                <div onClick={(e) => e.stopPropagation()} className="hidden lg:block">
                    <button
                        onClick={() => onTogglePlayerAvailability(player.id)}
                        className={`p-2 rounded-full transition ${player.isAvailable ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700'}`}
                        title={player.isAvailable ? "Available to play" : "Unavailable (Away)"}
                    >
                        <Power className="w-3.5 h-3.5" />
                    </button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-foos-dark">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-foos-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-foos-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Header */}
        <div className="p-2 sm:p-3 md:p-4 flex justify-between items-center z-10 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm h-14 sm:h-16 md:h-20">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={onBackToLobby}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-button transition active:scale-95"
              title="Back to Lobby"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Logo" className="h-8 sm:h-10 md:h-12 object-contain rounded-lg hidden xs:block" />
            <div className="flex flex-col">
              <h1 className="text-fluid-sm sm:text-fluid-base md:text-fluid-lg font-black text-white truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px] md:max-w-[240px]">{tournamentName}</h1>
              <div className="flex gap-2">
                <span className="text-2xs md:text-fluid-xs font-bold uppercase tracking-wider text-slate-500">{totalGames} matches</span>
                <span className="text-2xs md:text-fluid-xs font-bold uppercase tracking-wider text-slate-500">{totalGoals} goals</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
              {/* Edit Roster Button */}
              <button
                onClick={onEditRoster}
                className="flex items-center gap-1 md:gap-2 text-slate-400 hover:text-white transition bg-slate-800 hover:bg-slate-700 px-2 md:px-3 py-2 rounded-button border border-slate-700 active:scale-95"
                title="Edit Roster"
              >
                <UserPlus className="w-4 h-4" />
                <span className="text-fluid-xs font-bold uppercase tracking-wide hidden lg:block">Roster</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setShowOptionsModal(true)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-button border transition bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95"
                title="Tournament Options"
              >
                  <Settings className="w-4 h-4" />
                  <span className="text-fluid-xs font-bold uppercase tracking-wide hidden lg:block">Options</span>
              </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative z-10">
            {/* Action & Schedule Area */}
            <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col gap-4 md:gap-6 lg:gap-8 overflow-y-auto">

                {/* HERO ACTION */}
                <div className="flex flex-col items-center justify-center">
                    <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-[1px] rounded-card-lg md:rounded-2xl lg:rounded-3xl shadow-2xl shadow-black/50 max-w-lg xl:max-w-2xl 2xl:max-w-3xl w-full">
                        <div className="bg-foos-dark rounded-[calc(1rem-1px)] md:rounded-[calc(1rem-1px)] lg:rounded-[23px] p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 flex flex-col items-center text-center border border-white/5">
                            {scheduledMatches.length > 0 ? (
                                <>
                                    <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-foos-accent/10 rounded-full flex items-center justify-center mb-3 md:mb-4 animate-pulse-slow ring-1 ring-foos-accent/30">
                                        <CalendarClock className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-foos-accent" />
                                    </div>
                                    <h3 className="text-fluid-lg md:text-fluid-xl font-black text-white mb-1 uppercase italic tracking-wide">Queue Active</h3>
                                    <p className="text-slate-500 text-fluid-sm mb-4 md:mb-6 font-medium">
                                        <span className="text-foos-brand font-bold">{scheduledMatches.length}</span> matches scheduled.
                                    </p>
                                    <button
                                        onClick={onStartMatch}
                                        disabled={!canStartMatch}
                                        className="w-full bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-fluid-base md:text-fluid-lg lg:text-fluid-xl py-3 md:py-4 rounded-button shadow-button-brand transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide mb-3 md:mb-4"
                                    >
                                        <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /> Play Next
                                    </button>
                                    <button
                                        onClick={() => setShowCancelRoundConfirm(true)}
                                        className="text-slate-500 hover:text-red-400 text-2xs md:text-fluid-xs font-bold uppercase tracking-widest transition flex items-center gap-2"
                                    >
                                        <X className="w-3 h-3 md:w-4 md:h-4" /> Cancel Round
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Header with refresh button */}
                                    <div className="flex items-center justify-between w-full mb-3 md:mb-4 xl:mb-6">
                                        <h3 className="text-fluid-base md:text-fluid-lg xl:text-fluid-xl font-black text-white uppercase italic tracking-wide">Next Match</h3>
                                        <button
                                            onClick={handleRefreshPreview}
                                            disabled={!canStartMatch}
                                            className="p-2 xl:p-3 text-slate-500 hover:text-foos-accent hover:bg-slate-800 rounded-button transition disabled:opacity-50 active:scale-95"
                                            title="Shuffle players"
                                        >
                                            <RefreshCw className="w-4 h-4 xl:w-5 xl:h-5" />
                                        </button>
                                    </div>

                                    {/* Match Preview */}
                                    {previewMatch && canStartMatch ? (
                                        <div className="w-full mb-4 md:mb-6 xl:mb-8">
                                            <div className="flex items-center justify-between gap-4 md:gap-6 xl:gap-10">
                                                {/* Team 1 */}
                                                <div className="flex-1 flex flex-col items-center gap-2 md:gap-3 xl:gap-4">
                                                    <div className="text-2xs md:text-fluid-xs xl:text-fluid-sm font-bold text-foos-blue uppercase tracking-wider">Blue</div>
                                                    <div className="flex flex-col gap-2 xl:gap-3">
                                                        {[previewMatch.team1.attackerId, previewMatch.team1.defenderId].map((playerId, idx) => {
                                                            const player = players.find(p => p.id === playerId);
                                                            return (
                                                                <div key={playerId} className="flex items-center gap-2 md:gap-3 xl:gap-4">
                                                                    <div className="w-8 h-8 md:w-10 md:h-10 xl:w-14 xl:h-14 rounded-full bg-slate-800 overflow-hidden border-2 xl:border-3 border-foos-blue/50 flex-shrink-0">
                                                                        {player?.photoUrl ? (
                                                                            <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-2xs xl:text-fluid-sm font-bold text-slate-500">{player?.nickname.charAt(0)}</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-left min-w-0">
                                                                        <div className="text-fluid-xs md:text-fluid-sm xl:text-fluid-base font-bold text-slate-200 truncate max-w-[60px] md:max-w-[80px] xl:max-w-[140px]">{player?.nickname}</div>
                                                                        <div className="text-2xs xl:text-fluid-xs text-slate-500 flex items-center gap-1">
                                                                            {isPositionMode && <span className="uppercase">{idx === 0 ? 'ATK' : 'DEF'}</span>}
                                                                            {isPositionMode && <span className="hidden md:inline">·</span>}
                                                                            <span className="hidden md:inline"><span className="text-green-400">{player?.wins ?? 0}W</span> <span className="text-red-400">{player?.losses ?? 0}L</span></span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* VS */}
                                                <div className="text-slate-700 font-black text-fluid-sm md:text-fluid-base xl:text-fluid-xl">VS</div>

                                                {/* Team 2 */}
                                                <div className="flex-1 flex flex-col items-center gap-2 md:gap-3 xl:gap-4">
                                                    <div className="text-2xs md:text-fluid-xs xl:text-fluid-sm font-bold text-foos-red uppercase tracking-wider">Red</div>
                                                    <div className="flex flex-col gap-2 xl:gap-3">
                                                        {[previewMatch.team2.attackerId, previewMatch.team2.defenderId].map((playerId, idx) => {
                                                            const player = players.find(p => p.id === playerId);
                                                            return (
                                                                <div key={playerId} className="flex items-center gap-2 md:gap-3 xl:gap-4 flex-row-reverse">
                                                                    <div className="w-8 h-8 md:w-10 md:h-10 xl:w-14 xl:h-14 rounded-full bg-slate-800 overflow-hidden border-2 xl:border-3 border-foos-red/50 flex-shrink-0">
                                                                        {player?.photoUrl ? (
                                                                            <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-2xs xl:text-fluid-sm font-bold text-slate-500">{player?.nickname.charAt(0)}</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right min-w-0">
                                                                        <div className="text-fluid-xs md:text-fluid-sm xl:text-fluid-base font-bold text-slate-200 truncate max-w-[60px] md:max-w-[80px] xl:max-w-[140px]">{player?.nickname}</div>
                                                                        <div className="text-2xs xl:text-fluid-xs text-slate-500 flex items-center justify-end gap-1">
                                                                            <span className="hidden md:inline"><span className="text-green-400">{player?.wins ?? 0}W</span> <span className="text-red-400">{player?.losses ?? 0}L</span></span>
                                                                            {isPositionMode && <span className="hidden md:inline">·</span>}
                                                                            {isPositionMode && <span className="uppercase">{idx === 0 ? 'ATK' : 'DEF'}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-fluid-xs md:text-fluid-sm mb-4 md:mb-6">
                                            {canStartMatch ? 'Generating match...' : 'Need more players'}
                                        </p>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 md:gap-3 xl:gap-4 w-full">
                                        <button
                                            onClick={() => previewMatch ? onStartMatch(previewMatch) : onStartMatch()}
                                            disabled={!canStartMatch || !previewMatch}
                                            className="w-full bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-fluid-sm md:text-fluid-lg xl:text-fluid-xl py-3 md:py-4 xl:py-5 rounded-button xl:rounded-card shadow-button-brand transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 xl:gap-3 uppercase tracking-wide disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            <Play className="w-4 h-4 md:w-5 md:h-5 xl:w-6 xl:h-6 fill-current" /> Start Match
                                        </button>
                                        <button
                                            onClick={onGenerateRound}
                                            disabled={!canStartMatch}
                                            className="text-slate-500 hover:text-foos-accent hover:bg-slate-800/50 py-2 md:py-3 xl:py-4 rounded-button text-2xs md:text-fluid-xs xl:text-fluid-sm font-bold uppercase tracking-widest transition flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-3 h-3 xl:w-4 xl:h-4" /> Final Round (Batch)
                                        </button>
                                    </div>
                                </>
                            )}

                            {!canStartMatch && (
                                <p className="text-2xs md:text-fluid-xs text-red-400 mt-3 md:mt-4 font-bold bg-red-400/10 px-2 md:px-3 py-1 rounded-button">Need at least 4 available players.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile History Button */}
                <button
                    onClick={() => setShowHistory(true)}
                    className="lg:hidden flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-button py-2.5 px-4 text-fluid-xs font-bold uppercase tracking-wider transition mx-auto active:scale-95"
                >
                    <History className="w-4 h-4" />
                    View Match History
                </button>

                {/* SCHEDULE LIST */}
                {scheduledMatches.length > 0 && (
                     <div className="max-w-3xl w-full mx-auto">
                        <h3 className="text-slate-500 font-bold uppercase text-2xs md:text-fluid-xs tracking-wider flex items-center gap-2 mb-2 md:mb-3">
                            <List className="w-3 h-3 md:w-4 md:h-4" /> Upcoming Schedule
                        </h3>
                        <div className="space-y-1.5 md:space-y-2">
                            {scheduledMatches.map((match, i) => {
                                const names1 = getTeamNames(match.team1);
                                const names2 = getTeamNames(match.team2);
                                return (
                                    <div key={match.id} className="bg-slate-900/80 border border-slate-800 rounded-card p-2 md:p-3 flex items-center justify-between hover:border-slate-700 transition">
                                        <div className="text-slate-600 font-mono text-2xs md:text-fluid-xs font-bold w-6 md:w-8">#{i+1}</div>
                                        <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-center px-2 md:px-4 gap-0.5 md:gap-0">
                                            <div className="text-fluid-xs md:text-fluid-sm font-bold text-foos-blue truncate max-w-[100px] md:max-w-none">
                                                {isPositionMode ? `${names1.p1}/${names1.p2}` : `${names1.p1} & ${names1.p2}`}
                                            </div>
                                            <div className="text-2xs text-slate-700 font-bold hidden md:block px-2">VS</div>
                                            <div className="text-fluid-xs md:text-fluid-sm font-bold text-foos-red md:text-right truncate max-w-[100px] md:max-w-none">
                                                {isPositionMode ? `${names2.p1}/${names2.p2}` : `${names2.p1} & ${names2.p2}`}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                )}

            </div>

            {/* Recent History Sidebar - Hidden on smaller screens */}
            <div className="hidden lg:flex w-[220px] xl:w-[280px] 2xl:w-[320px] border-l border-slate-800 bg-slate-900/30 p-3 xl:p-4 flex-col flex-shrink-0">
                 <div className="flex justify-between items-center mb-3 xl:mb-4">
                    <h3 className="text-slate-500 font-bold uppercase text-fluid-xs tracking-wider flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Recent Results
                    </h3>
                    <button onClick={() => setShowHistory(true)} className="text-fluid-xs text-foos-brand hover:text-orange-300 font-bold uppercase tracking-wider">
                        View All
                    </button>
                </div>

                <div className="space-y-2 xl:space-y-3 overflow-y-auto flex-1">
                    {recentMatches.map(match => {
                        const t1Win = match.winner === 'team1';
                        const names1 = getTeamNames(match.team1);
                        const names2 = getTeamNames(match.team2);
                        const isUnicorn = match.team1.score === 0 || match.team2.score === 0;

                        return (
                            <div key={match.id} onClick={() => setShowHistory(true)} className="bg-slate-900 rounded-card p-2.5 xl:p-3 border border-slate-800 cursor-pointer hover:border-slate-600 hover:shadow-card-hover transition group relative overflow-hidden">
                                {isUnicorn && (
                                    <div className="absolute top-0 right-0 bg-pink-500 text-2xs font-bold px-1.5 py-0.5 text-white rounded-bl-md z-10 shadow-lg shadow-pink-500/50">
                                        UNICORN
                                    </div>
                                )}
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-mono text-fluid-lg xl:text-fluid-xl font-bold flex items-center gap-1">
                                         <span className={t1Win ? 'text-foos-blue drop-shadow-md' : 'text-slate-700'}>{match.team1.score}</span>
                                         <span className="text-slate-700 text-fluid-sm">:</span>
                                         <span className={!t1Win ? 'text-foos-red drop-shadow-md' : 'text-slate-700'}>{match.team2.score}</span>
                                    </div>
                                    <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider">
                                        {t1Win ? 'Blue' : 'Red'}
                                    </div>
                                </div>
                                <div className="text-fluid-xs space-y-1">
                                    <div className={`flex justify-between ${t1Win ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <span className="font-bold">Blue</span>
                                        <span className="truncate max-w-[100px] xl:max-w-[140px]">{isPositionMode ? `${names1.p1}/${names1.p2}` : `${names1.p1} & ${names1.p2}`}</span>
                                    </div>
                                    <div className={`flex justify-between ${!t1Win ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <span className="font-bold">Red</span>
                                        <span className="truncate max-w-[100px] xl:max-w-[140px]">{isPositionMode ? `${names2.p1}/${names2.p2}` : `${names2.p1} & ${names2.p2}`}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {recentMatches.length === 0 && (
                        <div className="text-center text-slate-700 italic py-4 text-fluid-sm">
                            No matches played yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Cancel Round Confirmation Modal */}
      {showCancelRoundConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-foos-panel border border-slate-700 rounded-card-lg w-full max-w-sm p-6 shadow-modal">
                 <div className="flex flex-col items-center text-center">
                     <div className="w-14 h-14 md:w-16 md:h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                         <AlertTriangle className="w-7 h-7 md:w-8 md:h-8" />
                     </div>
                     <h2 className="text-fluid-lg md:text-fluid-xl font-black text-white mb-2 uppercase italic">Cancel Round?</h2>
                     <p className="text-slate-400 text-fluid-sm mb-6">
                         This will clear <span className="text-white font-bold">{scheduledMatches.length}</span> scheduled matches from the queue. You cannot undo this.
                     </p>
                     <div className="flex gap-3 w-full">
                         <button
                             onClick={() => setShowCancelRoundConfirm(false)}
                             className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-button transition active:scale-95"
                         >
                             Keep Round
                         </button>
                         <button
                             onClick={handleConfirmCancelRound}
                             className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-button transition shadow-lg shadow-red-500/20 active:scale-95"
                         >
                             Cancel It
                         </button>
                     </div>
                 </div>
             </div>
        </div>
      )}

      {/* Player Stats Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlayer(null)}>
            <div className="bg-foos-panel border border-slate-700 rounded-card-lg w-full max-w-md landscape:max-w-2xl overflow-hidden shadow-modal transform scale-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Landscape: side-by-side layout, Portrait: stacked layout */}
                <div className="landscape:flex landscape:flex-row">
                    {/* Header with avatar */}
                    <div className="relative h-32 landscape:h-auto landscape:w-56 landscape:min-h-[280px] landscape:flex-shrink-0 bg-gradient-to-br from-slate-900 to-black">
                        <div className="absolute inset-0 bg-foos-brand/10"></div>
                        {/* Portrait: anchor from top, Landscape: center in panel */}
                        <div className="absolute portrait:top-4 portrait:left-1/2 portrait:-translate-x-1/2 landscape:inset-0 landscape:flex landscape:items-center landscape:justify-center">
                            <div
                                className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 bg-slate-800 overflow-hidden shadow-xl cursor-pointer transition relative group ${
                                  isGenerating(selectedPlayer.id) ? 'border-foos-brand animate-pulse' : 'border-foos-panel hover:border-foos-accent'
                                }`}
                                onClick={() => {
                                    const gp = globalPlayers.find(g => g.id === selectedPlayer.id);
                                    if (gp) setEditingAvatarPlayer(gp);
                                }}
                                title="Edit avatar"
                            >
                                {selectedPlayer.photoUrl ? (
                                    <img src={selectedPlayer.photoUrl} alt={selectedPlayer.nickname} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-fluid-xl font-bold text-slate-500">{selectedPlayer.nickname.charAt(0)}</div>
                                )}
                                {!isGenerating(selectedPlayer.id) && (
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-full">
                                      <Camera className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                  </div>
                                )}
                                {isGenerating(selectedPlayer.id) && (
                                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-foos-brand rounded-full flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white animate-spin" />
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="pt-12 md:pt-14 landscape:pt-4 pb-5 md:pb-6 landscape:pb-4 px-4 md:px-6 landscape:px-4 text-center landscape:text-left bg-foos-panel landscape:flex-1 relative">
                        {/* Close button - always in content area */}
                        <button onClick={() => setSelectedPlayer(null)} className="absolute top-2 right-2 text-white/50 hover:text-white z-10 p-1"><X className="w-5 h-5 md:w-6 md:h-6"/></button>

                        <div className="landscape:flex landscape:items-center landscape:justify-between landscape:mb-4">
                            <div>
                                <h2 className="text-fluid-xl md:text-fluid-2xl landscape:text-fluid-xl font-black text-white mb-1 uppercase italic tracking-tight">{selectedPlayer.nickname}</h2>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foos-brand/10 text-foos-brand text-fluid-sm font-bold border border-foos-brand/20 mb-4 landscape:mb-0">
                                    <Crown className="w-4 h-4" /> {selectedPlayer.points} Points
                                </div>
                            </div>
                        </div>

                        {/* Tab Bar */}
                        <div className="flex gap-1 mb-4 border-b border-slate-800">
                            <button
                                onClick={() => setPlayerModalTab('stats')}
                                className={`px-3 md:px-4 py-2 font-bold text-fluid-xs uppercase tracking-wider transition border-b-2 -mb-px ${
                                    playerModalTab === 'stats'
                                        ? 'text-foos-accent border-foos-accent'
                                        : 'text-slate-500 border-transparent hover:text-slate-300'
                                }`}
                            >
                                Stats
                            </button>
                            <button
                                onClick={() => setPlayerModalTab('history')}
                                className={`px-3 md:px-4 py-2 font-bold text-fluid-xs uppercase tracking-wider transition border-b-2 -mb-px ${
                                    playerModalTab === 'history'
                                        ? 'text-foos-accent border-foos-accent'
                                        : 'text-slate-500 border-transparent hover:text-slate-300'
                                }`}
                            >
                                History
                            </button>
                        </div>

                        {/* Stats Tab Content */}
                        {playerModalTab === 'stats' && (
                            <>
                                <div className="grid grid-cols-3 gap-2 md:gap-3 landscape:gap-2 mb-4 landscape:mb-3">
                                     <div className="bg-slate-900 p-2 md:p-2.5 landscape:p-2 rounded-card border border-slate-800">
                                         <div className="text-slate-500 text-2xs font-bold uppercase mb-1 tracking-wider">Win Rate</div>
                                         <div className="text-fluid-base md:text-fluid-lg landscape:text-fluid-base font-bold text-white">
                                             {selectedPlayer.gamesPlayed > 0 ? Math.round((selectedPlayer.wins / selectedPlayer.gamesPlayed) * 100) : 0}%
                                         </div>
                                     </div>
                                     <div className="bg-slate-900 p-2 md:p-2.5 landscape:p-2 rounded-card border border-slate-800">
                                         <div className="text-slate-500 text-2xs font-bold uppercase mb-1 tracking-wider">Unicorns</div>
                                         <div className="text-fluid-base md:text-fluid-lg landscape:text-fluid-base font-bold text-pink-400 flex justify-center items-center gap-1">
                                            <Sparkles className="w-4 h-4" /> {selectedPlayer.unicorns}
                                         </div>
                                     </div>
                                     <div className="bg-slate-900 p-2 md:p-2.5 landscape:p-2 rounded-card border border-slate-800">
                                         <div className="text-slate-500 text-2xs font-bold uppercase mb-1 tracking-wider">Matches</div>
                                         <div className="text-fluid-base md:text-fluid-lg landscape:text-fluid-base font-bold text-white">{selectedPlayer.gamesPlayed}</div>
                                     </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 md:gap-3 landscape:gap-2 mb-4 landscape:mb-3">
                                    <div className="text-left bg-slate-900 p-2 md:p-2.5 landscape:p-2 rounded-card border border-slate-800">
                                        <h4 className="text-2xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">POSITIONS</h4>
                                        <div className="space-y-0.5 text-fluid-sm landscape:text-fluid-xs">
                                            <div className="flex justify-between text-slate-300"><span>Attack:</span> <span className="font-mono text-white">{selectedPlayer.attackPlayed}</span></div>
                                            <div className="flex justify-between text-slate-300"><span>Defense:</span> <span className="font-mono text-white">{selectedPlayer.defensePlayed}</span></div>
                                        </div>
                                    </div>
                                    <div className="text-left bg-slate-900 p-2 md:p-2.5 landscape:p-2 rounded-card border border-slate-800">
                                        <h4 className="text-2xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">GOALS</h4>
                                        <div className="space-y-0.5 text-fluid-sm landscape:text-fluid-xs">
                                            <div className="flex justify-between text-slate-300"><span>Scored:</span> <span className="font-mono text-foos-accent">{selectedPlayer.goalsScored}</span></div>
                                            <div className="flex justify-between text-slate-300"><span>Conceded:</span> <span className="font-mono text-foos-red">{selectedPlayer.goalsConceded}</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Availability Toggle */}
                                <button
                                    onClick={() => {
                                        onTogglePlayerAvailability(selectedPlayer.id);
                                        // Update the local state to reflect the change
                                        setSelectedPlayer({...selectedPlayer, isAvailable: !selectedPlayer.isAvailable});
                                    }}
                                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-button font-bold text-fluid-sm uppercase tracking-wide transition active:scale-95 ${
                                        selectedPlayer.isAvailable
                                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}
                                >
                                    <Power className="w-4 h-4" />
                                    {selectedPlayer.isAvailable ? 'Mark as Away' : 'Mark as Available'}
                                </button>
                            </>
                        )}

                        {/* History Tab Content */}
                        {playerModalTab === 'history' && (
                            <div className="max-h-[300px] overflow-y-auto space-y-2">
                                {getPlayerMatches(selectedPlayer.id).length === 0 ? (
                                    <div className="text-center text-slate-500 py-8 text-fluid-sm">
                                        No matches played yet.
                                    </div>
                                ) : (
                                    getPlayerMatches(selectedPlayer.id).map(match => {
                                        const isTeam1 = match.team1.attackerId === selectedPlayer.id || match.team1.defenderId === selectedPlayer.id;
                                        const playerTeam = isTeam1 ? match.team1 : match.team2;
                                        const opponentTeam = isTeam1 ? match.team2 : match.team1;
                                        const isWinner = (isTeam1 && match.winner === 'team1') || (!isTeam1 && match.winner === 'team2');
                                        const isAttacker = playerTeam.attackerId === selectedPlayer.id;
                                        const teammateId = isAttacker ? playerTeam.defenderId : playerTeam.attackerId;
                                        const teammate = players.find(p => p.id === teammateId);
                                        const opponent1 = players.find(p => p.id === opponentTeam.attackerId);
                                        const opponent2 = players.find(p => p.id === opponentTeam.defenderId);
                                        const isUnicorn = playerTeam.score === settings.winningScore && opponentTeam.score === 0;

                                        return (
                                            <div key={match.id} className={`bg-slate-900 rounded-card p-2.5 md:p-3 border ${isWinner ? 'border-emerald-500/30' : 'border-slate-800'} text-left relative`}>
                                                {isUnicorn && (
                                                    <div className="absolute top-1 right-1 text-pink-400">
                                                        <Sparkles className="w-3 h-3" />
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isWinner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {isWinner ? 'WIN' : 'LOSS'}
                                                    </span>
                                                    <span className="text-fluid-base md:text-fluid-lg font-black tabular-nums font-mono">
                                                        <span className={isWinner ? 'text-emerald-400' : 'text-slate-500'}>{playerTeam.score}</span>
                                                        <span className="text-slate-600 mx-1">-</span>
                                                        <span className={!isWinner ? 'text-red-400' : 'text-slate-500'}>{opponentTeam.score}</span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-fluid-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-500">With:</span>
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                                {teammate?.photoUrl ? (
                                                                    <img src={teammate.photoUrl} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-2xs">{teammate?.nickname.charAt(0)}</div>
                                                                )}
                                                            </div>
                                                            <span className="text-slate-300 font-medium">{teammate?.nickname}</span>
                                                        </div>
                                                    </div>
                                                    {isPositionMode && (
                                                        <span className="text-2xs text-slate-500 uppercase">{isAttacker ? 'ATK' : 'DEF'}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-fluid-xs">
                                                    <span className="text-slate-500">vs:</span>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                            {opponent1?.photoUrl ? (
                                                                <img src={opponent1.photoUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-2xs">{opponent1?.nickname.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                            {opponent2?.photoUrl ? (
                                                                <img src={opponent2.photoUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-2xs">{opponent2?.nickname.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <span className="text-slate-300 font-medium">{opponent1?.nickname} & {opponent2?.nickname}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Match History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-10" onClick={() => setShowHistory(false)}>
            <div className="bg-foos-panel border border-slate-700 rounded-card-lg w-full max-w-5xl h-full flex flex-col shadow-modal" onClick={e => e.stopPropagation()}>
                <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h2 className="text-fluid-xl md:text-fluid-2xl font-black text-white flex items-center gap-2 md:gap-3 uppercase italic">
                        <History className="w-5 h-5 md:w-6 md:h-6 text-foos-brand" />
                        History
                    </h2>
                    <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-800 rounded-button transition active:scale-95"><X className="w-5 h-5 md:w-6 md:h-6 text-slate-400"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-foos-panel">
                    <div className="space-y-3 md:space-y-4">
                        {completedMatches.map(match => {
                            const t1Win = match.winner === 'team1';
                            const isUnicorn = match.team1.score === 0 || match.team2.score === 0;

                            const renderPlayer = (id: string, role: 'Att' | 'Def') => {
                                const p = players.find(pl => pl.id === id);
                                return (
                                    <div className="flex items-center gap-2 min-w-[100px] md:min-w-[140px]">
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                            {p?.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-2xs">{p?.nickname.charAt(0)}</div>}
                                        </div>
                                        <div className="text-fluid-sm">
                                            <div className="font-bold leading-none text-slate-200">{p?.nickname}</div>
                                            <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider">{role}</div>
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div key={match.id} className="bg-slate-900 rounded-card p-3 md:p-4 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 relative overflow-hidden">
                                    {isUnicorn && <div className="absolute top-2 md:top-3 left-1/2 -translate-x-1/2 bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 md:px-3 py-0.5 rounded-full text-2xs font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(236,72,153,0.3)]"><Sparkles className="w-3 h-3"/> UNICORN MATCH</div>}

                                    {/* Team 1 */}
                                    <div className={`flex flex-col gap-1.5 md:gap-2 ${t1Win ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                        <div className="text-foos-blue text-2xs md:text-fluid-xs font-black uppercase mb-0.5 md:mb-1 tracking-widest">BLUE TEAM</div>
                                        {renderPlayer(match.team1.attackerId, 'Att')}
                                        {renderPlayer(match.team1.defenderId, 'Def')}
                                    </div>

                                    {/* Score */}
                                    <div className="flex items-center gap-4 md:gap-6">
                                        <div className={`text-4xl md:text-5xl font-black tabular-nums font-mono ${t1Win ? 'text-foos-blue drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-slate-700'}`}>{match.team1.score}</div>
                                        <div className="h-10 md:h-12 w-px bg-slate-800"></div>
                                        <div className={`text-4xl md:text-5xl font-black tabular-nums font-mono ${!t1Win ? 'text-foos-red drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-slate-700'}`}>{match.team2.score}</div>
                                    </div>

                                    {/* Team 2 */}
                                    <div className={`flex flex-col gap-1.5 md:gap-2 items-end text-right ${!t1Win ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                        <div className="text-foos-red text-2xs md:text-fluid-xs font-black uppercase mb-0.5 md:mb-1 tracking-widest">RED TEAM</div>
                                        <div className="flex flex-row-reverse items-center gap-2 min-w-[100px] md:min-w-[140px]">
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                {players.find(p => p.id === match.team2.attackerId)?.photoUrl ?
                                                    <img src={players.find(p => p.id === match.team2.attackerId)?.photoUrl || ''} className="w-full h-full object-cover"/> :
                                                    <div className="flex items-center justify-center h-full text-2xs">{players.find(p => p.id === match.team2.attackerId)?.nickname.charAt(0)}</div>}
                                            </div>
                                            <div className="text-fluid-sm">
                                                <div className="font-bold leading-none text-slate-200">{players.find(p => p.id === match.team2.attackerId)?.nickname}</div>
                                                <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider">ATT</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-row-reverse items-center gap-2 min-w-[100px] md:min-w-[140px]">
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                {players.find(p => p.id === match.team2.defenderId)?.photoUrl ?
                                                    <img src={players.find(p => p.id === match.team2.defenderId)?.photoUrl || ''} className="w-full h-full object-cover"/> :
                                                    <div className="flex items-center justify-center h-full text-2xs">{players.find(p => p.id === match.team2.defenderId)?.nickname.charAt(0)}</div>}
                                            </div>
                                            <div className="text-fluid-sm">
                                                <div className="font-bold leading-none text-slate-200">{players.find(p => p.id === match.team2.defenderId)?.nickname}</div>
                                                <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider">DEF</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Avatar Editor Modal */}
      {editingAvatarPlayer && (
        <AvatarEditor
          isOpen={!!editingAvatarPlayer}
          onClose={() => setEditingAvatarPlayer(null)}
          currentImageUrl={editingAvatarPlayer.photoUrl}
          playerNickname={editingAvatarPlayer.nickname}
          playerId={editingAvatarPlayer.id}
          addToast={addToast}
          onSave={(newPhotoUrl) => {
            onUpdatePlayer({ ...editingAvatarPlayer, photoUrl: newPhotoUrl });
            // Update selectedPlayer view if it's the same player
            if (selectedPlayer && selectedPlayer.id === editingAvatarPlayer.id) {
              setSelectedPlayer({ ...selectedPlayer, photoUrl: newPhotoUrl });
            }
            setEditingAvatarPlayer(null);
          }}
        />
      )}

      {/* Options Modal */}
      <OptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        settings={settings}
        onSave={onUpdateSettings}
        hasCompletedMatches={completedMatches.length > 0}
      />

    </div>
  );
};

export default Dashboard;
