
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateVideo } from '../services/geminiService';
import Button from './ui/Button';
import Loader from './ui/Loader';
import type { VideoAspectRatio } from '../types';
import { fileToBase64 } from '../utils';
import VideoIcon from './icons/VideoIcon';

const VideoGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('A neon hologram of a cat driving a sports car at top speed through a futuristic city.');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isKeySelected, setIsKeySelected] = useState(false);
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKey = useCallback(async () => {
    setIsCheckingKey(true);
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setIsKeySelected(hasKey);
    }
    setIsCheckingKey(false);
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume success and re-check, or just set to true to avoid race conditions.
      setIsKeySelected(true);
      checkApiKey(); // Re-verify
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage({ file, preview: URL.createObjectURL(file) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      let imagePayload;
      if (image) {
        const base64 = await fileToBase64(image.file);
        imagePayload = { base64, mimeType: image.file.type };
      }
      const url = await generateVideo(prompt, aspectRatio, imagePayload);
      setVideoUrl(url);
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to generate video.';
      if (errorMessage.includes("Requested entity was not found.")) {
          errorMessage = "API Key not found or invalid. Please select a valid key.";
          setIsKeySelected(false);
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isCheckingKey) {
    return <div className="flex items-center justify-center h-full"><Loader text="Checking API Key status..." /></div>;
  }

  if (!isKeySelected) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-2xl font-bold mb-4">API Key Required for Veo</h2>
            <p className="text-gray-400 mb-6 max-w-md">Video generation with Veo requires you to select an API key. This key must be enabled for the AI Platform API.</p>
            <Button onClick={handleSelectKey}>Select API Key</Button>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="mt-4 text-sm text-indigo-400 hover:underline">
                Learn more about billing
            </a>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <header className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Video Generation (Veo)</h2>
        <p className="text-sm text-gray-400">Create high-quality videos from text prompts and optional images.</p>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">Prompt</label>
                <textarea
                id="prompt"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="A cinematic shot of a hummingbird in slow motion..."
                disabled={isLoading}
                />
            </div>
            <div>
                <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
                <select
                id="aspectRatio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
                >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Optional Starting Image</label>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    {image ? 'Change Image' : 'Upload Image'}
                </Button>
                {image && <img src={image.preview} alt="preview" className="h-20 w-auto object-cover rounded mt-2" />}
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Generating Video...' : 'Generate Video'}
            </Button>
            </form>
            
            <div className="flex flex-col items-center justify-center bg-gray-900 rounded-lg p-4">
                {isLoading && <Loader text="Generating video... This can take a few minutes." />}
                {error && <div className="text-center text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}
                {videoUrl && (
                    <video src={videoUrl} controls autoPlay loop className="rounded-md w-full h-auto" />
                )}
                {!isLoading && !videoUrl && !error && (
                    <div className="text-center text-gray-500">
                        {/* FIX: Added missing import for VideoIcon */}
                        <VideoIcon className="w-16 h-16 mx-auto mb-4" />
                        <p>Your generated video will appear here.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default VideoGenView;
