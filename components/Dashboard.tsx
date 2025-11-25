
import React, { useState, useEffect, useMemo } from 'react';
import { PlayerView, Match, GlobalPlayer, TournamentSettings } from '../types';
import { getLeaderboard, generateNextMatch } from '../services/tournamentLogic';
import { Play, Download, Crown, History, Shield, Sword, Power, Sparkles, X, List, CalendarClock, Zap, AlertTriangle, RefreshCw, ArrowLeft, UserPlus, Camera, Settings, ChevronDown } from 'lucide-react';
import AvatarEditor from './AvatarEditor';
import OptionsModal from './OptionsModal';

interface Props {
  players: PlayerView[];
  globalPlayers: GlobalPlayer[];
  matches: Match[];
  tournamentName: string;
  onStartMatch: (previewMatch?: Match) => void;
  onGenerateRound: () => void;
  onClearQueue: () => void;
  onExportData: () => void;
  onBackToLobby: () => void;
  onEditRoster: () => void;
  onUpdatePlayer: (player: GlobalPlayer) => void;
  canStartMatch: boolean;
  settings: TournamentSettings;
  onUpdateSettings: (settings: TournamentSettings) => void;
  onTogglePlayerAvailability: (id: string) => void;
}

type LeaderboardMode = 'leaderboard' | 'leastPlayed';

