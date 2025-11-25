
import { GoogleGenAI } from "@google/genai";

// Avatar customization options - randomly selected for each generation
const ACCESSORIES = [
  "a giant sombrero",
  "pixelated 8-bit sunglasses",
  "a magnificent curly handlebar mustache",
  "a viking helmet with horns",
  "a fancy golden monocle",
  "a sparkling crown",
  "a backwards baseball cap",
  "oversized hoop earrings",
  "a wizard hat with stars",
  "a superhero mask",
  "a pirate eyepatch and bandana",
  "a top hat with a feather",
  "neon LED glasses",
  "a headband with sweatband",
  "a pair of devil horns",
  "angel wings halo combo",
  "a space helmet visor",
  "a samurai headband",
];

const NICKNAME_PLACEMENTS = [
  "on a thick gold chain necklace",
  "written on a baseball cap",
  "on the front of a sports jersey",
  "as a glowing neon sign floating nearby",
  "tattooed on the forearm",
  "on a championship belt",
  "embroidered on a headband",
  "on a name badge/lanyard",
  "written in graffiti style behind them",
  "as a floating holographic text",
  "on a medallion",
];

const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getApiKey = (): string | null => {
  return localStorage.getItem('gemini_api_key') || process.env.API_KEY || null;
};

export const hasApiKey = (): boolean => {
  return !!getApiKey();
};

export const setApiKey = (key: string): void => {
  localStorage.setItem('gemini_api_key', key);
};

export const clearApiKey = (): void => {
  localStorage.removeItem('gemini_api_key');
};

export const generateAvatar = async (base64Image: string, nickname: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // Using Nano Banana Pro (Gemini 3 Pro Image) as requested for high quality editing
  const model = 'gemini-3-pro-image-preview'; 

  // Randomly select options for this avatar
  const accessory = pickRandom(ACCESSORIES);
  const nicknamePlacement = pickRandom(NICKNAME_PLACEMENTS);

  const prompt = `
    Edit this photo of a person for a fun foosball tournament app.

    Tasks:
    1. REMOVE the original background completely. Replace it with a clean, dramatic gradient background (Deep Blue to Neon Orange).
    2. Add ${accessory} to the person as a fun accessory.
    3. Display the nickname "${nickname}" ${nicknamePlacement}. Make sure it's clearly visible and readable.
    4. Make the character look slightly stylized (3D render or high-quality cartoon style), but keep the face recognizable.
    5. Ensure the lighting matches a "Cyberpunk Sports" aesthetic (Orange/Teal rim lights).

    Aspect Ratio: 1:1
    Output: High quality image.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          text: prompt,
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
      ],
    },
    config: {
      imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
      }
    }
  });

  // Check for image in response parts
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/jpeg;base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("No image generated in response");
};