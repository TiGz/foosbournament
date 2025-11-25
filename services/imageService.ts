/**
 * Image manipulation utilities for avatar handling
 */

export const DEFAULT_MAX_IMAGE_WIDTH = 800;

/**
 * Resize an image to a maximum width while preserving aspect ratio
 */
export const resizeImage = (base64Str: string, maxWidth: number = DEFAULT_MAX_IMAGE_WIDTH): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const scale = maxWidth / img.width;
      if (scale >= 1) {
        resolve(base64Str);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
  });
};

/**
 * Capture a frame from a video element (webcam)
 * Optionally mirror the image horizontally (for selfie-style capture)
 */
export const captureFromVideo = (video: HTMLVideoElement, mirror: boolean = true): string => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (ctx && mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx?.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8);
};

/**
 * Read a file and convert to base64 data URL
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