const Dashboard: React.FC<Props> = ({
    players,
    globalPlayers,
    matches,
    tournamentName,
    onStartMatch,
    onGenerateRound,
    onClearQueue,
    onExportData,
    onBackToLobby,
    onEditRoster,
    onUpdatePlayer,
    canStartMatch,
    settings,
    onUpdateSettings,
    onTogglePlayerAvailability
}) => {
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

  // Sorted players based on leaderboard mode
  const sortedPlayers = useMemo(() => {
    if (leaderboardMode === 'leastPlayed') {
      return [...players].sort((a, b) => a.gamesPlayed - b.gamesPlayed);
    }
    return getLeaderboard(players);
  }, [players, leaderboardMode]);

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
      <div className="w-[140px] md:w-1/4 md:min-w-[280px] bg-foos-panel border-r border-slate-800 flex flex-col shadow-2xl z-10 flex-shrink-0">
        <div className="p-2 md:p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
          <button
            onClick={() => setLeaderboardMode(prev => prev === 'leaderboard' ? 'leastPlayed' : 'leaderboard')}
            className="flex items-center gap-1 md:gap-2 group w-full"
          >
            <h2 className="text-sm md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foos-gold to-yellow-200 flex items-center gap-1 md:gap-2 italic uppercase">
              <Crown className="w-4 h-4 md:w-5 md:h-5 text-foos-gold" />
              <span className="hidden md:inline">{leaderboardMode === 'leaderboard' ? 'Leaderboard' : 'Least Played'}</span>
              <span className="md:hidden">{leaderboardMode === 'leaderboard' ? 'Ranks' : 'Played'}</span>
            </h2>
            <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-foos-gold/50 group-hover:text-foos-gold transition" />
          </button>
          <p className="text-slate-500 text-[8px] md:text-[10px] font-bold tracking-wider mt-0.5 uppercase hidden md:block">
            {leaderboardMode === 'leaderboard'
              ? `${settings.winningScore}-0 = Unicorn ${settings.unicornBonus > 0 ? `(+${settings.unicornBonus} pt${settings.unicornBonus > 1 ? 's' : ''})` : '(No bonus)'}`
              : 'Sorted by games played'}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-1.5 md:p-3 space-y-1 md:space-y-2">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`relative flex items-center p-1.5 md:p-3 rounded-lg md:rounded-xl border transition-all duration-300 group ${
                !player.isAvailable ? 'opacity-50 grayscale border-slate-800 bg-slate-900' :
                leaderboardMode === 'leaderboard' && index === 0
                  ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30 shadow-amber-900/10 shadow-lg'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}
            >
               {/* Rank Badge (only in leaderboard mode) */}
               {leaderboardMode === 'leaderboard' && (
                 <div className={`absolute -left-1 md:-left-2 top-1/2 -translate-y-1/2 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold border-2 ${
                     !player.isAvailable ? 'bg-slate-800 text-slate-500 border-slate-600' :
                     index === 0 ? 'bg-foos-gold text-slate-900 border-white' : 'bg-slate-800 text-slate-400 border-slate-700'
                 }`}>
                     {index + 1}
                 </div>
               )}

              {/* Avatar - Clickable (hidden on mobile) */}
              <div
                onClick={() => setSelectedPlayer(player)}
                className={`hidden md:flex w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700 flex-shrink-0 bg-slate-800 cursor-pointer hover:scale-105 hover:border-foos-accent transition ${leaderboardMode === 'leaderboard' ? 'ml-3' : 'ml-1'}`}
              >
                {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">{player.nickname.charAt(0)}</div>
                )}
              </div>

              <div className={`flex-1 min-w-0 cursor-pointer ${leaderboardMode === 'leaderboard' ? 'ml-4 md:ml-3' : 'ml-2 md:ml-3'}`} onClick={() => setSelectedPlayer(player)}>
                <div className="flex items-center gap-1 md:gap-2">
                    <div className={`font-bold truncate text-[11px] md:text-sm leading-tight ${leaderboardMode === 'leaderboard' && index===0 ? 'text-foos-gold' : 'text-slate-200'}`}>{player.nickname}</div>
                    {leaderboardMode === 'leaderboard' && player.unicorns > 0 && (
                         <div className="hidden md:flex items-center text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full border border-pink-500/20 gap-0.5" title={`${player.unicorns} Unicorns`}>
                             <Sparkles className="w-3 h-3" /> {player.unicorns}
                         </div>
                    )}
                </div>
                {leaderboardMode === 'leaderboard' && isPositionMode && (
                    <div className="hidden md:flex gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-0.5"><Sword className="w-2 h-2"/> {player.attackPlayed}</span>
                        <span className="flex items-center gap-0.5"><Shield className="w-2 h-2"/> {player.defensePlayed}</span>
                    </div>
                )}
              </div>

              <div className="text-right flex flex-col items-end gap-0.5">
                {leaderboardMode === 'leaderboard' ? (
                  <div className="text-sm md:text-xl font-black text-foos-accent tabular-nums leading-none">{player.points}</div>
                ) : (
                  <div className="text-sm md:text-lg font-bold text-slate-400 tabular-nums leading-none">{player.gamesPlayed} <span className="text-[10px] md:text-xs text-slate-600">games</span></div>
                )}

                <div onClick={(e) => e.stopPropagation()} className="hidden md:block">
                    <button
                        onClick={() => onTogglePlayerAvailability(player.id)}
                        className={`p-1.5 rounded-full transition ${player.isAvailable ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-700'}`}
                        title={player.isAvailable ? "Available to play" : "Unavailable (Away)"}
                    >
                        <Power className="w-3 h-3" />
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative bg-foos-dark">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-foos-brand/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-foos-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Header */}
        <div className="p-2 md:p-4 flex justify-between items-center z-10 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm h-14 md:h-20">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={onBackToLobby}
              className="p-1.5 md:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Back to Lobby"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Logo" className="h-8 md:h-12 object-contain" />
            <div className="flex flex-col">
              <h1 className="text-sm md:text-lg font-black text-white truncate max-w-[120px] md:max-w-[200px]">{tournamentName}</h1>
              <div className="flex gap-2">
                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">{totalGames} matches</span>
                <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500">{totalGoals} goals</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-3">
              {/* Edit Roster Button */}
              <button
                onClick={onEditRoster}
                className="flex items-center gap-1 md:gap-2 text-slate-400 hover:text-white transition bg-slate-800 hover:bg-slate-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-slate-700"
                title="Edit Roster"
              >
                <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide hidden md:block">Roster</span>
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setShowOptionsModal(true)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border transition bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700"
                title="Tournament Options"
              >
                  <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide hidden md:block">Options</span>
              </button>

              <button
                onClick={onExportData}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition bg-slate-800 hover:bg-slate-700 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-slate-700"
                title="Export Data"
              >
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative z-10">
            {/* Action & Schedule Area */}
            <div className="flex-1 p-3 md:p-8 flex flex-col gap-4 md:gap-8 overflow-y-auto">
                
                {/* HERO ACTION */}
                <div className="flex flex-col items-center justify-center">
                    <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-[1px] rounded-2xl md:rounded-3xl shadow-2xl shadow-black/50 max-w-lg w-full">
                        <div className="bg-foos-dark rounded-[15px] md:rounded-[23px] p-4 md:p-8 flex flex-col items-center text-center border border-white/5">
                            {scheduledMatches.length > 0 ? (
                                <>
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-foos-accent/10 rounded-full flex items-center justify-center mb-3 md:mb-4 animate-pulse-slow ring-1 ring-foos-accent/30">
                                        <CalendarClock className="w-6 h-6 md:w-8 md:h-8 text-foos-accent" />
                                    </div>
                                    <h3 className="text-lg md:text-xl font-black text-white mb-1 uppercase italic tracking-wide">Queue Active</h3>
                                    <p className="text-slate-500 text-xs md:text-sm mb-4 md:mb-6 font-medium">
                                        <span className="text-foos-brand font-bold">{scheduledMatches.length}</span> matches scheduled.
                                    </p>
                                    <button
                                        onClick={onStartMatch}
                                        disabled={!canStartMatch}
                                        className="w-full bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-base md:text-xl py-3 md:py-4 rounded-xl shadow-lg shadow-orange-500/20 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide mb-3 md:mb-4"
                                    >
                                        <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /> Play Next
                                    </button>
                                    <button
                                        onClick={() => setShowCancelRoundConfirm(true)}
                                        className="text-slate-500 hover:text-red-400 text-[10px] md:text-xs font-bold uppercase tracking-widest transition flex items-center gap-2"
                                    >
                                        <X className="w-3 h-3 md:w-4 md:h-4" /> Cancel Round
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Header with refresh button */}
                                    <div className="flex items-center justify-between w-full mb-3 md:mb-4">
                                        <h3 className="text-base md:text-lg font-black text-white uppercase italic tracking-wide">Next Match</h3>
                                        <button
                                            onClick={handleRefreshPreview}
                                            disabled={!canStartMatch}
                                            className="p-2 text-slate-500 hover:text-foos-accent hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                                            title="Shuffle players"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Match Preview */}
                                    {previewMatch && canStartMatch ? (
                                        <div className="w-full mb-4 md:mb-6">
                                            <div className="flex items-center justify-between gap-2 md:gap-4">
                                                {/* Team 1 */}
                                                <div className="flex-1 flex flex-col items-center gap-1.5 md:gap-2">
                                                    <div className="text-[10px] md:text-xs font-bold text-foos-blue uppercase tracking-wider">Blue</div>
                                                    <div className="flex flex-col gap-1.5">
                                                        {[previewMatch.team1.attackerId, previewMatch.team1.defenderId].map((playerId, idx) => {
                                                            const player = players.find(p => p.id === playerId);
                                                            return (
                                                                <div key={playerId} className="flex items-center gap-1.5 md:gap-2">
                                                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 overflow-hidden border-2 border-foos-blue/50 flex-shrink-0">
                                                                        {player?.photoUrl ? (
                                                                            <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">{player?.nickname.charAt(0)}</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-left min-w-0">
                                                                        <div className="text-[11px] md:text-xs font-bold text-slate-200 truncate max-w-[60px] md:max-w-[80px]">{player?.nickname}</div>
                                                                        {isPositionMode && (
                                                                            <div className="text-[8px] md:text-[9px] text-slate-500 uppercase">{idx === 0 ? 'ATK' : 'DEF'}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* VS */}
                                                <div className="text-slate-700 font-black text-sm md:text-base">VS</div>

                                                {/* Team 2 */}
                                                <div className="flex-1 flex flex-col items-center gap-1.5 md:gap-2">
                                                    <div className="text-[10px] md:text-xs font-bold text-foos-red uppercase tracking-wider">Red</div>
                                                    <div className="flex flex-col gap-1.5">
                                                        {[previewMatch.team2.attackerId, previewMatch.team2.defenderId].map((playerId, idx) => {
                                                            const player = players.find(p => p.id === playerId);
                                                            return (
                                                                <div key={playerId} className="flex items-center gap-1.5 md:gap-2 flex-row-reverse">
                                                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 overflow-hidden border-2 border-foos-red/50 flex-shrink-0">
                                                                        {player?.photoUrl ? (
                                                                            <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-500">{player?.nickname.charAt(0)}</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right min-w-0">
                                                                        <div className="text-[11px] md:text-xs font-bold text-slate-200 truncate max-w-[60px] md:max-w-[80px]">{player?.nickname}</div>
                                                                        {isPositionMode && (
                                                                            <div className="text-[8px] md:text-[9px] text-slate-500 uppercase">{idx === 0 ? 'ATK' : 'DEF'}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-xs md:text-sm mb-4 md:mb-6">
                                            {canStartMatch ? 'Generating match...' : 'Need more players'}
                                        </p>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 md:gap-3 w-full">
                                        <button
                                            onClick={() => previewMatch ? onStartMatch(previewMatch) : onStartMatch()}
                                            disabled={!canStartMatch || !previewMatch}
                                            className="w-full bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-sm md:text-lg py-3 md:py-4 rounded-xl shadow-lg shadow-orange-500/20 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" /> Start Match
                                        </button>
                                        <button
                                            onClick={onGenerateRound}
                                            disabled={!canStartMatch}
                                            className="text-slate-500 hover:text-foos-accent hover:bg-slate-800/50 py-2 md:py-3 rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Final Round (Batch)
                                        </button>
                                    </div>
                                </>
                            )}

                            {!canStartMatch && (
                                <p className="text-[10px] md:text-xs text-red-400 mt-3 md:mt-4 font-bold bg-red-400/10 px-2 md:px-3 py-1 rounded">Need at least 4 available players.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile History Button */}
                <button
                    onClick={() => setShowHistory(true)}
                    className="md:hidden flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-xs font-bold uppercase tracking-wider transition mx-auto"
                >
                    <History className="w-4 h-4" />
                    View Match History
                </button>

                {/* SCHEDULE LIST */}
                {scheduledMatches.length > 0 && (
                     <div className="max-w-3xl w-full mx-auto">
                        <h3 className="text-slate-500 font-bold uppercase text-[10px] md:text-xs tracking-wider flex items-center gap-2 mb-2 md:mb-3">
                            <List className="w-3 h-3 md:w-4 md:h-4" /> Upcoming Schedule
                        </h3>
                        <div className="space-y-1.5 md:space-y-2">
                            {scheduledMatches.map((match, i) => {
                                const names1 = getTeamNames(match.team1);
                                const names2 = getTeamNames(match.team2);
                                return (
                                    <div key={match.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-2 md:p-3 flex items-center justify-between">
                                        <div className="text-slate-600 font-mono text-[10px] md:text-xs font-bold w-6 md:w-8">#{i+1}</div>
                                        <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-center px-2 md:px-4 gap-0.5 md:gap-0">
                                            <div className="text-[11px] md:text-sm font-bold text-foos-blue truncate max-w-[100px] md:max-w-none">
                                                {isPositionMode ? `${names1.p1}/${names1.p2}` : `${names1.p1} & ${names1.p2}`}
                                            </div>
                                            <div className="text-[10px] text-slate-700 font-bold hidden md:block px-2">VS</div>
                                            <div className="text-[11px] md:text-sm font-bold text-foos-red md:text-right truncate max-w-[100px] md:max-w-none">
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

            {/* Recent History Sidebar - Hidden on mobile */}
            <div className="hidden md:flex w-1/4 min-w-[280px] border-l border-slate-800 bg-slate-900/30 p-4 flex-col">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Recent Results
                    </h3>
                    <button onClick={() => setShowHistory(true)} className="text-xs text-foos-brand hover:text-orange-300 font-bold uppercase tracking-wider">
                        View All
                    </button>
                </div>
                
                <div className="space-y-3 overflow-y-auto flex-1">
                    {recentMatches.map(match => {
                        const t1Win = match.winner === 'team1';
                        const names1 = getTeamNames(match.team1);
                        const names2 = getTeamNames(match.team2);
                        const isUnicorn = match.team1.score === 0 || match.team2.score === 0;

                        return (
                            <div key={match.id} onClick={() => setShowHistory(true)} className="bg-slate-900 rounded-lg p-3 border border-slate-800 cursor-pointer hover:border-slate-600 transition group relative overflow-hidden">
                                {isUnicorn && (
                                    <div className="absolute top-0 right-0 bg-pink-500 text-[8px] font-bold px-1.5 py-0.5 text-white rounded-bl-md z-10 shadow-lg shadow-pink-500/50">
                                        UNICORN
                                    </div>
                                )}
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-mono text-xl font-bold flex items-center gap-1">
                                         <span className={t1Win ? 'text-foos-blue drop-shadow-md' : 'text-slate-700'}>{match.team1.score}</span>
                                         <span className="text-slate-700 text-sm">:</span>
                                         <span className={!t1Win ? 'text-foos-red drop-shadow-md' : 'text-slate-700'}>{match.team2.score}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                        {t1Win ? 'Blue' : 'Red'}
                                    </div>
                                </div>
                                <div className="text-xs space-y-1">
                                    <div className={`flex justify-between ${t1Win ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <span className="font-bold">Blue</span>
                                        <span className="truncate max-w-[120px]">{isPositionMode ? `${names1.p1}/${names1.p2}` : `${names1.p1} & ${names1.p2}`}</span>
                                    </div>
                                    <div className={`flex justify-between ${!t1Win ? 'text-slate-300' : 'text-slate-600'}`}>
                                        <span className="font-bold">Red</span>
                                        <span className="truncate max-w-[120px]">{isPositionMode ? `${names2.p1}/${names2.p2}` : `${names2.p1} & ${names2.p2}`}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {recentMatches.length === 0 && (
                        <div className="text-center text-slate-700 italic py-4 text-sm">
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
             <div className="bg-foos-panel border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-[pulse-slow_0.5s_ease-out]">
                 <div className="flex flex-col items-center text-center">
                     <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                         <AlertTriangle className="w-8 h-8" />
                     </div>
                     <h2 className="text-xl font-black text-white mb-2 uppercase italic">Cancel Round?</h2>
                     <p className="text-slate-400 text-sm mb-6">
                         This will clear <span className="text-white font-bold">{scheduledMatches.length}</span> scheduled matches from the queue. You cannot undo this.
                     </p>
                     <div className="flex gap-3 w-full">
                         <button 
                             onClick={() => setShowCancelRoundConfirm(false)}
                             className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition"
                         >
                             Keep Round
                         </button>
                         <button 
                             onClick={handleConfirmCancelRound}
                             className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-red-500/20"
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
            <div className="bg-foos-panel border border-slate-700 rounded-2xl w-full max-w-md landscape:max-w-2xl overflow-hidden shadow-2xl transform scale-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Landscape: side-by-side layout, Portrait: stacked layout */}
                <div className="landscape:flex landscape:flex-row">
                    {/* Header with avatar */}
                    <div className="relative h-32 landscape:h-auto landscape:w-56 landscape:min-h-[280px] landscape:flex-shrink-0 bg-gradient-to-br from-slate-900 to-black">
                        <div className="absolute inset-0 bg-foos-brand/10"></div>
                        {/* Portrait: anchor from top, Landscape: center in panel */}
                        <div className="absolute portrait:top-4 portrait:left-1/2 portrait:-translate-x-1/2 landscape:inset-0 landscape:flex landscape:items-center landscape:justify-center">
                            <div
                                className="w-24 h-24 rounded-full border-4 border-foos-panel bg-slate-800 overflow-hidden shadow-xl cursor-pointer hover:border-foos-accent transition relative group"
                                onClick={() => {
                                    const gp = globalPlayers.find(g => g.id === selectedPlayer.id);
                                    if (gp) setEditingAvatarPlayer(gp);
                                }}
                                title="Edit avatar"
                            >
                                {selectedPlayer.photoUrl ? (
                                    <img src={selectedPlayer.photoUrl} alt={selectedPlayer.nickname} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-500">{selectedPlayer.nickname.charAt(0)}</div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-full">
                                    <Camera className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="pt-14 landscape:pt-4 pb-6 landscape:pb-4 px-6 landscape:px-4 text-center landscape:text-left bg-foos-panel landscape:flex-1 relative">
                        {/* Close button - always in content area */}
                        <button onClick={() => setSelectedPlayer(null)} className="absolute top-2 right-2 text-white/50 hover:text-white z-10"><X className="w-6 h-6"/></button>

                        <div className="landscape:flex landscape:items-center landscape:justify-between landscape:mb-4">
                            <div>
                                <h2 className="text-2xl landscape:text-xl font-black text-white mb-1 uppercase italic tracking-tight">{selectedPlayer.nickname}</h2>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foos-brand/10 text-foos-brand text-sm font-bold border border-foos-brand/20 mb-4 landscape:mb-0">
                                    <Crown className="w-4 h-4" /> {selectedPlayer.points} Points
                                </div>
                            </div>
                        </div>

                        {/* Tab Bar */}
                        <div className="flex gap-1 mb-4 border-b border-slate-800">
                            <button
                                onClick={() => setPlayerModalTab('stats')}
                                className={`px-4 py-2 font-bold text-xs uppercase tracking-wider transition border-b-2 -mb-px ${
                                    playerModalTab === 'stats'
                                        ? 'text-foos-accent border-foos-accent'
                                        : 'text-slate-500 border-transparent hover:text-slate-300'
                                }`}
                            >
                                Stats
                            </button>
                            <button
                                onClick={() => setPlayerModalTab('history')}
                                className={`px-4 py-2 font-bold text-xs uppercase tracking-wider transition border-b-2 -mb-px ${
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
                                <div className="grid grid-cols-3 gap-3 landscape:gap-2 mb-4 landscape:mb-3">
                                     <div className="bg-slate-900 p-2.5 landscape:p-2 rounded-xl border border-slate-800">
                                         <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Win Rate</div>
                                         <div className="text-lg landscape:text-base font-bold text-white">
                                             {selectedPlayer.gamesPlayed > 0 ? Math.round((selectedPlayer.wins / selectedPlayer.gamesPlayed) * 100) : 0}%
                                         </div>
                                     </div>
                                     <div className="bg-slate-900 p-2.5 landscape:p-2 rounded-xl border border-slate-800">
                                         <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Unicorns</div>
                                         <div className="text-lg landscape:text-base font-bold text-pink-400 flex justify-center items-center gap-1">
                                            <Sparkles className="w-4 h-4" /> {selectedPlayer.unicorns}
                                         </div>
                                     </div>
                                     <div className="bg-slate-900 p-2.5 landscape:p-2 rounded-xl border border-slate-800">
                                         <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Matches</div>
                                         <div className="text-lg landscape:text-base font-bold text-white">{selectedPlayer.gamesPlayed}</div>
                                     </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 landscape:gap-2 mb-4 landscape:mb-3">
                                    <div className="text-left bg-slate-900 p-2.5 landscape:p-2 rounded-lg border border-slate-800">
                                        <h4 className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">POSITIONS</h4>
                                        <div className="space-y-0.5 text-sm landscape:text-xs">
                                            <div className="flex justify-between text-slate-300"><span>Attack:</span> <span className="font-mono text-white">{selectedPlayer.attackPlayed}</span></div>
                                            <div className="flex justify-between text-slate-300"><span>Defense:</span> <span className="font-mono text-white">{selectedPlayer.defensePlayed}</span></div>
                                        </div>
                                    </div>
                                    <div className="text-left bg-slate-900 p-2.5 landscape:p-2 rounded-lg border border-slate-800">
                                        <h4 className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">GOALS</h4>
                                        <div className="space-y-0.5 text-sm landscape:text-xs">
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
                                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wide transition ${
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
                                    <div className="text-center text-slate-500 py-8 text-sm">
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
                                            <div key={match.id} className={`bg-slate-900 rounded-lg p-3 border ${isWinner ? 'border-emerald-500/30' : 'border-slate-800'} text-left relative`}>
                                                {isUnicorn && (
                                                    <div className="absolute top-1 right-1 text-pink-400">
                                                        <Sparkles className="w-3 h-3" />
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isWinner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {isWinner ? 'WIN' : 'LOSS'}
                                                    </span>
                                                    <span className="text-lg font-black tabular-nums">
                                                        <span className={isWinner ? 'text-emerald-400' : 'text-slate-500'}>{playerTeam.score}</span>
                                                        <span className="text-slate-600 mx-1">-</span>
                                                        <span className={!isWinner ? 'text-red-400' : 'text-slate-500'}>{opponentTeam.score}</span>
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-500">With:</span>
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                                {teammate?.photoUrl ? (
                                                                    <img src={teammate.photoUrl} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full text-[8px]">{teammate?.nickname.charAt(0)}</div>
                                                                )}
                                                            </div>
                                                            <span className="text-slate-300 font-medium">{teammate?.nickname}</span>
                                                        </div>
                                                    </div>
                                                    {isPositionMode && (
                                                        <span className="text-[10px] text-slate-500 uppercase">{isAttacker ? 'ATK' : 'DEF'}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs">
                                                    <span className="text-slate-500">vs:</span>
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                            {opponent1?.photoUrl ? (
                                                                <img src={opponent1.photoUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-[8px]">{opponent1?.nickname.charAt(0)}</div>
                                                            )}
                                                        </div>
                                                        <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                            {opponent2?.photoUrl ? (
                                                                <img src={opponent2.photoUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-[8px]">{opponent2?.nickname.charAt(0)}</div>
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
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-10" onClick={() => setShowHistory(false)}>
            <div className="bg-foos-panel border border-slate-700 rounded-2xl w-full max-w-5xl h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 uppercase italic">
                        <History className="w-6 h-6 text-foos-brand" />
                        History
                    </h2>
                    <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-800 rounded-lg transition"><X className="w-6 h-6 text-slate-400"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-foos-panel">
                    <div className="space-y-4">
                        {completedMatches.map(match => {
                            const t1Win = match.winner === 'team1';
                            const isUnicorn = match.team1.score === 0 || match.team2.score === 0;
                            
                            const renderPlayer = (id: string, role: 'Att' | 'Def') => {
                                const p = players.find(pl => pl.id === id);
                                return (
                                    <div className="flex items-center gap-2 min-w-[140px]">
                                        <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                            {p?.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-[10px]">{p?.nickname.charAt(0)}</div>}
                                        </div>
                                        <div className="text-sm">
                                            <div className="font-bold leading-none text-slate-200">{p?.nickname}</div>
                                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{role}</div>
                                        </div>
                                    </div>
                                )
                            }

                            return (
                                <div key={match.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                                    {isUnicorn && <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-pink-500/10 text-pink-400 border border-pink-500/20 px-3 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(236,72,153,0.3)]"><Sparkles className="w-3 h-3"/> UNICORN MATCH</div>}
                                    
                                    {/* Team 1 */}
                                    <div className={`flex flex-col gap-2 ${t1Win ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                        <div className="text-foos-blue text-xs font-black uppercase mb-1 tracking-widest">BLUE TEAM</div>
                                        {renderPlayer(match.team1.attackerId, 'Att')}
                                        {renderPlayer(match.team1.defenderId, 'Def')}
                                    </div>

                                    {/* Score */}
                                    <div className="flex items-center gap-6">
                                        <div className={`text-5xl font-black tabular-nums ${t1Win ? 'text-foos-blue drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'text-slate-700'}`}>{match.team1.score}</div>
                                        <div className="h-12 w-px bg-slate-800"></div>
                                        <div className={`text-5xl font-black tabular-nums ${!t1Win ? 'text-foos-red drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'text-slate-700'}`}>{match.team2.score}</div>
                                    </div>

                                    {/* Team 2 */}
                                    <div className={`flex flex-col gap-2 items-end text-right ${!t1Win ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                        <div className="text-foos-red text-xs font-black uppercase mb-1 tracking-widest">RED TEAM</div>
                                        <div className="flex flex-row-reverse items-center gap-2 min-w-[140px]">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                {players.find(p => p.id === match.team2.attackerId)?.photoUrl ? 
                                                    <img src={players.find(p => p.id === match.team2.attackerId)?.photoUrl || ''} className="w-full h-full object-cover"/> : 
                                                    <div className="flex items-center justify-center h-full text-[10px]">{players.find(p => p.id === match.team2.attackerId)?.nickname.charAt(0)}</div>}
                                            </div>
                                            <div className="text-sm">
                                                <div className="font-bold leading-none text-slate-200">{players.find(p => p.id === match.team2.attackerId)?.nickname}</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">ATT</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-row-reverse items-center gap-2 min-w-[140px]">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                                {players.find(p => p.id === match.team2.defenderId)?.photoUrl ? 
                                                    <img src={players.find(p => p.id === match.team2.defenderId)?.photoUrl || ''} className="w-full h-full object-cover"/> : 
                                                    <div className="flex items-center justify-center h-full text-[10px]">{players.find(p => p.id === match.team2.defenderId)?.nickname.charAt(0)}</div>}
                                            </div>
                                            <div className="text-sm">
                                                <div className="font-bold leading-none text-slate-200">{players.find(p => p.id === match.team2.defenderId)?.nickname}</div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">DEF</div>
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
