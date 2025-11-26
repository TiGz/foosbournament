import React, { useState, useRef, useEffect, useCallback } from 'react';
import { captureFromVideo, fileToBase64 } from '../services/imageService';
import { generateAvatar, hasApiKey, setApiKey, clearApiKey } from '../services/geminiService';
import { Toast } from '../types';

type AddToast = (toast: Omit<Toast, 'id'>) => string;

interface UseImageCaptureOptions {
  initialImage?: string | null;
  addToast?: AddToast;
}

interface UseImageCaptureReturn {
  // State
  imagePreview: string | null;
  setImagePreview: (url: string | null) => void;
  isCameraOpen: boolean;
  isGenerating: boolean;

  // Camera
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => void;
  stopCamera: () => void;
  capturePhoto: () => void;

  // File upload
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  triggerFileInput: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  // AI generation
  generateAiAvatar: (nickname: string) => Promise<void>;

  // API key management
  hasKey: boolean;
  showApiKeyModal: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  apiKeyInput: string;
  setApiKeyInput: (key: string) => void;
  handleSaveApiKey: () => void;
  handleClearApiKey: () => void;

  // Utilities
  clearImage: () => void;

  // Pre-flight check for background generation
  canStartBackgroundGeneration: () => boolean;
}

export const useImageCapture = (options?: UseImageCaptureOptions): UseImageCaptureReturn => {
  const [imagePreview, setImagePreview] = useState<string | null>(options?.initialImage ?? null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(hasApiKey());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addToast = options?.addToast;

  // Stop camera utility
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle camera stream initialization
  useEffect(() => {
    let mounted = true;

    const initCamera = async () => {
      if (isCameraOpen) {
        if (!videoRef.current) return;

        try {
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
          if (addToast) {
            addToast({ type: 'error', message: 'Could not access camera. Please check permissions.' });
          }
          setIsCameraOpen(false);
        }
      } else {
        stopCamera();
      }
    };

    initCamera();

    return () => {
      mounted = false;
    };
  }, [isCameraOpen, stopCamera, addToast]);

  const startCamera = useCallback(() => {
    setImagePreview(null);
    setIsCameraOpen(true);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const dataUrl = captureFromVideo(videoRef.current, true);
      setImagePreview(dataUrl);
      setIsCameraOpen(false);
    }
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
      setIsCameraOpen(false);
    }
  }, []);

  // Check if background generation can be started (for pre-flight validation)
  const canStartBackgroundGeneration = useCallback((): boolean => {
    if (!imagePreview) return false;

    if (!navigator.onLine) {
      if (addToast) {
        addToast({ type: 'error', message: 'AI Makeover requires an internet connection. Please try again when online.' });
      }
      return false;
    }

    if (!hasApiKey()) {
      setShowApiKeyModal(true);
      return false;
    }

    return true;
  }, [imagePreview, addToast]);

  // Original blocking generation (kept for backwards compatibility in preview mode)
  const generateAiAvatar = useCallback(async (nickname: string) => {
    if (!imagePreview) return;

    if (!navigator.onLine) {
      if (addToast) {
        addToast({ type: 'error', message: 'AI Makeover requires an internet connection. Please try again when online.' });
      }
      return;
    }

    if (!hasApiKey()) {
      setShowApiKeyModal(true);
      return;
    }

    setIsGenerating(true);

    try {
      const base64Data = imagePreview.split(',')[1];
      const newAvatar = await generateAvatar(base64Data, nickname);
      setImagePreview(newAvatar);
    } catch (error: unknown) {
      console.error("Gemini Generation Error:", error);

      const errMsg = String(error).toLowerCase();
      const isAuthError = errMsg.includes('403') ||
        errMsg.includes('401') ||
        errMsg.includes('api_key_missing') ||
        errMsg.includes('invalid');

      if (isAuthError) {
        setShowApiKeyModal(true);
      } else {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (addToast) {
          addToast({ type: 'error', message: `AI Generation Failed: ${message}` });
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }, [imagePreview, addToast]);

  const handleSaveApiKey = useCallback(() => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim());
      setHasKey(true);
      setShowApiKeyModal(false);
      setApiKeyInput('');
    }
  }, [apiKeyInput]);

  const handleClearApiKey = useCallback(() => {
    clearApiKey();
    setHasKey(false);
  }, []);

  const clearImage = useCallback(() => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return {
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
    clearImage,
    canStartBackgroundGeneration,
  };
};
