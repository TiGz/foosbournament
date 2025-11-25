
import React, { useEffect, useState, useCallback } from 'react';
import { Match, PlayerView, TournamentSettings } from '../types';
import { getWinningScore } from '../services/tournamentLogic';
import { Trophy, Minus, Plus, Save, Shield, Sword, XCircle, Undo2, Redo2, Settings, Star, Sparkles } from 'lucide-react';
import OptionsModal from './OptionsModal';

// Sound generation using Web Audio API
const playWinSound = (isUnicorn: boolean) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    if (isUnicorn) {
      // Unicorn sound: Magical ascending arpeggio with sparkle
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5 to G6
      notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.1);
        gainNode.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + i * 0.1 + 0.3) ||
          gainNode.gain.setValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);
        oscillator.start(audioContext.currentTime + i * 0.1);
        oscillator.stop(audioContext.currentTime + i * 0.1 + 0.4);
      });
      // Add shimmer effect
      setTimeout(() => {
        const shimmer = audioContext.createOscillator();
        const shimmerGain = audioContext.createGain();
        shimmer.connect(shimmerGain);
        shimmerGain.connect(audioContext.destination);
        shimmer.type = 'triangle';
        shimmer.frequency.value = 2093; // C7
        shimmerGain.gain.setValueAtTime(0.2, audioContext.currentTime);
        shimmerGain.gain.exponentialDecayTo?.(0.01, audioContext.currentTime + 0.5) ||
          shimmerGain.gain.setValueAtTime(0.01, audioContext.currentTime + 0.5);
        shimmer.start();
        shimmer.stop(audioContext.currentTime + 0.6);
      }, 600);
    } else {
      // Regular win sound: Victory fanfare
      const notes = [392, 523.25, 659.25]; // G4, C5, E5 - Major chord
      notes.forEach((freq, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'square';
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime + i * 0.05);
        gainNode.gain.setValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime + i * 0.05);
        oscillator.stop(audioContext.currentTime + 0.5);
      });
    }
  } catch (e) {
    console.log('Audio not supported');
  }
};

