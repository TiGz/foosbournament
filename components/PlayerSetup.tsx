import React, { useState } from 'react';
import { PlayerView, GlobalPlayer, Toast } from '../types';
import { useImageCapture } from '../hooks/useImageCapture';
import { useAvatarQueue } from '../hooks/useAvatarQueue';
import { Loader2, Camera, Sparkles, UserPlus, Trash2, ArrowRight, X, SwitchCamera, KeyRound, ArrowLeft, Users, Plus, Check } from 'lucide-react';

interface Props {
  players: PlayerView[];
  globalPlayers: GlobalPlayer[];
  tournamentName: string;
  onAddPlayer: (globalPlayerId: string) => void;
  onCreatePlayer: (nickname: string, photoUrl: string | null) => Promise<string>;
  onRemovePlayer: (globalPlayerId: string) => void;
  onFinishSetup: () => void;
  onBackToLobby: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => string;
}

const PlayerSetup: React.FC<Props> = ({
  players,
  globalPlayers,
  tournamentName,
  onAddPlayer,
  onCreatePlayer,
  onRemovePlayer,
  onFinishSetup,
  onBackToLobby,
  addToast,
}) => {
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [showPlayerPool, setShowPlayerPool] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  // Track if user wants AI makeover for the new player
  const [pendingAiMakeover, setPendingAiMakeover] = useState(false);

  const {
    imagePreview,
    setImagePreview,
    isCameraOpen,
    isGenerating,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    fileInputRef,
    triggerFileInput,
    handleFileChange,
    generateAiAvatar,
    hasKey,
    showApiKeyModal,
    setShowApiKeyModal,
    apiKeyInput,
    setApiKeyInput,
    handleSaveApiKey,
    handleClearApiKey,
    canStartBackgroundGeneration,
  } = useImageCapture({ addToast });

  const { startGeneration, isGenerating: isGeneratingInBackground } = useAvatarQueue();

  // Get players not in tournament
  const availablePlayers = globalPlayers.filter(
    gp => !players.some(p => p.id === gp.id)
  );

  const handleGenerateAvatar = () => {
    // Mark that user wants AI makeover - will be processed on submit
    if (canStartBackgroundGeneration()) {
      setPendingAiMakeover(true);
      addToast({ type: 'info', message: 'AI Makeover queued. Click "CREATE & ADD" to start generation.' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    // Check for duplicate nickname (case-insensitive)
    const isDuplicate = globalPlayers.some(
      p => p.nickname.toLowerCase() === nickname.trim().toLowerCase()
    );
    if (isDuplicate) {
      setNicknameError('A player with this nickname already exists');
      return;
    }

    const trimmedNickname = nickname.trim();
    const photoToSave = imagePreview;
    const wantsAiMakeover = pendingAiMakeover && photoToSave;

    // Create player with original photo first - get back the new player ID
    const newPlayerId = await onCreatePlayer(trimmedNickname, photoToSave);

    // If AI makeover was requested, queue background generation
    if (wantsAiMakeover && newPlayerId) {
      startGeneration(newPlayerId, trimmedNickname, photoToSave);
      addToast({ type: 'info', message: `AI Makeover started for ${trimmedNickname}` });
    }

    // Reset form
    setNickname('');
    setNicknameError(null);
    setImagePreview(null);
    setPendingAiMakeover(false);
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    if (nicknameError) setNicknameError(null);
  };

  return (
    <div className="min-h-screen bg-foos-dark text-white p-4 md:p-8 flex flex-col items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-foos-brand/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl xl:max-w-5xl w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBackToLobby}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition text-fluid-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back to Lobby</span>
          </button>
          <h1 className="text-fluid-lg md:text-fluid-xl font-black text-white uppercase italic">{tournamentName}</h1>
          <div className="w-16 xs:w-24"></div>
        </div>

        <div className="text-center">
          <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Logo" className="h-20 sm:h-24 md:h-28 lg:h-32 object-contain mx-auto rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Form */}
          <div className="bg-foos-panel p-4 md:p-6 rounded-card-lg shadow-card border border-slate-800">
            <h2 className="text-fluid-lg font-bold text-white mb-4 uppercase italic">Create New Player</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-fluid-sm font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  className={`w-full bg-slate-900 border rounded-lg p-3 md:p-3.5 focus:ring-2 focus:ring-foos-brand text-white font-bold outline-none transition placeholder-slate-600 text-fluid-base ${
                    nicknameError ? 'border-red-500' : 'border-slate-700'
                  }`}
                  placeholder="e.g. The Sledgehammer"
                  required
                />
                {nicknameError && (
                  <p className="text-red-400 text-fluid-xs mt-1.5">{nicknameError}</p>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-fluid-sm font-bold text-slate-400 uppercase tracking-wider">Player Photo</label>
                <div className="flex flex-col gap-3">
                  {/* Photo Area */}
                  <div className={`relative w-full aspect-square max-w-[160px] sm:max-w-[180px] mx-auto rounded-full bg-slate-900 border-2 border-dashed overflow-hidden shadow-inner group transition-colors ${
                    !nickname.trim() ? 'border-slate-800 opacity-50' : 'border-slate-600 opacity-100'
                  }`}>

                    {isCameraOpen ? (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform -scale-x-100"
                        />
                        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="bg-white text-slate-900 rounded-full p-2.5 shadow-lg hover:scale-110 transition border-2 border-slate-200 active:scale-95"
                          >
                            <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
                          </button>
                          <button
                            type="button"
                            onClick={() => stopCamera()}
                            className="bg-slate-800/80 text-white rounded-full p-2 hover:bg-red-500 transition active:scale-95"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                            <Camera className="w-8 h-8" />
                            <span className="text-fluid-xs font-bold uppercase">No Photo</span>
                          </div>
                        )}

                        {isGenerating && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-foos-brand z-20">
                            <Loader2 className="w-6 h-6 animate-spin mb-2" />
                            <span className="text-fluid-xs font-bold uppercase tracking-widest">Designing...</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Control Buttons */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {!isCameraOpen && (
                      <>
                        <button
                          type="button"
                          onClick={startCamera}
                          disabled={!nickname.trim()}
                          className={`text-fluid-xs px-3 py-2 rounded-button font-bold transition flex items-center gap-1.5 border ${
                            !nickname.trim()
                              ? 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 active:scale-95'
                          }`}
                        >
                          <SwitchCamera className="w-3.5 h-3.5" /> Webcam
                        </button>
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          disabled={!nickname.trim()}
                          className={`text-fluid-xs px-3 py-2 rounded-button font-bold transition border ${
                            !nickname.trim()
                              ? 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 active:scale-95'
                          }`}
                        >
                          Upload
                        </button>
                      </>
                    )}

                    {imagePreview && !isCameraOpen && (
                      <button
                        type="button"
                        onClick={handleGenerateAvatar}
                        disabled={isGenerating || pendingAiMakeover}
                        className={`text-fluid-xs px-3 py-2 rounded-button transition flex items-center gap-1.5 font-bold active:scale-95 ${
                          pendingAiMakeover
                            ? 'bg-green-600 text-white'
                            : 'bg-foos-brand hover:bg-orange-600 text-white shadow-button-brand'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {pendingAiMakeover ? 'Queued' : 'AI Makeover'}
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-foos-accent hover:bg-cyan-400 text-slate-900 font-black tracking-wide py-3 rounded-button flex items-center justify-center gap-2 transition transform active:scale-95 shadow-button-accent text-fluid-sm"
              >
                <UserPlus className="w-4 h-4" />
                CREATE & ADD
              </button>
            </form>

            {/* Add from pool button */}
            {availablePlayers.length > 0 && (
              <button
                onClick={() => setShowPlayerPool(true)}
                className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-button flex items-center justify-center gap-2 transition border border-slate-700 active:scale-95 text-fluid-sm"
              >
                <Users className="w-4 h-4" />
                Add Existing Player ({availablePlayers.length})
              </button>
            )}

            <div className="mt-4 text-center">
              <button
                onClick={() => hasKey ? handleClearApiKey() : setShowApiKeyModal(true)}
                className="text-fluid-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1.5 mx-auto transition"
              >
                <KeyRound className="w-3.5 h-3.5" /> {hasKey ? 'Clear API Key' : 'Set API Key'}
              </button>
            </div>
          </div>

          {/* Roster */}
          <div className="bg-foos-panel p-4 md:p-6 rounded-card-lg shadow-card border border-slate-800 flex flex-col">
            <div className="flex justify-between items-center mb-4 gap-3">
              <h2 className="text-fluid-lg font-black text-white uppercase italic">Roster ({players.length})</h2>
              <button
                onClick={onFinishSetup}
                disabled={players.length < 4}
                className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-button transition text-fluid-sm ${
                  players.length >= 4
                    ? 'bg-foos-brand text-white hover:bg-orange-600 shadow-button-brand active:scale-95'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                START <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {players.length < 4 && (
              <div className="text-fluid-xs text-slate-500 mb-3">
                Need at least 4 players to start
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[350px] md:max-h-[400px]">
              {players.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic py-8 text-fluid-sm">
                  No players added yet.
                </div>
              )}
              {players.map(p => {
                const isPlayerGenerating = isGenerating(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-card border border-slate-800 group hover:border-slate-700 hover:shadow-card-hover transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`relative w-10 h-10 rounded-full bg-slate-800 overflow-hidden ring-2 transition ${
                        isPlayerGenerating ? 'ring-foos-brand animate-pulse' : 'ring-slate-800 group-hover:ring-foos-accent'
                      }`}>
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-fluid-sm font-bold bg-slate-800 text-slate-500">
                            {p.nickname.charAt(0)}
                          </div>
                        )}
                        {isPlayerGenerating && (
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foos-brand rounded-full flex items-center justify-center">
                            <Sparkles className="w-2.5 h-2.5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-white text-fluid-sm group-hover:text-foos-accent transition">{p.nickname}</div>
                    </div>
                    <button
                      onClick={() => onRemovePlayer(p.id)}
                      className="text-slate-600 hover:text-foos-red transition p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Player Pool Modal */}
      {showPlayerPool && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-foos-panel rounded-card-lg p-5 md:p-6 max-w-md w-full border border-slate-700 shadow-modal max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-fluid-lg font-bold text-white">Add Existing Players</h3>
              <button
                onClick={() => {
                  setShowPlayerPool(false);
                  setSelectedPlayerIds(new Set());
                }}
                className="text-slate-500 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select All / Deselect All */}
            {availablePlayers.length > 0 && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700">
                <span className="text-fluid-sm text-slate-400">
                  {selectedPlayerIds.size} of {availablePlayers.length} selected
                </span>
                <button
                  onClick={() => {
                    if (selectedPlayerIds.size === availablePlayers.length) {
                      setSelectedPlayerIds(new Set());
                    } else {
                      setSelectedPlayerIds(new Set(availablePlayers.map(p => p.id)));
                    }
                  }}
                  className="text-fluid-sm text-foos-accent hover:text-cyan-300 font-bold transition"
                >
                  {selectedPlayerIds.size === availablePlayers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {availablePlayers.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-fluid-sm">
                  All players are already in this tournament.
                </div>
              ) : (
                availablePlayers.map(player => {
                  const isSelected = selectedPlayerIds.has(player.id);
                  return (
                    <div
                      key={player.id}
                      onClick={() => {
                        setSelectedPlayerIds(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(player.id)) {
                            newSet.delete(player.id);
                          } else {
                            newSet.add(player.id);
                          }
                          return newSet;
                        });
                      }}
                      className={`flex items-center gap-3 bg-slate-900 p-3 rounded-card border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-foos-accent bg-foos-accent/10'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                        isSelected
                          ? 'bg-foos-accent border-foos-accent'
                          : 'border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-slate-900" />}
                      </div>

                      <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700 flex-shrink-0">
                        {player.photoUrl ? (
                          <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-fluid-sm font-bold text-slate-500">
                            {player.nickname.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate text-fluid-sm">{player.nickname}</div>
                        <div className="text-fluid-xs text-slate-500">
                          {player.lifetimeGamesPlayed} games · {player.lifetimeWins} wins
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Selected Button */}
            {availablePlayers.length > 0 && (
              <button
                onClick={() => {
                  selectedPlayerIds.forEach(id => onAddPlayer(id));
                  setSelectedPlayerIds(new Set());
                  setShowPlayerPool(false);
                }}
                disabled={selectedPlayerIds.size === 0}
                className={`mt-4 w-full font-bold py-3 rounded-button transition flex items-center justify-center gap-2 text-fluid-sm active:scale-95 ${
                  selectedPlayerIds.size > 0
                    ? 'bg-foos-accent hover:bg-cyan-400 text-slate-900 shadow-button-accent'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                Add {selectedPlayerIds.size > 0 ? `${selectedPlayerIds.size} Player${selectedPlayerIds.size > 1 ? 's' : ''}` : 'Selected'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-foos-panel rounded-card-lg p-5 md:p-6 max-w-md w-full border border-slate-700 shadow-modal">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-fluid-lg font-bold text-white">Enter Gemini API Key</h3>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-500 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-fluid-sm text-slate-400 mb-4">
              Get your free API key from{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" className="text-foos-accent hover:text-cyan-300 underline transition">
                Google AI Studio
              </a>
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-foos-brand mb-4 text-fluid-base"
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
              className="w-full bg-foos-brand hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-button transition shadow-button-brand active:scale-95 text-fluid-sm"
            >
              Save Key
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSetup;
