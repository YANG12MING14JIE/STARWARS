
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, GroundingChunk } from '../types';
import { generateChatResponse, generateGroundedResponse, analyzeImage, generateTTS } from '../services/geminiService';
import Button from './ui/Button';
import Loader from './ui/Loader';
import { fileToBase64, decode, decodeAudioData } from '../utils';
import { useGeolocation } from '../hooks/useGeolocation';
import { GoogleGenAI } from '@google/genai';

type ChatMode = 'standard' | 'low_latency' | 'thinking' | 'search' | 'maps';

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: '你好！我是 Gemini。你對星際大戰有什麼看法? (Hello! I am Gemini. What are your thoughts on Star Wars?)' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('standard');
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const { data: locationData, error: locationError } = useGeolocation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const playAudio = useCallback(async (base64Audio: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (e) {
      console.error("Error playing TTS audio:", e);
      setError("Failed to play audio response.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !image) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      image: image?.preview,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setImage(null);
    setIsLoading(true);
    setError(null);

    try {
      let response;
      if (image) {
        const imageBase64 = await fileToBase64(image.file);
        response = await analyzeImage(input, imageBase64, image.file.type);
      } else {
        switch (chatMode) {
            case 'low_latency':
                // FIX: Corrected model name from 'gemini-2.5-flash-lite' to 'gemini-flash-lite-latest'.
                response = await generateChatResponse(input, 'gemini-flash-lite-latest');
                break;
            case 'thinking':
                response = await generateChatResponse(input, 'gemini-2.5-pro', { thinkingConfig: { thinkingBudget: 32768 } });
                break;
            case 'search':
                response = await generateGroundedResponse(input, 'googleSearch');
                break;
            case 'maps':
                if (locationError) {
                    throw new Error("Geolocation is required for Maps mode but permission was denied or an error occurred.");
                }
                if (!locationData) {
                    throw new Error("Still waiting for geolocation data. Please try again in a moment.");
                }
                response = await generateGroundedResponse(input, 'googleMaps', locationData.coords);
                break;
            case 'standard':
            default:
                response = await generateChatResponse(input, 'gemini-2.5-flash');
                break;
        }
      }
      
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
      };
      
      setMessages((prev) => [...prev, modelMessage]);

      if (isTtsEnabled) {
          const ttsAudio = await generateTTS(response.text);
          await playAudio(ttsAudio);
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      setMessages((prev) => [...prev, { id: 'error', role: 'model', text: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage({ file, preview: URL.createObjectURL(file) });
    }
  };
  
  const modeConfig = {
    standard: { label: 'Standard', model: 'gemini-2.5-flash'},
    low_latency: { label: 'Low Latency', model: 'gemini-flash-lite-latest'},
    thinking: { label: 'Complex', model: 'gemini-2.5-pro'},
    search: { label: 'Web Search', model: 'gemini-2.5-flash'},
    maps: { label: 'Maps Search', model: 'gemini-2.5-flash'},
  }

  return (
    <div className="flex flex-col h-full bg-gray-800">
        <header className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold">Multimodal Chat</h2>
            <div className="flex items-center gap-4 mt-2 text-sm">
                <label>Chat Mode:</label>
                <select value={chatMode} onChange={e => setChatMode(e.target.value as ChatMode)} className="bg-gray-700 rounded p-1">
                    {Object.entries(modeConfig).map(([key, value]) => 
                        <option key={key} value={key}>{value.label} ({value.model})</option>
                    )}
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isTtsEnabled} onChange={() => setIsTtsEnabled(!isTtsEnabled)} className="form-checkbox bg-gray-700 text-indigo-500"/>
                    <span>Enable TTS</span>
                </label>
            </div>
            {chatMode === 'maps' && locationError && <p className="text-red-400 text-xs mt-1">Maps mode disabled: {locationError.message}</p>}
        </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
              {msg.image && <img src={msg.image} alt="user upload" className="rounded-md mb-2 max-w-xs" />}
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.groundingChunks && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <h4 className="font-bold text-sm text-gray-300 mb-1">Sources:</h4>
                  <ul className="text-xs space-y-1">
                    {msg.groundingChunks.map((chunk, index) => (
                      <li key={index} className="truncate">
                        {chunk.web && <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{chunk.web.title}</a>}
                        {chunk.maps && <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{chunk.maps.title}</a>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-lg bg-gray-700">
              <Loader size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className="p-4 text-red-400 bg-red-900/50">{error}</div>}

      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
          </Button>
          <div className="flex-1 relative">
            {image && (
              <div className="absolute bottom-12 left-0 p-1 bg-gray-900/80 rounded">
                <img src={image.preview} alt="preview" className="h-10 w-10 object-cover rounded" />
                <button type="button" onClick={() => setImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-4 w-4 text-xs leading-none">&times;</button>
              </div>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message or upload an image..."
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;
