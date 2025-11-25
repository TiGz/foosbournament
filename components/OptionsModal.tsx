import React, { useState } from 'react';
import { TournamentSettings } from '../types';
import { X, Shield, Sparkles, Target, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: TournamentSettings;
  onSave: (settings: TournamentSettings) => void;
  hasCompletedMatches: boolean;
}

const OptionsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  hasCompletedMatches,
}) => {
  const [localSettings, setLocalSettings] = useState<TournamentSettings>(settings);
  const [showWarning, setShowWarning] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (hasCompletedMatches && !showWarning) {
      setShowWarning(true);
      return;
    }
    onSave(localSettings);
    onClose();
  };

  const handleClose = () => {
    setLocalSettings(settings);
    setShowWarning(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-foos-panel border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 className="text-lg font-black text-white uppercase italic tracking-wide">Tournament Options</h2>
          <button onClick={handleClose} className="text-slate-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Warning Banner */}
          {showWarning && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-amber-500 font-bold text-sm mb-1">Matches Already Played</div>
                <div className="text-amber-500/80 text-xs">
                  Changing settings mid-tournament may affect scoring fairness. Previous matches won't be recalculated.
                </div>
                <button
                  onClick={() => {
                    onSave(localSettings);
                    onClose();
                  }}
                  className="mt-3 text-xs font-bold text-amber-500 hover:text-amber-400 uppercase tracking-wide"
                >
                  Save Anyway
                </button>
              </div>
            </div>
          )}

          {/* Winning Score */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-foos-accent" />
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">First to Score</span>
            </div>
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-bold text-2xl">{localSettings.winningScore}</span>
                <span className="text-slate-500 text-sm">points to win</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={localSettings.winningScore}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, winningScore: parseInt(e.target.value) }))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-foos-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-bold">
                <span>1</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* Unicorn Bonus */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Unicorn Bonus</span>
            </div>
            <p className="text-slate-500 text-xs mb-3">
              Extra points awarded for a shutout victory ({localSettings.winningScore}-0)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([0, 1, 2] as const).map(value => (
                <button
                  key={value}
                  onClick={() => setLocalSettings(prev => ({ ...prev, unicornBonus: value }))}
                  className={`py-3 rounded-xl font-bold text-sm transition border ${
                    localSettings.unicornBonus === value
                      ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  +{value} pt{value !== 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Position Mode */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-foos-accent" />
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Positional Mode</span>
            </div>
            <button
              onClick={() => setLocalSettings(prev => ({ ...prev, isPositionMode: !prev.isPositionMode }))}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${
                localSettings.isPositionMode
                  ? 'bg-foos-accent/10 border-foos-accent'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="text-left">
                <div className={`font-bold ${localSettings.isPositionMode ? 'text-foos-accent' : 'text-slate-400'}`}>
                  {localSettings.isPositionMode ? 'Enabled' : 'Disabled'}
                </div>
                <div className="text-slate-500 text-xs">
                  Track attack & defense positions
                </div>
              </div>
              <div className={`w-12 h-7 rounded-full p-1 transition ${
                localSettings.isPositionMode ? 'bg-foos-accent' : 'bg-slate-700'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition transform ${
                  localSettings.isPositionMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-foos-accent hover:bg-cyan-400 text-slate-900 font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-500/20"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptionsModal;
