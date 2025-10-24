
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getLiveSession } from '../services/geminiService';
import Button from './ui/Button';
import { encode, decode, decodeAudioData } from '../utils';
// FIX: Changed Modality to a value import and added missing LiveIcon import
import type { GoogleGenAI, LiveServerMessage, Blob, LiveSession } from "@google/genai";
import { Modality } from "@google/genai";
import LiveIcon from './icons/LiveIcon';


const LiveConversationView: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptions, setTranscriptions] = useState<{user: string, model: string}[]>([]);
    const [currentTranscription, setCurrentTranscription] = useState({user: '', model: ''});
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const cleanup = useCallback(() => {
        if(sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        setIsActive(false);
        setIsConnecting(false);
    }, []);
    
    // Ensure cleanup on component unmount
    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const startConversation = async () => {
        if (isActive || isConnecting) return;
        
        setIsConnecting(true);
        setError(null);
        setTranscriptions([]);
        setCurrentTranscription({user: '', model: ''});

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const live = getLiveSession();
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            
            sessionPromiseRef.current = live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsActive(true);
                        
                        const source = audioContextRef.current!.createMediaStreamSource(stream);
                        scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };

                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTranscription(prev => ({...prev, user: prev.user + message.serverContent.inputTranscription.text}));
                        }
                         if (message.serverContent?.outputTranscription) {
                            setCurrentTranscription(prev => ({...prev, model: prev.model + message.serverContent.outputTranscription.text}));
                        }
                        if (message.serverContent?.turnComplete) {
                            setTranscriptions(prev => [...prev, currentTranscription]);
                            setCurrentTranscription({user: '', model: ''});
                        }
                        
                        // Handle audio playback
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            
                            source.onended = () => { sourcesRef.current.delete(source); };
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(s => s.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setError(`An error occurred: ${e.message}`);
                        cleanup();
                    },
                    onclose: (e: CloseEvent) => {
                        cleanup();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: 'You are a friendly, conversational AI assistant.',
                },
            });
        } catch (err: any) {
            setError(err.message || 'Failed to start conversation. Check microphone permissions.');
            setIsConnecting(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-gray-800">
            <header className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold">Live Conversation</h2>
                <p className="text-sm text-gray-400">Speak directly with Gemini in real-time.</p>
            </header>
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className={`mb-8 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-green-500 shadow-2xl animate-pulse' : 'bg-gray-700'}`}>
                    <LiveIcon className="w-16 h-16" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                    {isActive ? "Conversation Active" : isConnecting ? "Connecting..." : "Ready to Talk"}
                </h3>
                <p className="text-gray-400 mb-8">{isActive ? "Speak into your microphone." : "Press start to begin."}</p>
                
                {!isActive && (
                    <Button onClick={startConversation} disabled={isConnecting}>
                        {isConnecting ? "Starting..." : "Start Conversation"}
                    </Button>
                )}
                {isActive && (
                    <Button onClick={cleanup} variant="danger">
                        End Conversation
                    </Button>
                )}
                {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>
             <div className="h-1/3 bg-gray-900 p-4 overflow-y-auto border-t border-gray-700">
                <h4 className="font-bold mb-2 text-gray-400">Live Transcript</h4>
                <div className="space-y-4 text-sm">
                    {transcriptions.map((t, i) => (
                        <div key={i}>
                            <p><span className="font-bold text-indigo-400">You:</span> {t.user}</p>
                            <p><span className="font-bold text-teal-400">Gemini:</span> {t.model}</p>
                        </div>
                    ))}
                    {(currentTranscription.user || currentTranscription.model) && (
                        <div>
                             <p className="text-gray-500"><span className="font-bold text-indigo-400">You:</span> {currentTranscription.user}</p>
                             <p className="text-gray-500"><span className="font-bold text-teal-400">Gemini:</span> {currentTranscription.model}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveConversationView;
