
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import Button from './ui/Button';
import Loader from './ui/Loader';
import type { AspectRatio } from '../types';

const ImageGenView: React.FC = () => {
  const [prompt, setPrompt] = useState('A photorealistic image of a futuristic city on Mars, with sleek buildings and flying vehicles.');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setImage(null);

    try {
      const base64Image = await generateImage(prompt, aspectRatio);
      setImage(`data:image/png;base64,${base64Image}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <header className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Image Generation (Imagen 4)</h2>
        <p className="text-sm text-gray-400">Create high-quality images from text prompts.</p>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">Prompt</label>
            <textarea
              id="prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., A majestic lion wearing a crown in a lush jungle"
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
            <select
              id="aspectRatio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            >
              {aspectRatios.map(ar => <option key={ar} value={ar}>{ar}</option>)}
            </select>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Generating...' : 'Generate Image'}
          </Button>
        </form>

        {error && <div className="mt-6 text-center text-red-400 bg-red-900/50 p-3 rounded-md max-w-2xl mx-auto">{error}</div>}

        <div className="mt-6 max-w-2xl mx-auto">
          {isLoading && <Loader text="Generating image, this may take a moment..." />}
          {image && (
            <div className="bg-gray-900 p-2 rounded-lg shadow-lg">
                <img src={image} alt="Generated" className="rounded-md w-full h-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenView;
