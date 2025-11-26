import React, { useState } from 'react';
import { GlobalPlayer, TournamentSummary, Toast } from '../types';
import { Trophy, Plus, Users, Calendar, Trash2, Edit3, Check, Camera, Database, Download, Upload, AlertTriangle, Sparkles } from 'lucide-react';
import AvatarEditor from './AvatarEditor';
import InstallPrompt from './InstallPrompt';
import { useAvatarQueue } from '../hooks/useAvatarQueue';

type LobbyTab = 'tournaments' | 'players' | 'data';

interface Props {
  tournaments: TournamentSummary[];
  globalPlayers: GlobalPlayer[];
  onSelectTournament: (id: string) => void;
  onCreateTournament: () => void;
  onDeleteTournament: (id: string) => void;
  onUpdatePlayer: (player: GlobalPlayer) => void;
  onExportData: () => void;
  onImportData: (mode: 'overwrite' | 'merge') => void;
  addToast: (toast: Omit<Toast, 'id'>) => string;
}

const Lobby: React.FC<Props> = ({
  tournaments,
  globalPlayers,
  onSelectTournament,
  onCreateTournament,
  onDeleteTournament,
  onUpdatePlayer,
  onExportData,
  onImportData,
  addToast,
}) => {
  const [activeTab, setActiveTab] = useState<LobbyTab>('tournaments');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState('');
  const [editingAvatarPlayer, setEditingAvatarPlayer] = useState<GlobalPlayer | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  const { isGenerating } = useAvatarQueue();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleStartEdit = (player: GlobalPlayer) => {
    setEditingPlayerId(player.id);
    setEditingNickname(player.nickname);
  };

  const handleSaveEdit = () => {
    if (editingPlayerId && editingNickname.trim()) {
      const player = globalPlayers.find(p => p.id === editingPlayerId);
      if (player) {
        onUpdatePlayer({ ...player, nickname: editingNickname.trim() });
      }
    }
    setEditingPlayerId(null);
    setEditingNickname('');
  };

  const sortedTournaments = [...tournaments].sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);

  return (
    <div className="h-screen w-screen bg-foos-dark text-white flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl xl:max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 md:gap-4">
              <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Logo" className="h-12 md:h-16 lg:h-18 object-contain rounded-lg" />
              <div>
                <h1 className="text-fluid-xl md:text-fluid-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foos-brand to-red-400 uppercase italic">
                  Foosbournament
                </h1>
                <p className="text-slate-500 text-fluid-sm font-medium">Select or create a tournament</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700 -mb-[1px]">
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`px-4 py-2.5 font-semibold text-fluid-sm transition-colors ${
                activeTab === 'tournaments'
                  ? 'text-foos-brand border-b-2 border-foos-brand'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Trophy className="w-4 h-4 inline-block mr-2 -mt-0.5" />
              Tournaments
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-4 py-2.5 font-semibold text-fluid-sm transition-colors ${
                activeTab === 'players'
                  ? 'text-foos-brand border-b-2 border-foos-brand'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-2 -mt-0.5" />
              Players
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`px-4 py-2.5 font-semibold text-fluid-sm transition-colors ${
                activeTab === 'data'
                  ? 'text-foos-brand border-b-2 border-foos-brand'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Database className="w-4 h-4 inline-block mr-2 -mt-0.5" />
              Data
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl xl:max-w-5xl mx-auto space-y-8 md:space-y-10">
          {/* Install Prompt - only on tournaments tab */}
          {activeTab === 'tournaments' && <InstallPrompt />}

          {/* Tournaments Tab */}
          {activeTab === 'tournaments' && (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-fluid-lg font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-foos-gold" />
                  Tournaments
                </h2>
                <button
                  onClick={onCreateTournament}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold px-4 py-2.5 rounded-lg shadow-button-brand transition transform hover:scale-[1.02] active:scale-95 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" />
                  New Tournament
                </button>
              </div>

              {sortedTournaments.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-card-lg p-8 text-center shadow-card">
                  <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">No tournaments yet</p>
                  <button
                    onClick={onCreateTournament}
                    className="text-foos-brand hover:text-orange-300 font-bold text-fluid-sm uppercase tracking-wider"
                  >
                    Create your first tournament
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {sortedTournaments.map(tournament => (
                    <div
                      key={tournament.id}
                      className="bg-slate-900 border border-slate-800 rounded-card-lg p-4 md:p-5 hover:border-slate-600 hover:shadow-card-hover transition-all cursor-pointer group relative"
                      onClick={() => onSelectTournament(tournament.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-fluid-base text-white group-hover:text-foos-brand transition">
                            {tournament.name}
                          </h3>
                          <div className="flex items-center gap-4 mt-1.5 text-fluid-sm text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {tournament.playerCount} players
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(tournament.lastUpdatedAt)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(tournament.id);
                          }}
                          className="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <section>
              <h2 className="text-fluid-lg font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-foos-accent" />
                Player Pool
                <span className="text-slate-600 font-normal text-fluid-sm ml-2">({globalPlayers.length})</span>
              </h2>

              {globalPlayers.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-card-lg p-6 text-center shadow-card">
                  <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-fluid-sm">No players yet. Create players when setting up a tournament.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {globalPlayers.map(player => {
                    const isPlayerGenerating = isGenerating(player.id);
                    return (
                    <div
                      key={player.id}
                      className="bg-slate-900 border border-slate-800 rounded-card p-3 md:p-4 hover:border-slate-600 hover:shadow-card-hover transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-slate-800 border-2 overflow-hidden flex-shrink-0 cursor-pointer transition ${
                            isPlayerGenerating ? 'border-foos-brand animate-pulse' : 'border-slate-700 hover:border-foos-accent'
                          }`}
                          onClick={() => setEditingAvatarPlayer(player)}
                          title="Edit avatar"
                        >
                          {player.photoUrl ? (
                            <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-lg">
                              {player.nickname.charAt(0)}
                            </div>
                          )}
                          {!isPlayerGenerating && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-full">
                              <Camera className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {isPlayerGenerating && (
                            <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foos-brand rounded-full flex items-center justify-center">
                              <Sparkles className="w-2.5 h-2.5 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingPlayerId === player.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingNickname}
                                onChange={(e) => setEditingNickname(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-fluid-sm w-full focus:outline-none focus:border-foos-accent"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEdit}
                                className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-fluid-sm truncate">{player.nickname}</span>
                              <button
                                onClick={() => handleStartEdit(player)}
                                className="p-1 text-slate-600 hover:text-slate-400 rounded opacity-0 group-hover:opacity-100 transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <div className="text-fluid-xs text-slate-500">
                            {player.lifetimeGamesPlayed} games · {player.lifetimeWins} wins
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <section className="space-y-6">
              {/* Export Section */}
              <div className="bg-slate-900 border border-slate-800 rounded-card-lg p-5 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-foos-accent/10 rounded-full flex items-center justify-center">
                    <Download className="w-5 h-5 text-foos-accent" />
                  </div>
                  <div>
                    <h3 className="text-fluid-base font-bold text-white">Export Data</h3>
                    <p className="text-slate-500 text-fluid-sm">
                      Download all tournaments and players as a backup file
                    </p>
                  </div>
                </div>
                <button
                  onClick={onExportData}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-foos-accent hover:bg-cyan-400 text-slate-900 font-bold px-5 py-2.5 rounded-lg transition transform active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Download Backup
                </button>
              </div>

              {/* Import Section */}
              <div className="bg-slate-900 border border-slate-800 rounded-card-lg p-5 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-foos-brand/10 rounded-full flex items-center justify-center">
                    <Upload className="w-5 h-5 text-foos-brand" />
                  </div>
                  <div>
                    <h3 className="text-fluid-base font-bold text-white">Import Data</h3>
                    <p className="text-slate-500 text-fluid-sm">
                      Restore from a backup file
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowOverwriteConfirm(true)}
                    className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold px-5 py-2.5 rounded-lg transition transform active:scale-95"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Replace All
                  </button>
                  <button
                    onClick={() => onImportData('merge')}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold px-5 py-2.5 rounded-lg shadow-button-brand transition transform active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    Merge
                  </button>
                </div>
                <p className="text-slate-600 text-fluid-xs mt-3">
                  <strong>Replace All:</strong> Overwrites all existing data. <strong>Merge:</strong> Adds new data, keeps existing.
                </p>
              </div>

              {/* Data Summary */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-card-lg p-5">
                <h3 className="text-fluid-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Current Data</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-white">{tournaments.length}</div>
                    <div className="text-fluid-xs text-slate-500">Tournaments</div>
                  </div>
                  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-2xl font-bold text-white">{globalPlayers.length}</div>
                    <div className="text-fluid-xs text-slate-500">Players</div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-foos-panel border border-slate-700 rounded-card-lg w-full max-w-sm p-6 shadow-modal">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-fluid-xl font-black text-white mb-2 uppercase italic">Delete Tournament?</h2>
              <p className="text-slate-400 text-fluid-sm mb-6">
                This will permanently delete this tournament and all its match history. This cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-button transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteTournament(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-button transition shadow-lg shadow-red-500/20 active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-foos-panel border border-slate-700 rounded-card-lg w-full max-w-sm p-6 shadow-modal">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-fluid-xl font-black text-white mb-2 uppercase italic">Replace All Data?</h2>
              <p className="text-slate-400 text-fluid-sm mb-6">
                This will permanently delete all existing tournaments and players and replace them with the imported data. This cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowOverwriteConfirm(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-button transition active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowOverwriteConfirm(false);
                    onImportData('overwrite');
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-button transition shadow-lg shadow-red-500/20 active:scale-95"
                >
                  Replace All
                </button>
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
            setEditingAvatarPlayer(null);
          }}
        />
      )}
    </div>
  );
};

export default Lobby;
