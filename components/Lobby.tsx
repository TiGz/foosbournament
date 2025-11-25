import React, { useState } from 'react';
import { GlobalPlayer, TournamentSummary } from '../types';
import { Trophy, Plus, Users, Calendar, Trash2, X, Edit3, Check } from 'lucide-react';

interface Props {
  tournaments: TournamentSummary[];
  globalPlayers: GlobalPlayer[];
  onSelectTournament: (id: string) => void;
  onCreateTournament: () => void;
  onDeleteTournament: (id: string) => void;
  onUpdatePlayer: (player: GlobalPlayer) => void;
}

const Lobby: React.FC<Props> = ({
  tournaments,
  globalPlayers,
  onSelectTournament,
  onCreateTournament,
  onDeleteTournament,
  onUpdatePlayer,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState('');

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={import.meta.env.BASE_URL + 'logo.jpeg'} alt="Logo" className="h-12 md:h-16 object-contain" />
            <div>
              <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foos-brand to-red-400 uppercase italic">
                Foosbournament
              </h1>
              <p className="text-slate-500 text-xs font-medium">Select or create a tournament</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Tournaments Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-5 h-5 text-foos-gold" />
                Tournaments
              </h2>
              <button
                onClick={onCreateTournament}
                className="flex items-center gap-2 bg-gradient-to-r from-foos-brand to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold px-4 py-2 rounded-lg shadow-lg shadow-orange-500/20 transition transform hover:scale-[1.02] active:scale-95"
              >
                <Plus className="w-4 h-4" />
                New Tournament
              </button>
            </div>

            {sortedTournaments.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
                <Trophy className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No tournaments yet</p>
                <button
                  onClick={onCreateTournament}
                  className="text-foos-brand hover:text-orange-300 font-bold text-sm uppercase tracking-wider"
                >
                  Create your first tournament
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {sortedTournaments.map(tournament => (
                  <div
                    key={tournament.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition cursor-pointer group relative"
                    onClick={() => onSelectTournament(tournament.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-white group-hover:text-foos-brand transition">
                          {tournament.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {tournament.playerCount} players
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(tournament.lastUpdatedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(tournament.id);
                        }}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Player Pool Section */}
          <section>
            <h2 className="text-lg font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-foos-accent" />
              Player Pool
              <span className="text-slate-600 font-normal text-sm ml-2">({globalPlayers.length})</span>
            </h2>

            {globalPlayers.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No players yet. Create players when setting up a tournament.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {globalPlayers.map(player => (
                  <div
                    key={player.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-600 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex-shrink-0">
                        {player.photoUrl ? (
                          <img src={player.photoUrl} alt={player.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold">
                            {player.nickname.charAt(0)}
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
                              className="bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-sm w-full focus:outline-none focus:border-foos-accent"
                              autoFocus
                            />
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-sm truncate">{player.nickname}</span>
                            <button
                              onClick={() => handleStartEdit(player)}
                              className="p-1 text-slate-600 hover:text-slate-400 rounded opacity-0 group-hover:opacity-100 transition"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-600">
                          {player.lifetimeGamesPlayed} games · {player.lifetimeWins} wins
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-foos-panel border border-slate-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white mb-2 uppercase italic">Delete Tournament?</h2>
              <p className="text-slate-400 text-sm mb-6">
                This will permanently delete this tournament and all its match history. This cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteTournament(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
