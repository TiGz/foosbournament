import React, { useEffect } from 'react';
import { useImageCapture } from '../hooks/useImageCapture';
import { useAvatarQueue } from '../hooks/useAvatarQueue';
import { Camera, X, SwitchCamera, Sparkles, Loader2, KeyRound } from 'lucide-react';
import { Toast } from '../types';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageUrl: string | null) => void;
  currentImageUrl?: string | null;
  playerNickname?: string;
  playerId?: string;
  title?: string;
  addToast?: (toast: Omit<Toast, 'id'>) => string;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  currentImageUrl = null,
  playerNickname = '',
  playerId,
  title = 'Edit Avatar',
  addToast,
}) => {
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
  } = useImageCapture({ initialImage: currentImageUrl, addToast });

  const { startGeneration, isGenerating: isGeneratingInBackground } = useAvatarQueue();
  const isPlayerGenerating = playerId ? isGeneratingInBackground(playerId) : false;

  // Reset to current image when modal opens
  useEffect(() => {
    if (isOpen) {
      setImagePreview(currentImageUrl);
    } else {
      stopCamera();
    }
  }, [isOpen, currentImageUrl, setImagePreview, stopCamera]);

  const handleAiMakeover = () => {
    // If we have a playerId, use background generation
    if (playerId && imagePreview && canStartBackgroundGeneration()) {
      startGeneration(playerId, playerNickname, imagePreview);
      if (addToast) {
        addToast({ type: 'info', message: `AI Makeover started for ${playerNickname}` });
      }
      // Close the modal immediately - generation happens in background
      onClose();
    } else {
      // Fallback to blocking generation (shouldn't happen if playerId is provided)
      generateAiAvatar(playerNickname);
    }
  };

  const handleSave = () => {
    onSave(imagePreview);
    onClose();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="bg-foos-panel rounded-2xl p-6 max-w-md w-full border border-slate-700 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white uppercase italic">{title}</h3>
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Avatar Preview Area */}
          <div className={`relative w-48 h-48 mx-auto rounded-full bg-slate-900 border-2 border-dashed overflow-hidden shadow-inner ${
            isPlayerGenerating ? 'border-foos-brand animate-pulse' : 'border-slate-600'
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

                {/* Show generating badge when background generation is active */}
                {isPlayerGenerating && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-foos-brand rounded-full flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Generating in background message */}
          {isPlayerGenerating && (
            <p className="text-center text-foos-brand text-xs mt-2 animate-pulse">
              Avatar generating in background...
            </p>
          )}

          {/* Control Buttons */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {!isCameraOpen && (
              <>
                <button
                  type="button"
                  onClick={startCamera}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 border bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                >
                  <SwitchCamera className="w-3 h-3" /> Webcam
                </button>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold transition border bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                >
                  Upload
                </button>
              </>
            )}

            {imagePreview && !isCameraOpen && (
              <button
                type="button"
                onClick={handleAiMakeover}
                disabled={isGenerating || isPlayerGenerating}
                className="text-xs bg-foos-brand hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1 font-bold shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3 h-3" />
                AI Makeover
              </button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {/* API Key Link */}
          <div className="mt-3 text-center">
            <button
              onClick={() => hasKey ? handleClearApiKey() : setShowApiKeyModal(true)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto"
            >
              <KeyRound className="w-3 h-3" /> {hasKey ? 'Clear API Key' : 'Set API Key'}
            </button>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-lg transition border border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-foos-accent hover:bg-cyan-400 text-slate-900 font-black py-2.5 rounded-lg transition shadow-lg shadow-cyan-500/20"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
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
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-foos-accent underline">
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
    </>
  );
};

export default AvatarEditor;
