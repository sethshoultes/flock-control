/**
 * Type definitions for OpenAI Vision API responses
 */

export interface ChickenCountResponse {
  count: number;
}

export interface OpenAIVisionError {
  message: string;
  type: string;
  code: string;
}

export interface OpenAIImageAnalysisRequest {
  image: string; // Base64 encoded image
}

// Vision API message content types
export interface VisionTextContent {
  type: 'text';
  text: string;
}

export interface VisionImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export type VisionContent = VisionTextContent | VisionImageContent;

export interface VisionMessage {
  role: 'user' | 'assistant' | 'system';
  content: VisionContent | VisionContent[];
}

// Helper function to validate base64 image
export function isValidBase64Image(str: string): boolean {
  if (!str?.startsWith('data:image/')) {
    return false;
  }

  try {
    // Check if it's a valid data URL format
    const [header, content] = str.split(',');
    if (!header?.includes('base64') || !content) {
      return false;
    }

    // Attempt to decode to verify it's valid base64
    atob(content);
    return true;
  } catch {
    return false;
  }
}

// Helper function to construct vision API message
export function constructVisionMessage(base64Image: string): VisionMessage {
  if (!isValidBase64Image(base64Image)) {
    throw new Error('Invalid base64 image format');
  }

  return {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'Count the number of chickens in this image. Respond with ONLY the number, no additional text.'
      },
      {
        type: 'image_url',
        image_url: {
          url: base64Image
        }
      }
    ]
  };
}

// Constants for API configuration
export const OPENAI_CONFIG = {
  MODEL: 'gpt-4-vision-preview', // Updated to the correct model name
  MAX_TOKENS: 100,
  TEMPERATURE: 0,
  RESPONSE_FORMAT: { type: 'json_object' as const }
} as const;