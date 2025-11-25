import React, { useState } from 'react';
import { PlayerView, GlobalPlayer } from '../types';
import { useImageCapture } from '../hooks/useImageCapture';
import { Loader2, Camera, Sparkles, UserPlus, Trash2, ArrowRight, X, SwitchCamera, KeyRound, ArrowLeft, Users, Plus } from 'lucide-react';

interface Props {
  players: PlayerView[];
  globalPlayers: GlobalPlayer[];
  tournamentName: string;
  onAddPlayer: (globalPlayerId: string) => void;
  onCreatePlayer: (nickname: string, photoUrl: string | null) => void;
  onRemovePlayer: (globalPlayerId: string) => void;
  onFinishSetup: () => void;
  onBackToLobby: () => void;
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
}) => {
  const [nickname, setNickname] = useState('');
  const [showPlayerPool, setShowPlayerPool] = useState(false);

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
  } = useImageCapture();

  // Get players not in tournament
  const availablePlayers = globalPlayers.filter(
    gp => !players.some(p => p.id === gp.id)
  );

  const handleGenerateAvatar = async () => {
    await generateAiAvatar(nickname);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) return;
    onCreatePlayer(nickname, imagePreview);
    // Reset form
    setNickname('');
    setImagePreview(null);
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-foos-dark text-white p-4 md:p-8 flex flex-col items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-foos-brand/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToLobby}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </button>
          <h1 className="text-lg md:text-xl font-black text-white uppercase italic">{tournamentName}</h1>
          <div className="w-24"></div>
        </div>

        <div className="text-center">
          <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Logo" className="h-24 md:h-32 object-contain mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-foos-panel p-4 md:p-6 rounded-2xl shadow-2xl border border-slate-800 shadow-black/50">
            <h2 className="text-lg font-bold text-white mb-4 uppercase italic">Create New Player</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-400 mb-1 uppercase tracking-wider">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-foos-brand text-white font-bold outline-none transition placeholder-slate-600"
                  placeholder="e.g. The Sledgehammer"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Player Photo</label>
                <div className="flex flex-col gap-3">
                  {/* Photo Area */}
                  <div className={`relative w-full aspect-square max-w-[180px] mx-auto rounded-full bg-slate-900 border-2 border-dashed overflow-hidden shadow-inner group transition-colors ${
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
                            className="bg-white text-slate-900 rounded-full p-2 shadow-lg hover:scale-110 transition border-2 border-slate-200"
                          >
                            <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
                          </button>
                          <button
                            type="button"
                            onClick={() => stopCamera()}
                            className="bg-slate-800/80 text-white rounded-full p-1.5 hover:bg-red-500 transition"
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
                            <span className="text-xs font-bold uppercase">No Photo</span>
                          </div>
                        )}

                        {isGenerating && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-foos-brand z-20">
                            <Loader2 className="w-6 h-6 animate-spin mb-2" />
                            <span className="text-xs font-bold uppercase tracking-widest">Designing...</span>
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
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border ${
                            !nickname.trim()
                              ? 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          <SwitchCamera className="w-3 h-3" /> Webcam
                        </button>
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          disabled={!nickname.trim()}
                          className={`text-xs px-3 py-1.5 rounded-lg font-bold transition border ${
                            !nickname.trim()
                              ? 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
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
                        disabled={isGenerating}
                        className="text-xs bg-foos-brand hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1 font-bold shadow-lg shadow-orange-500/20"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI Makeover
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
                className="w-full bg-foos-accent hover:bg-cyan-400 text-slate-900 font-black tracking-wide py-2.5 rounded-lg flex items-center justify-center gap-2 transition transform active:scale-95 shadow-lg shadow-cyan-500/20"
              >
                <UserPlus className="w-4 h-4" />
                CREATE & ADD
              </button>
            </form>

            {/* Add from pool button */}
            {availablePlayers.length > 0 && (
              <button
                onClick={() => setShowPlayerPool(true)}
                className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition border border-slate-700"
              >
                <Users className="w-4 h-4" />
                Add Existing Player ({availablePlayers.length})
              </button>
            )}

            <div className="mt-3 text-center">
              <button
                onClick={() => hasKey ? handleClearApiKey() : setShowApiKeyModal(true)}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto"
              >
                <KeyRound className="w-3 h-3" /> {hasKey ? 'Clear API Key' : 'Set API Key'}
              </button>
            </div>
          </div>

          {/* Roster */}
          <div className="bg-foos-panel p-4 md:p-6 rounded-2xl shadow-2xl border border-slate-800 shadow-black/50 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-white uppercase italic">Roster ({players.length})</h2>
              <button
                onClick={onFinishSetup}
                disabled={players.length < 4}
                className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg transition text-sm ${
                  players.length >= 4
                    ? 'bg-foos-brand text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                START <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {players.length < 4 && (
              <div className="text-xs text-slate-500 mb-3">
                Need at least 4 players to start
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-[350px]">
              {players.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 italic py-8">
                  No players added yet.
                </div>
              )}
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800 group hover:border-slate-700 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden ring-2 ring-slate-800 group-hover:ring-foos-accent transition">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-slate-800 text-slate-500">
                          {p.nickname.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-white text-sm group-hover:text-foos-accent transition">{p.nickname}</div>
                  </div>
                  <button
                    onClick={() => onRemovePlayer(p.id)}
                    className="text-slate-600 hover:text-foos-red transition p-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Player Pool Modal */}
      {showPlayerPool && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-foos-panel rounded-2xl p-6 max-w-md w-full border border-slate-700 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Add Existing Player</h3>
              <button
                onClick={() => setShowPlayerPool(false)}
                className="text-slate-500 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {availablePlayers.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  All players are already in this tournament.
                </div>
              ) : (
                availablePlayers.map(player => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800 hover:border-slate-600 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700">
                        {player.photoUrl ? (
                          <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-500">
                            {player.nickname.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white">{player.nickname}</div>
                        <div className="text-xs text-slate-500">
                          {player.lifetimeGamesPlayed} games · {player.lifetimeWins} wins
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onAddPlayer(player.id);
                        setShowPlayerPool(false);
                      }}
                      className="bg-foos-accent hover:bg-cyan-400 text-slate-900 font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-foos-panel rounded-2xl p-6 max-w-md w-full border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Enter Gemini API Key</h3>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-500 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Get your free API key from{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" className="text-foos-accent underline">
                Google AI Studio
              </a>
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none focus:ring-2 focus:ring-foos-brand mb-4"
            />
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
              className="w-full bg-foos-brand hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-lg transition"
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