// Speech synthesis using Web Speech API
const speak = (text: string, voiceName?: string) => {
  try {
    // Skip if offline (some voices require network) or speech not supported
    if (!('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel(); // Clear any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Set voice if specified
    if (voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Handle errors silently (e.g., offline mode, voice unavailable)
    utterance.onerror = () => {};

    window.speechSynthesis.speak(utterance);
  } catch {
    // Fail silently - speech is non-critical
  }
};

// Match start announcement templates
const getMatchStartAnnouncement = (
  t1Attacker: string,
  t1Defender: string,
  t2Attacker: string,
  t2Defender: string,
  isPositionMode: boolean
): string => {
  const blue = isPositionMode
    ? `${t1Attacker} on attack and ${t1Defender} on defense`
    : `${t1Attacker} and ${t1Defender}`;
  const red = isPositionMode
    ? `${t2Attacker} on attack and ${t2Defender} on defense`
    : `${t2Attacker} and ${t2Defender}`;

  const templates = [
    `Ladies and gentlemen, it's foosball time! Blue team: ${blue}. Red team: ${red}. Let the spinning begin!`,
    `Welcome to the thunderdome! In the blue corner: ${blue}. In the red corner: ${red}. May the best spinners win!`,
    `Alright folks, prepare for glory! Blue team has ${blue}. Red team has ${red}. Game on!`,
    `The table is set, the rods are ready! Blue: ${blue}. Red: ${red}. Let's get twisty!`,
    `It's showtime! Representing blue: ${blue}. Representing red: ${red}. Time to spin to win!`,
    `Hold onto your handles! Blue team: ${blue}. Red team: ${red}. This is gonna be good!`,
    `The foosball gods demand entertainment! Blue brings ${blue}. Red brings ${red}. Fight!`,
    `Clear the area, champions approaching! Blue: ${blue}. Red: ${red}. Let the battle commence!`,
    `Breaking news: Epic foosball match about to begin! Blue team: ${blue}. Red team: ${red}. Stay tuned!`,
    `Warming up the table for ${blue} in blue versus ${red} in red. Three, two, one, go!`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
};

// Match end announcement templates
const getMatchEndAnnouncement = (
  winnerPlayer1: string,
  winnerPlayer2: string,
  winnerScore: number,
  loserScore: number,
  isUnicorn: boolean
): string => {
  const winners = `${winnerPlayer1} and ${winnerPlayer2}`;
  const score = `${winnerScore} to ${loserScore}`;

  if (isUnicorn) {
    const unicornTemplates = [
      `Unicorn alert! ${winners} just served up a perfect ${winnerScore} to zero shutout! Absolute legends!`,
      `Holy smokes! ${winners} just unicorned their opponents! ${winnerScore} nil! That's gotta hurt!`,
      `A unicorn appears! ${winners} win ${winnerScore} to nothing! Someone call the mercy rule!`,
      `Flawless victory! ${winners} absolutely destroyed the competition! ${winnerScore} zero! Savage!`,
      `Is this even legal? ${winners} just delivered a ${winnerScore} to zero beatdown! Unicorn achieved!`,
      `Witness the unicorn! ${winners} with the perfect game! ${winnerScore} zip! Get rekt!`,
      `Legendary performance! ${winners} score ${winnerScore}, opponents score their dignity: zero!`,
      `Someone check if that was even fair! ${winners} unicorn with ${winnerScore} to absolutely nothing!`,
      `The prophecy is fulfilled! ${winners} with the mystical unicorn! ${winnerScore} nil!`,
      `Emergency! ${winners} just committed foosball murder! ${winnerScore} to zero! No survivors!`,
    ];
    return unicornTemplates[Math.floor(Math.random() * unicornTemplates.length)];
  }

  const regularTemplates = [
    `And that's the game! ${winners} take it ${score}! Well played!`,
    `Victory belongs to ${winners}! Final score: ${score}. What a match!`,
    `Game over! ${winners} emerge victorious, ${score}! The crowd goes mild!`,
    `${winners} claim the win, ${score}! Time to update the leaderboard!`,
    `That's a wrap! ${winners} win it ${score}! Someone's buying the drinks!`,
    `The dust settles and ${winners} stand tall! ${score}! Champions!`,
    `Ding ding ding! ${winners} are your winners at ${score}! High fives all around!`,
    `And just like that, ${winners} seal the deal! ${score}! Boom!`,
    `Pack it up folks, ${winners} got this one ${score}! Better luck next time!`,
    `History is made! ${winners} win ${score}! The legend grows!`,
  ];

  return regularTemplates[Math.floor(Math.random() * regularTemplates.length)];
};

interface Props {
  match: Match;
  players: PlayerView[];
  onUpdateScore: (team: 'team1' | 'team2', delta: number) => void;
  onFinishMatch: () => void;
  onCancelMatch: () => void;
  settings: TournamentSettings;
  onUpdateSettings: (settings: TournamentSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const MatchView: React.FC<Props> = ({ match, players, onUpdateScore, onFinishMatch, onCancelMatch, settings, onUpdateSettings, onUndo, onRedo, canUndo, canRedo }) => {
  const isPositionMode = settings.isPositionMode;
  const winningScore = getWinningScore(settings);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showWinAnimation, setShowWinAnimation] = useState(false);
  const [winningTeam, setWinningTeam] = useState<'team1' | 'team2' | null>(null);
  const [isUnicorn, setIsUnicorn] = useState(false);

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

  // Announce match start
  useEffect(() => {
    if (settings.voiceAnnouncements) {
      const announcement = getMatchStartAnnouncement(
        t1Attacker?.nickname || 'Unknown',
        t1Defender?.nickname || 'Unknown',
        t2Attacker?.nickname || 'Unknown',
        t2Defender?.nickname || 'Unknown',
        isPositionMode
      );
      // Small delay to let the view render first
      const timer = setTimeout(() => speak(announcement, settings.voiceName), 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const isWinner1 = match.team1.score >= winningScore;
  const isWinner2 = match.team2.score >= winningScore;

  // Trigger win animation when someone wins
  useEffect(() => {
    if (isWinner1 && winningTeam !== 'team1') {
      const unicornWin = match.team2.score === 0;
      setWinningTeam('team1');
      setIsUnicorn(unicornWin);
      setShowWinAnimation(true);
      playWinSound(unicornWin);
      // Announce win after sound completes (unicorn ~1.1s, regular ~0.5s)
      if (settings.voiceAnnouncements) {
        const soundDuration = unicornWin ? 1200 : 600;
        setTimeout(() => {
          speak(getMatchEndAnnouncement(
            t1Attacker?.nickname || 'Unknown',
            t1Defender?.nickname || 'Unknown',
            match.team1.score,
            match.team2.score,
            unicornWin
          ), settings.voiceName);
        }, soundDuration);
      }
    } else if (isWinner2 && winningTeam !== 'team2') {
      const unicornWin = match.team1.score === 0;
      setWinningTeam('team2');
      setIsUnicorn(unicornWin);
      setShowWinAnimation(true);
      playWinSound(unicornWin);
      // Announce win after sound completes
      if (settings.voiceAnnouncements) {
        const soundDuration = unicornWin ? 1200 : 600;
        setTimeout(() => {
          speak(getMatchEndAnnouncement(
            t2Attacker?.nickname || 'Unknown',
            t2Defender?.nickname || 'Unknown',
            match.team2.score,
            match.team1.score,
            unicornWin
          ), settings.voiceName);
        }, soundDuration);
      }
    } else if (!isWinner1 && !isWinner2 && winningTeam) {
      // Reset if score drops below winning (undo scenario)
      setWinningTeam(null);
      setIsUnicorn(false);
      setShowWinAnimation(false);
      // Cancel any pending speech on undo
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [isWinner1, isWinner2, winningTeam, match.team1.score, match.team2.score, settings.voiceAnnouncements]);

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
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 z-30 shadow-2xl relative">
        <button onClick={onCancelMatch} className="text-slate-500 hover:text-white flex items-center gap-2 transition uppercase text-xs font-bold tracking-widest">
            <XCircle className="w-5 h-5" /> <span className="hidden md:inline">Cancel</span>
        </button>

        {/* Center: Target Score Display */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
             <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-700">
               <Star className="w-4 h-4 text-foos-gold" />
               <span className="text-white font-black text-lg tabular-nums">{winningScore}</span>
               <span className="text-slate-500 text-xs font-bold uppercase tracking-wide hidden md:inline">to win</span>
             </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => setShowOptionsModal(true)}
            className="p-2 rounded-lg transition text-slate-400 hover:text-white hover:bg-slate-800"
            title="Options"
          >
            <Settings className="w-5 h-5" />
          </button>
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
            className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-lg font-bold text-sm transition uppercase tracking-wide shadow-lg ${
                isWinner1 || isWinner2
                ? 'bg-foos-brand text-white hover:bg-orange-600 shadow-orange-500/20'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
        >
            <Save className="w-4 h-4" /> <span className="hidden md:inline">Save Result</span>
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

      {/* Win Animation Overlay */}
      {showWinAnimation && winningTeam && (
        <div
          className={`fixed inset-0 z-40 pointer-events-none overflow-hidden transition-opacity duration-500 ${showWinAnimation ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Background flash - Rainbow for unicorn */}
          <div className={`absolute inset-0 ${
            isUnicorn
              ? 'animate-[rainbowPulse_1s_ease-in-out_infinite] bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-cyan-500/30'
              : `animate-pulse ${winningTeam === 'team1' ? 'bg-blue-500/20' : 'bg-red-500/20'}`
          }`} />

          {/* Confetti-like particles - More and colorful for unicorn */}
          <div className="absolute inset-0">
            {[...Array(isUnicorn ? 40 : 20)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-3 h-3 rounded-full ${
                  isUnicorn
                    ? ['bg-pink-400', 'bg-purple-400', 'bg-cyan-400', 'bg-yellow-400', 'bg-green-400'][i % 5]
                    : winningTeam === 'team1' ? 'bg-blue-400' : 'bg-red-400'
                } animate-[confetti_2s_ease-out_forwards]`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  animationDelay: `${Math.random() * (isUnicorn ? 1 : 0.5)}s`,
                  opacity: Math.random() * 0.8 + 0.2,
                }}
              />
            ))}
            {[...Array(isUnicorn ? 30 : 15)].map((_, i) => (
              <Sparkles
                key={`star-${i}`}
                className={`absolute w-6 h-6 ${
                  isUnicorn
                    ? ['text-pink-300', 'text-purple-300', 'text-cyan-300', 'text-yellow-300'][i % 4]
                    : winningTeam === 'team1' ? 'text-blue-300' : 'text-red-300'
                } animate-[sparkle_1.5s_ease-out_forwards]`}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.8}s`,
                }}
              />
            ))}
            {/* Extra unicorn stars */}
            {isUnicorn && [...Array(20)].map((_, i) => (
              <Star
                key={`unicorn-star-${i}`}
                className="absolute w-8 h-8 text-yellow-300 animate-[unicornStar_2s_ease-out_forwards] fill-yellow-300"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 1.2}s`,
                }}
              />
            ))}
          </div>

          {/* Victory text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-center transform animate-[victoryPop_0.5s_ease-out_forwards]`}>
              {isUnicorn ? (
                <>
                  {/* Unicorn emoji with rainbow glow */}
                  <div className="text-[8rem] md:text-[12rem] animate-bounce drop-shadow-[0_0_40px_rgba(236,72,153,0.8)]">
                    🦄
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-wider bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] animate-[rainbowText_2s_linear_infinite]">
                    UNICORN!
                  </h2>
                  <p className={`text-3xl md:text-5xl font-black mt-2 ${
                    winningTeam === 'team1' ? 'text-blue-400' : 'text-red-400'
                  } drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]`}>
                    {winningTeam === 'team1' ? 'BLUE' : 'RED'} WINS {winningScore}-0!
                  </p>
                </>
              ) : (
                <>
                  <Trophy className={`w-24 h-24 mx-auto mb-4 ${
                    winningTeam === 'team1' ? 'text-blue-400' : 'text-red-400'
                  } drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] animate-bounce`} />
                  <h2 className={`text-6xl md:text-8xl font-black uppercase italic tracking-wider ${
                    winningTeam === 'team1' ? 'text-blue-400' : 'text-red-400'
                  } drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]`}>
                    {winningTeam === 'team1' ? 'BLUE' : 'RED'}
                  </h2>
                  <p className="text-4xl md:text-6xl font-black text-foos-gold mt-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse">
                    WINS!
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Options Modal */}
      <OptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        settings={settings}
        onSave={onUpdateSettings}
        hasCompletedMatches={false}
      />
    </div>
  );
};

export default MatchView;
