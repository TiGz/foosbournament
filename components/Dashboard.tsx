
import React, { useState } from 'react';
import { Player, Match } from '../types';
import { getLeaderboard } from '../services/tournamentLogic';
import { Play, Download, Crown, History, Shield, Sword, Power, Sparkles, X, List, CalendarClock, Zap, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  players: Player[];
  matches: Match[];
  onStartMatch: () => void;
  onGenerateRound: () => void;
  onClearQueue: () => void;
  onExportData: () => void;
  canStartMatch: boolean;
  isPositionMode: boolean;
  onTogglePositionMode: () => void;
  onTogglePlayerAvailability: (id: string) => void;
}

const Dashboard: React.FC<Props> = ({ 
    players, 
    matches, 
    onStartMatch,
    onGenerateRound, 
    onClearQueue,
    onExportData, 
    canStartMatch,
    isPositionMode,
    onTogglePositionMode,
    onTogglePlayerAvailability
}) => {
  const leaderboard = getLeaderboard(players);
  const completedMatches = matches.filter(m => m.status === 'completed').sort((a, b) => b.timestamp - a.timestamp);
  const scheduledMatches = matches.filter(m => m.status === 'scheduled');
  
  const recentMatches = completedMatches.slice(0, 5);
  const totalGames = completedMatches.length;
  const totalGoals = players.reduce((acc, p) => acc + p.goalsScored, 0);

  // Modals state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showCancelRoundConfirm, setShowCancelRoundConfirm] = useState(false);

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
      <div className="w-1/4 min-w-[320px] bg-foos-panel border-r border-slate-800 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foos-gold to-yellow-200 flex items-center gap-2 italic uppercase">
            <Crown className="w-6 h-6 text-foos-gold" />
            Leaderboard
          </h2>
          <p className="text-slate-500 text-xs font-bold tracking-wider mt-1 uppercase">10-0 = Unicorn (Bonus Point)</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {leaderboard.map((player, index) => (
            <div 
              key={player.id} 
              className={`relative flex items-center p-3 rounded-xl border transition-all duration-300 group ${
                !player.isAvailable ? 'opacity-50 grayscale border-slate-800 bg-slate-900' :
                index === 0 
                  ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30 shadow-amber-900/10 shadow-lg' 
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}
            >
               {/* Rank Badge */}
               <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                   !player.isAvailable ? 'bg-slate-800 text-slate-500 border-slate-600' :
                   index === 0 ? 'bg-foos-gold text-slate-900 border-white' : 'bg-slate-800 text-slate-400 border-slate-700'
               }`}>
                   {index + 1}
               </div>

              {/* Avatar - Clickable */}
              <div 
                onClick={() => setSelectedPlayer(player)}
                className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-700 ml-3 flex-shrink-0 bg-slate-800 cursor-pointer hover:scale-105 hover:border-foos-accent transition"
              >
                {player.photoUrl ? (
                    <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">{player.nickname.charAt(0)}</div>
                )}
              </div>
              
              <div className="ml-3 flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                <div className="flex items-center gap-2">
                    <div className={`font-bold truncate text-sm leading-tight ${index===0 ? 'text-foos-gold' : 'text-slate-200'}`}>{player.nickname}</div>
                    {player.unicorns > 0 && (
                         <div className="flex items-center text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full border border-pink-500/20 gap-0.5" title={`${player.unicorns} Unicorns`}>
                             <Sparkles className="w-3 h-3" /> {player.unicorns}
                         </div>
                    )}
                </div>
                {isPositionMode && (
                    <div className="flex gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-0.5"><Sword className="w-2 h-2"/> {player.attackPlayed}</span>
                        <span className="flex items-center gap-0.5"><Shield className="w-2 h-2"/> {player.defensePlayed}</span>
                    </div>
                )}
              </div>
              
              <div className="text-right flex flex-col items-end gap-1">
                <div className="text-xl font-black text-foos-accent tabular-nums leading-none">{player.points}</div>
                
                <div onClick={(e) => e.stopPropagation()}>
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
        <div className="p-4 md:p-6 flex justify-between items-center z-10 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm h-24">
          <div className="flex items-center gap-6">
            <img src="logo.jpeg" alt="Logo" className="h-16 md:h-20 object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
            <div className="flex flex-col justify-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-500">Matches: {totalGames}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-500">Goals: {totalGoals}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              {/* Position Mode Toggle */}
              <button 
                onClick={onTogglePositionMode}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition ${
                    isPositionMode 
                    ? 'bg-foos-accent/10 border-foos-accent text-foos-accent' 
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
              >
                  {isPositionMode ? <Shield className="w-4 h-4 fill-current" /> : <Shield className="w-4 h-4" />}
                  <span className="text-xs font-bold uppercase tracking-wide hidden md:block">Positional Mode</span>
                  <div className={`w-2 h-2 rounded-full ml-1 ${isPositionMode ? 'bg-foos-accent shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-600'}`}></div>
              </button>

              <button 
                onClick={onExportData}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg border border-slate-700"
              >
                <Download className="w-4 h-4" />
              </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative z-10">
            {/* Action & Schedule Area */}
            <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto">
                
                {/* HERO ACTION */}
                <div className="flex flex-col items-center justify-center">
                    <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-[1px] rounded-3xl shadow-2xl shadow-black/50 max-w-lg w-full">
                        <div className="bg-foos-dark rounded-[23px] p-8 flex flex-col items-center text-center border border-white/5">
                            {scheduledMatches.length > 0 ? (
                                <>
                                    <div className="w-16 h-16 bg-foos-accent/10 rounded-full flex items-center justify-center mb-4 animate-pulse-slow ring-1 ring-foos-accent/30">
                                        <CalendarClock className="w-8 h-8 text-foos-accent" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-1 uppercase italic tracking-wide">Queue Active</h3>
                                    <p className="text-slate-500 text-sm mb-6 font-medium">
                                        <span className="text-foos-brand font-bold">{scheduledMatches.length}</span> matches scheduled.
                                    </p>
                                    <button 
                                        onClick={onStartMatch}
                                        disabled={!canStartMatch}
                                        className="w-full bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-xl py-4 rounded-xl shadow-lg shadow-orange-500/20 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide mb-4"
                                    >
                                        <Play className="w-6 h-6 fill-current" /> Play Next
                                    </button>
                                    <button
                                        onClick={() => setShowCancelRoundConfirm(true)}
                                        className="text-slate-500 hover:text-red-400 text-xs font-bold uppercase tracking-widest transition flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" /> Cancel Round
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-foos-brand/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-foos-brand/30">
                                        <Zap className="w-8 h-8 text-foos-brand" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2 uppercase italic">Generate Matches</h3>
                                    <p className="text-slate-500 text-sm mb-6">
                                        Ready for the next clash?
                                    </p>
                                    <div className="flex flex-col gap-3 w-full">
                                        <button 
                                            onClick={onStartMatch}
                                            disabled={!canStartMatch}
                                            className="w-full bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-lg py-4 rounded-xl shadow-lg shadow-orange-500/20 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide"
                                        >
                                            <Play className="w-5 h-5 fill-current" /> Generate Single Match
                                        </button>
                                        <button 
                                            onClick={onGenerateRound}
                                            disabled={!canStartMatch}
                                            className="text-slate-500 hover:text-foos-accent hover:bg-slate-800/50 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Generate Final Round (Batch)
                                        </button>
                                    </div>
                                </>
                            )}
                            
                            {!canStartMatch && (
                                <p className="text-xs text-red-400 mt-4 font-bold bg-red-400/10 px-3 py-1 rounded">Need at least 4 available players.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* SCHEDULE LIST */}
                {scheduledMatches.length > 0 && (
                     <div className="max-w-3xl w-full mx-auto">
                        <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider flex items-center gap-2 mb-3">
                            <List className="w-4 h-4" /> Upcoming Schedule
                        </h3>
                        <div className="space-y-2">
                            {scheduledMatches.map((match, i) => {
                                const names1 = getTeamNames(match.team1);
                                const names2 = getTeamNames(match.team2);
                                return (
                                    <div key={match.id} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
                                        <div className="text-slate-600 font-mono text-xs font-bold w-8">#{i+1}</div>
                                        <div className="flex-1 flex justify-between items-center px-4">
                                            <div className="text-sm font-bold text-foos-blue">
                                                {isPositionMode ? `${names1.p1} (A) / ${names1.p2} (D)` : `${names1.p1} & ${names1.p2}`}
                                            </div>
                                            <div className="text-xs text-slate-700 font-bold px-2">VS</div>
                                            <div className="text-sm font-bold text-foos-red text-right">
                                                {isPositionMode ? `${names2.p1} (A) / ${names2.p2} (D)` : `${names2.p1} & ${names2.p2}`}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                     </div>
                )}

            </div>

            {/* Recent History Sidebar */}
            <div className="w-1/4 min-w-[300px] border-l border-slate-800 bg-slate-900/30 p-4 flex flex-col">
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
            <div className="bg-foos-panel border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform scale-100" onClick={e => e.stopPropagation()}>
                <div className="relative h-32 bg-gradient-to-br from-slate-900 to-black">
                    <div className="absolute inset-0 bg-foos-brand/10"></div>
                    <button onClick={() => setSelectedPlayer(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X className="w-6 h-6"/></button>
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                        <div className="w-24 h-24 rounded-full border-4 border-foos-panel bg-slate-800 overflow-hidden shadow-xl">
                            {selectedPlayer.photoUrl ? (
                                <img src={selectedPlayer.photoUrl} alt={selectedPlayer.nickname} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-500">{selectedPlayer.nickname.charAt(0)}</div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="pt-16 pb-8 px-8 text-center bg-foos-panel">
                    <h2 className="text-3xl font-black text-white mb-1 uppercase italic tracking-tight">{selectedPlayer.nickname}</h2>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foos-brand/10 text-foos-brand text-sm font-bold border border-foos-brand/20 mb-6">
                        <Crown className="w-4 h-4" /> {selectedPlayer.points} Points
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                         <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                             <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Win Rate</div>
                             <div className="text-xl font-bold text-white">
                                 {selectedPlayer.gamesPlayed > 0 ? Math.round((selectedPlayer.wins / selectedPlayer.gamesPlayed) * 100) : 0}%
                             </div>
                         </div>
                         <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                             <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Unicorns</div>
                             <div className="text-xl font-bold text-pink-400 flex justify-center items-center gap-1">
                                <Sparkles className="w-4 h-4" /> {selectedPlayer.unicorns}
                             </div>
                         </div>
                         <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                             <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 tracking-wider">Matches</div>
                             <div className="text-xl font-bold text-white">{selectedPlayer.gamesPlayed}</div>
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-left bg-slate-900 p-3 rounded-lg border border-slate-800">
                            <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">POSITIONS</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between text-slate-300"><span>Attack:</span> <span className="font-mono text-white">{selectedPlayer.attackPlayed}</span></div>
                                <div className="flex justify-between text-slate-300"><span>Defense:</span> <span className="font-mono text-white">{selectedPlayer.defensePlayed}</span></div>
                            </div>
                        </div>
                        <div className="text-left bg-slate-900 p-3 rounded-lg border border-slate-800">
                            <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">GOALS</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between text-slate-300"><span>Scored:</span> <span className="font-mono text-foos-accent">{selectedPlayer.goalsScored}</span></div>
                                <div className="flex justify-between text-slate-300"><span>Conceded:</span> <span className="font-mono text-foos-red">{selectedPlayer.goalsConceded}</span></div>
                            </div>
                        </div>
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

    </div>
  );
};

export default Dashboard;
