
import React, { useState, useRef } from 'react';
import { analyzeVideo } from '../services/geminiService';
import Button from './ui/Button';
import Loader from './ui/Loader';

const VideoAnalysisView: React.FC = () => {
  const [prompt, setPrompt] = useState('What are the key objects and actions in this video?');
  const [video, setVideo] = useState<{ file: File; preview: string } | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideo({ file, preview: URL.createObjectURL(file) });
      setResponse(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !video) {
      setError("Please upload a video and provide a question.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await analyzeVideo(prompt, video.file);
      setResponse(result.text);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze video.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
      <header className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Video Analysis (Gemini 2.5 Pro)</h2>
        <p className="text-sm text-gray-400">Upload a video and ask questions to get insights.</p>
        <p className="text-xs text-yellow-400 mt-1">Note: Direct video analysis is simulated. The model will describe *how* it would analyze the video.</p>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <input type="file" ref={fileInputRef} onChange={handleVideoChange} accept="video/*" className="hidden" />
          <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-full md:w-auto mb-4">
            {video ? 'Change Video' : 'Upload Video'}
          </Button>

          {video && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <video src={video.preview} controls className="rounded-md w-full mb-4" />
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">Your Question</label>
                    <textarea
                      id="prompt"
                      rows={3}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Summarize this video"
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Analyzing...' : 'Analyze Video'}
                  </Button>
                </form>
              </div>

              <div className="bg-gray-900 rounded-lg p-4">
                <h3 className="font-bold mb-2">Analysis Result</h3>
                {isLoading && <Loader text="Analyzing..." />}
                {error && <div className="text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}
                {response && <div className="text-gray-300 whitespace-pre-wrap">{response}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoAnalysisView;
