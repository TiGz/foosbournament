import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const UpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-foos-panel border border-foos-accent rounded-lg p-4 shadow-xl z-50 max-w-sm">
      <div className="flex items-start gap-3">
        <RefreshCw className="w-5 h-5 text-foos-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-white font-medium mb-2">Update Available</p>
          <p className="text-slate-400 text-sm mb-3">
            A new version of Foosbournament is ready.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="bg-foos-accent text-slate-900 px-4 py-2 rounded font-bold text-sm hover:bg-cyan-400 transition-colors"
            >
              Update Now
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="bg-slate-700 text-white px-4 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UpdatePrompt;
