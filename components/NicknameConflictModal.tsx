import React, { useState } from 'react';
import { NicknameConflict } from '../types';
import { X, Users, UserPlus } from 'lucide-react';

interface Resolution {
  action: 'merge' | 'rename';
  newNickname?: string;
}

interface Props {
  isOpen: boolean;
  conflicts: NicknameConflict[];
  onResolve: (resolutions: Map<string, 'merge' | string>) => void;
  onCancel: () => void;
}

const NicknameConflictModal: React.FC<Props> = ({
  isOpen,
  conflicts,
  onResolve,
  onCancel,
}) => {
  const [resolutions, setResolutions] = useState<Map<string, Resolution>>(
    () => new Map(conflicts.map(c => [c.importingPlayer.id, { action: 'merge' }]))
  );

  if (!isOpen) return null;

  const handleResolutionChange = (playerId: string, action: 'merge' | 'rename') => {
    setResolutions(prev => {
      const next = new Map(prev);
      next.set(playerId, { action, newNickname: action === 'rename' ? '' : undefined });
      return next;
    });
  };

  const handleNicknameChange = (playerId: string, nickname: string) => {
    setResolutions(prev => {
      const next = new Map(prev);
      next.set(playerId, { action: 'rename', newNickname: nickname });
      return next;
    });
  };

  const canSubmit = () => {
    for (const [, resolution] of resolutions) {
      if (resolution.action === 'rename' && !resolution.newNickname?.trim()) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = () => {
    const result = new Map<string, 'merge' | string>();
    for (const [playerId, resolution] of resolutions) {
      if (resolution.action === 'merge') {
        result.set(playerId, 'merge');
      } else {
        result.set(playerId, resolution.newNickname!.trim());
      }
    }
    onResolve(result);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-foos-panel border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 className="text-lg font-black text-white uppercase italic tracking-wide">Resolve Conflicts</h2>
          <button onClick={onCancel} className="text-slate-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-slate-400 text-sm">
            The following players have the same nickname as existing players. Choose how to handle each conflict:
          </p>

          {conflicts.map(conflict => {
            const resolution = resolutions.get(conflict.importingPlayer.id);
            return (
              <div key={conflict.importingPlayer.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-foos-brand font-bold">
                    {conflict.importingPlayer.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-bold">{conflict.importingPlayer.nickname}</div>
                    <div className="text-slate-500 text-xs">conflicts with existing player</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => handleResolutionChange(conflict.importingPlayer.id, 'merge')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition border ${
                      resolution?.action === 'merge'
                        ? 'bg-foos-accent/20 border-foos-accent text-foos-accent'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Merge
                  </button>
                  <button
                    onClick={() => handleResolutionChange(conflict.importingPlayer.id, 'rename')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition border ${
                      resolution?.action === 'rename'
                        ? 'bg-foos-brand/20 border-foos-brand text-foos-brand'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Rename
                  </button>
                </div>

                {resolution?.action === 'merge' && (
                  <div className="text-slate-500 text-xs">
                    Tournament data will be linked to the existing "{conflict.existingPlayer.nickname}" player.
                  </div>
                )}

                {resolution?.action === 'rename' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter new nickname"
                      value={resolution.newNickname || ''}
                      onChange={e => handleNicknameChange(conflict.importingPlayer.id, e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-foos-brand focus:outline-none transition"
                    />
                    <div className="text-slate-500 text-xs">
                      A new player will be created with this nickname.
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit()}
            className={`flex-1 font-bold py-3 rounded-xl transition shadow-lg ${
              canSubmit()
                ? 'bg-foos-accent hover:bg-cyan-400 text-slate-900 shadow-cyan-500/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
            }`}
          >
            Continue Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default NicknameConflictModal;
