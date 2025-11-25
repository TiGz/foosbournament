
import React, { useState, useRef, useEffect } from 'react';
import { Player } from '../types';
import { createPlayer } from '../services/tournamentLogic';
import { generateAvatar } from '../services/geminiService';
import { Loader2, Camera, Sparkles, UserPlus, Trash2, ArrowRight, X, SwitchCamera, KeyRound } from 'lucide-react';

interface Props {
  players: Player[];
  onAddPlayer: (player: Player) => void;
  onRemovePlayer: (id: string) => void;
  onFinishSetup: () => void;
}

const PlayerSetup: React.FC<Props> = ({ players, onAddPlayer, onRemovePlayer, onFinishSetup }) => {
  const [nickname, setNickname] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Effect to handle camera stream initialization when isCameraOpen changes
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
        if (isCameraOpen) {
            // Give React a tick to ensure the video ref is populated
            if (!videoRef.current) return;

            try {
                // If we already have a stream, don't request it again
                if (!streamRef.current) {
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
                    });
                    
                    if (!mounted) {
                        stream.getTracks().forEach(track => track.stop());
                        return;
                    }
                    streamRef.current = stream;
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = streamRef.current;
                    await videoRef.current.play();
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                alert("Could not access camera. Please check permissions.");
                setIsCameraOpen(false);
            }
        } else {
            // If camera is closed, cleanup
            stopCamera();
        }
    };

    initCamera();

    return () => {
        mounted = false;
    };
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  };

  const startCamera = () => {
    setImagePreview(null);
    setIsCameraOpen(true);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Mirror the image to feel natural
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        
        // Resize for performance/API limits
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resizeImage(dataUrl, 800, (resized) => {
             setImagePreview(resized);
             setIsCameraOpen(false); // This triggers the useEffect to cleanup
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resizeImage(result, 800, (resized) => {
            setImagePreview(resized);
            setIsCameraOpen(false);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const resizeImage = (base64Str: string, maxWidth: number, callback: (str: string) => void) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = maxWidth / img.width;
        if (scale >= 1) {
            callback(base64Str);
            return;
        }
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
    }
  }

  const handleGenerateAvatar = async () => {
    if (!imagePreview) return;
    
    // Check if we need to select a key first
    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await window.aistudio.openSelectKey();
            // Assume success and proceed as per guidelines
        }
    }

    setIsGenerating(true);
    
    const tryGenerate = async () => {
        const base64Data = imagePreview.split(',')[1];
        return await generateAvatar(base64Data, nickname);
    };

    try {
        const newAvatar = await tryGenerate();
        setImagePreview(newAvatar);
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        
        // Handle Permission/Auth Errors by prompting for Key Selection
        const errMsg = error.toString().toLowerCase();
        const isAuthError = errMsg.includes('403') || 
                            errMsg.includes('404') || 
                            errMsg.includes('permission denied') || 
                            errMsg.includes('requested entity was not found') ||
                            errMsg.includes('api_key_missing');

        if (window.aistudio && isAuthError) {
             try {
                 await window.aistudio.openSelectKey();
                 
                 // Retry logic immediately
                 const newAvatar = await tryGenerate();
                 setImagePreview(newAvatar);
                 setIsGenerating(false);
                 return;
             } catch (retryError) {
                 console.error("Retry failed", retryError);
                 alert("Generation failed. Please ensure you select a valid paid API key.");
             }
        } else {
             alert(`AI Generation Failed: ${error.message || "Unknown error"}`);
        }
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) return;
    const player = createPlayer(nickname, imagePreview);
    onAddPlayer(player);
    // Reset form
    setNickname('');
    setImagePreview(null);
    setIsCameraOpen(false);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-foos-dark text-white p-8 flex flex-col items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-foos-brand/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl w-full space-y-8 relative z-10">
        <div className="text-center space-y-4 flex flex-col items-center">
          <img src="logo.jpeg" alt="Logo" className="h-40 md:h-56 object-contain drop-shadow-[0_0_25px_rgba(249,115,22,0.3)] hover:scale-105 transition duration-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-foos-panel p-6 rounded-2xl shadow-2xl border border-slate-800 shadow-black/50">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex flex-col gap-4">
                  {/* Photo Area */}
                  <div className={`relative w-full aspect-square max-w-[240px] mx-auto rounded-full bg-slate-900 border-2 border-dashed overflow-hidden shadow-inner group transition-colors ${
                      !nickname.trim() ? 'border-slate-800 opacity-50' : 'border-slate-600 opacity-100'
                  }`}>
                    
                    {/* State: Camera Open */}
                    {isCameraOpen ? (
                        <>
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted
                                className="w-full h-full object-cover transform -scale-x-100"
                            />
                            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
                                <button 
                                    type="button" 
                                    onClick={capturePhoto}
                                    className="bg-white text-slate-900 rounded-full p-3 shadow-lg hover:scale-110 transition border-4 border-slate-200"
                                >
                                    <div className="w-4 h-4 bg-slate-900 rounded-full"></div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCameraOpen(false)}
                                    className="bg-slate-800/80 text-white rounded-full p-2 hover:bg-red-500 transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        /* State: Image Preview or Placeholder */
                        <>
                             {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                    <Camera className="w-10 h-10" />
                                    <span className="text-xs font-bold uppercase">No Photo</span>
                                </div>
                             )}
                             
                             {/* Overlay Loader */}
                             {isGenerating && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-foos-brand z-20">
                                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
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
                                className={`text-sm px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 border ${
                                    !nickname.trim() 
                                    ? 'bg-slate-800/50 text-slate-600 border-slate-800 cursor-not-allowed' 
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                }`}
                            >
                                <SwitchCamera className="w-4 h-4" /> Webcam
                            </button>
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!nickname.trim()}
                                className={`text-sm px-4 py-2 rounded-lg font-bold transition border ${
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
                        className="text-sm bg-foos-brand hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 font-bold shadow-lg shadow-orange-500/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        AI Makeover
                      </button>
                    )}
                  </div>
                  
                  {!nickname.trim() && !isCameraOpen && (
                    <div className="w-full text-center text-xs text-slate-500 font-bold uppercase tracking-wider mt-0 animate-pulse">
                        Enter Nickname to unlock camera
                    </div>
                  )}

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
                className="w-full bg-foos-accent hover:bg-cyan-400 text-slate-900 font-black tracking-wide py-3 rounded-lg flex items-center justify-center gap-2 transition transform active:scale-95 shadow-lg shadow-cyan-500/20"
              >
                <UserPlus className="w-5 h-5" />
                ADD PLAYER
              </button>
            </form>
            
            {window.aistudio && (
                <div className="mt-4 text-center">
                    <button 
                        onClick={() => window.aistudio?.openSelectKey()}
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto"
                    >
                        <KeyRound className="w-3 h-3" /> Change API Key
                    </button>
                    <div className="text-[10px] text-slate-600 mt-1">
                        AI features require a paid Gemini API Key. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline hover:text-slate-400">Billing Info</a>
                    </div>
                </div>
            )}
          </div>

          {/* List */}
          <div className="bg-foos-panel p-6 rounded-2xl shadow-2xl border border-slate-800 shadow-black/50 flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black text-white uppercase italic">Roster ({players.length})</h2>
                <button 
                  onClick={onFinishSetup}
                  disabled={players.length < 4}
                  className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg transition ${
                    players.length >= 4 
                    ? 'bg-foos-brand text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20' 
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  START <ArrowRight className="w-5 h-5" />
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[400px]">
                {players.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
                        No players added yet.
                    </div>
                )}
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800 group hover:border-slate-700 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden ring-2 ring-slate-800 group-hover:ring-foos-accent transition">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-slate-800 text-slate-500">
                            {p.nickname.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-foos-accent transition">{p.nickname}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemovePlayer(p.id)}
                      className="text-slate-600 hover:text-foos-red transition p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerSetup;
