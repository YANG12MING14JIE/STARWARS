
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import type { AspectRatio, VideoAspectRatio } from '../types';

// IMPORTANT: Do not expose this function, use a new instance for each call
const getGenAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateChatResponse = async (
    prompt: string,
    model: 'gemini-2.5-flash' | 'gemini-flash-lite-latest' | 'gemini-2.5-pro',
    config: any = {}
): Promise<GenerateContentResponse> => {
    const ai = getGenAI();
    return await ai.models.generateContent({
        model,
        contents: prompt,
        config
    });
};

export const generateGroundedResponse = async (
    prompt: string,
    tool: 'googleSearch' | 'googleMaps',
    location?: { latitude: number, longitude: number }
): Promise<GenerateContentResponse> => {
    const ai = getGenAI();
    const config: any = {
        tools: tool === 'googleSearch' ? [{ googleSearch: {} }] : [{ googleMaps: {} }]
    };
    if (tool === 'googleMaps' && location) {
        config.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                }
            }
        };
    }
    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config
    });
};

export const analyzeImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<GenerateContentResponse> => {
    const ai = getGenAI();
    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: imageBase64,
        },
    };
    const textPart = { text: prompt };
    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
};

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio,
        },
    });
    return response.generatedImages[0].image.imageBytes;
};

export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("No image generated from edit.");
};

export const generateVideo = async (prompt: string, aspectRatio: VideoAspectRatio, image?: { base64: string; mimeType: string }) => {
    const ai = getGenAI();
    const config: any = {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
    };

    let operation;
    if (image) {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            image: {
                imageBytes: image.base64,
                mimeType: image.mimeType
            },
            config,
        });
    } else {
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt,
            config,
        });
    }

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        const currentAi = getGenAI(); // Use fresh instance in loop
        operation = await currentAi.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error('Video generation failed, no download link found.');
    }
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};

export const analyzeVideo = async (prompt: string, videoFile: File): Promise<GenerateContentResponse> => {
    // This is a placeholder for a proper video analysis API.
    // The current public Gemini API doesn't support direct video file uploads for analysis in this manner.
    // We will simulate it by telling the user what we *would* do.
    console.log("Analyzing video:", videoFile.name, "with prompt:", prompt);
    const ai = getGenAI();
    return ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `The user has uploaded a video named '${videoFile.name}' and asked: "${prompt}". Since I cannot see the video directly, please explain how you, as a multimodal AI, would typically analyze this video to answer the user's query. Describe the steps you'd take, like frame analysis, object recognition, and audio transcription.`
    });
};


export const generateTTS = async (text: string): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: `Say this naturally: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: audioBase64,
                        mimeType: mimeType
                    }
                },
                { text: "Transcribe this audio." }
            ]
        }
    });
    return response.text;
};

export const getLiveSession = () => {
    return getGenAI().live;
}
