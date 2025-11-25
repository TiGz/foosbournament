
import React, { useEffect } from 'react';
import { Match, PlayerView } from '../types';
import { WINNING_SCORE } from '../services/tournamentLogic';
import { Trophy, Minus, Plus, Save, Shield, Sword, XCircle, Undo2, Redo2 } from 'lucide-react';

interface Props {
  match: Match;
  players: PlayerView[];
  onUpdateScore: (team: 'team1' | 'team2', delta: number) => void;
  onFinishMatch: () => void;
  onCancelMatch: () => void;
  isPositionMode: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MatchView: React.FC<Props> = ({ match, players, onUpdateScore, onFinishMatch, onCancelMatch, isPositionMode, onUndo, onRedo, canUndo, canRedo }) => {

  const getPlayer = (id: string) => players.find(p => p.id === id);

  const t1Attacker = getPlayer(match.team1.attackerId);
  const t1Defender = getPlayer(match.team1.defenderId);
  const t2Attacker = getPlayer(match.team2.attackerId);
  const t2Defender = getPlayer(match.team2.defenderId);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Team 1: Left Shift or A
      if (e.code === 'ShiftLeft' || e.code === 'KeyA') onUpdateScore('team1', 1);
      // Team 2: Right Shift or L
      if (e.code === 'ShiftRight' || e.code === 'KeyL') onUpdateScore('team2', 1);
      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }
      // Redo: Cmd/Ctrl + Shift + Z
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && e.shiftKey) {
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUpdateScore, onUndo, onRedo]);

  const isWinner1 = match.team1.score >= WINNING_SCORE;
  const isWinner2 = match.team2.score >= WINNING_SCORE;

  // Render a single player avatar at a specific percentage position
  const renderAvatar = (player: PlayerView | undefined, role: 'Attack' | 'Defense', team: 'Blue' | 'Red') => {
    const isBlue = team === 'Blue';
    const borderColor = isBlue ? 'border-foos-blue' : 'border-foos-red';
    const glowColor = isBlue ? 'shadow-blue-500/50' : 'shadow-red-500/50';
    const labelColor = isBlue ? 'bg-blue-600' : 'bg-red-600';

    // Positioning Logic
    let style: React.CSSProperties = {};

    if (isPositionMode) {
        // Positional Mode: Horizontal alignment (Defense back, Attack forward)
        // Centered vertically (top 50%)
        if (isBlue) {
            style = role === 'Defense'
                ? { left: '10%', top: '50%', transform: 'translate(-50%, -50%)' }
                : { left: '35%', top: '50%', transform: 'translate(-50%, -50%)' };
        } else {
            style = role === 'Defense'
                ? { right: '10%', top: '50%', transform: 'translate(50%, -50%)' }
                : { right: '35%', top: '50%', transform: 'translate(50%, -50%)' };
        }
    } else {
        // Standard Mode: Vertical alignment (Top / Bottom)
        // Aligned horizontally on their side
        if (isBlue) {
            style = role === 'Attack' // Using roles just to map to slot 1/2
                ? { left: '25%', top: '30%', transform: 'translate(-50%, -50%)' }
                : { left: '25%', top: '70%', transform: 'translate(-50%, -50%)' };
        } else {
            style = role === 'Attack'
                ? { right: '25%', top: '30%', transform: 'translate(50%, -50%)' }
                : { right: '25%', top: '70%', transform: 'translate(50%, -50%)' };
        }
    }

    return (
      <div className="absolute z-20 flex flex-col items-center transition-all duration-700 ease-in-out" style={style}>
        <div className="relative group">
            {isPositionMode && (
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm border border-white/20 ${labelColor} text-white`}>
                    {role === 'Attack' ? <Sword className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                    {role === 'Attack' ? 'ATT' : 'DEF'}
                </div>
            )}
            
            <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 ${borderColor} bg-slate-900 overflow-hidden shadow-xl ${glowColor} hover:scale-105 transition-transform duration-300 ring-2 ring-black/50`}>
                {player?.photoUrl ? (
                    <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-500">
                        {player?.nickname.charAt(0)}
                    </div>
                )}
            </div>
        </div>
        
        <div className={`mt-3 px-4 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-center shadow-lg min-w-[120px]`}>
          <div className="font-bold text-white text-lg truncate max-w-[140px]">{player?.nickname}</div>
          <div className="text-xs text-slate-400 mt-1">
            <span className="text-green-400">{player?.wins ?? 0}W</span>
            <span className="mx-1">·</span>
            <span className="text-red-400">{player?.losses ?? 0}L</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 overflow-hidden font-sans">
      
      {/* Top Bar */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 z-30 shadow-2xl relative">
        <button onClick={onCancelMatch} className="text-slate-500 hover:text-white flex items-center gap-2 transition uppercase text-xs font-bold tracking-widest">
            <XCircle className="w-5 h-5" /> Cancel
        </button>
        
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 opacity-50">
             <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Logo" className="h-8 grayscale" />
             <span className="text-slate-600 font-black text-xs tracking-[0.2em] uppercase">Match In Progress</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition ${canUndo ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'}`}
            title="Undo (Cmd+Z)"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition ${canRedo ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'}`}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 className="w-5 h-5" />
          </button>

          <button 
            onClick={onFinishMatch}
            disabled={!isWinner1 && !isWinner2}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm transition uppercase tracking-wide shadow-lg ${
                isWinner1 || isWinner2
                ? 'bg-foos-brand text-white hover:bg-orange-600 shadow-orange-500/20'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
        >
            <Save className="w-4 h-4" /> Save Result
        </button>
        </div>
      </div>

      {/* Main Pitch Area */}
      <div className="flex-1 relative flex overflow-hidden">
        
        {/* TEAM 1 SIDE PANEL (LEFT) */}
        <div className={`w-24 md:w-48 lg:w-64 bg-slate-900 border-r-4 border-slate-800 flex flex-col items-center justify-center relative z-20 transition-colors duration-500 ${isWinner1 ? 'bg-blue-900/20' : ''}`}>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
             
             <div className="mb-8 text-center">
                 <h2 className="text-foos-blue font-black text-3xl tracking-widest mb-2 italic">BLUE</h2>
             </div>

             <div className="flex flex-col items-center gap-4">
                 <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[DEBUG] Team 1 + clicked');
                      onUpdateScore('team1', 1);
                    }}
                    className="w-20 h-20 rounded-2xl bg-foos-blue hover:bg-blue-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition"
                 >
                     <Plus className="w-10 h-10 pointer-events-none" />
                 </button>
                 
                 <div className="text-9xl font-black text-white tabular-nums leading-none select-none py-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                     {match.team1.score}
                 </div>

                 <button 
                    onClick={() => onUpdateScore('team1', -1)}
                    className="w-14 h-14 rounded-xl border-2 border-slate-700 hover:bg-slate-800 text-slate-400 flex items-center justify-center transition"
                 >
                     <Minus className="w-6 h-6" />
                 </button>
             </div>
             
             {isWinner1 && <Trophy className="w-24 h-24 text-foos-gold mt-12 animate-bounce drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]" />}
        </div>

        {/* THE PITCH */}
        <div className="flex-1 relative bg-[#0f5132] overflow-hidden shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]">
             {/* Pitch Texture */}
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]"></div>
             
             {/* Halfway Line */}
             <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/20 transform -translate-x-1/2"></div>
             
             {/* Center Circle */}
             <div className="absolute left-1/2 top-1/2 w-48 h-48 md:w-80 md:h-80 border-4 border-white/20 rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                 <div className="w-3 h-3 bg-white/40 rounded-full"></div>
             </div>

             {/* Goals - 3-sided Box Style */}
             {/* Left Goal (Blue Team) */}
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-16 md:w-24 h-48 md:h-64 border-y-4 border-r-4 border-white/20 bg-white/5 rounded-r-sm"></div>
             
             {/* Right Goal (Red Team) */}
             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 md:w-24 h-48 md:h-64 border-y-4 border-l-4 border-white/20 bg-white/5 rounded-l-sm"></div>

             {/* Rods (Background Decoration only) */}
             <div className="absolute inset-0 flex justify-between px-[10%] pointer-events-none opacity-30">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="w-1 h-full bg-gradient-to-b from-transparent via-slate-400 to-transparent"></div>
                ))}
             </div>

             {/* PLAYERS */}
             {/* Team 1 (Blue) */}
             {renderAvatar(t1Attacker, 'Attack', 'Blue')}
             {renderAvatar(t1Defender, 'Defense', 'Blue')}
             
             {/* Team 2 (Red) */}
             {renderAvatar(t2Attacker, 'Attack', 'Red')}
             {renderAvatar(t2Defender, 'Defense', 'Red')}

             {/* VS Label in Center */}
             <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-10 mix-blend-overlay">
                 <span className="text-[12rem] font-black text-white select-none tracking-tighter">VS</span>
             </div>
        </div>

        {/* TEAM 2 SIDE PANEL (RIGHT) */}
        <div className={`w-24 md:w-48 lg:w-64 bg-slate-900 border-l-4 border-slate-800 flex flex-col items-center justify-center relative z-20 transition-colors duration-500 ${isWinner2 ? 'bg-red-900/20' : ''}`}>
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

             <div className="mb-8 text-center">
                 <h2 className="text-foos-red font-black text-3xl tracking-widest mb-2 italic">RED</h2>
             </div>

             <div className="flex flex-col items-center gap-4">
                 <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[DEBUG] Team 2 + clicked');
                      onUpdateScore('team2', 1);
                    }}
                    className="w-20 h-20 rounded-2xl bg-foos-red hover:bg-red-400 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition"
                 >
                     <Plus className="w-10 h-10 pointer-events-none" />
                 </button>
                 
                 <div className="text-9xl font-black text-white tabular-nums leading-none select-none py-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">
                     {match.team2.score}
                 </div>

                 <button 
                    onClick={() => onUpdateScore('team2', -1)}
                    className="w-14 h-14 rounded-xl border-2 border-slate-700 hover:bg-slate-800 text-slate-400 flex items-center justify-center transition"
                 >
                     <Minus className="w-6 h-6" />
                 </button>
             </div>
             
             {isWinner2 && <Trophy className="w-24 h-24 text-foos-gold mt-12 animate-bounce drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]" />}
        </div>

      </div>
    </div>
  );
};

export default MatchView;
