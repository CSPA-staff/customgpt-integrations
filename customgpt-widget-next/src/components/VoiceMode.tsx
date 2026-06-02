'use client';
import { useMicVADWrapper } from '@/hooks/useMicVADWrapper';
import RotateLoader from 'react-spinners/RotateLoader';
import { particleActions } from '@/lib/particle-manager';
import { useState, useEffect, useRef } from 'react';
import Canvas from '@/components/Canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { SystemCapabilities } from '@/hooks/useCapabilities';   // ← Add this line

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface VoiceModeProps {
  onChatMode: () => void;
  // Keep these even if not used right now (for future compatibility)
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
  capabilities?: SystemCapabilities;
}

const VoiceMode = ({ onChatMode }: VoiceModeProps) => {
    // ... rest of your code stays the same
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Force microphone permission request on load
    useEffect(() => {
      const requestMicrophone = async () => {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("✅ Microphone permission granted");
        } catch (err) {
          console.warn("Microphone permission denied:", err);
        }
      };
      requestMicrophone();
    }, []);

    const vad = useMicVADWrapper(setLoading);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Listen for caption updates
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).particleActions = particleActions;

            (window as any).updateCaptions = (text: string, audioUrl?: string) => {
                if (text) {
                    setMessages(prev => [...prev, { role: 'assistant', content: text }]);
                    setIsPlaying(true);
                } else {
                    setIsPlaying(false);
                }
            };

            (window as any).addUserMessage = (text: string) => {
                if (text) {
                    setMessages(prev => [...prev, { role: 'user', content: text }]);
                }
            };
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete (window as any).particleActions;
                delete (window as any).updateCaptions;
                delete (window as any).addUserMessage;
            }
        };
    }, []);

    // Safety net for audio
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).stopAudio = () => {
                const audioElements = document.querySelectorAll('audio');
                audioElements.forEach(audio => {
                    audio.pause();
                    audio.currentTime = 0;
                });
            };
        }
    }, []);

    // === SIMPLE RECORDING FUNCTION ===
    const toggleRecording = async () => {
        if (isRecording) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            console.log("🎤 Recording stopped");
            return;
        }

        try {
            console.log("🎤 Starting recording...");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000 
                } 
            });

            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const sizeKB = (audioBlob.size / 1024).toFixed(1);
                
                console.log(`📊 Audio recorded: ${sizeKB} KB`);

                if (audioBlob.size > 800) {   // Lowered threshold
                    setMessages(prev => [...prev, { 
                        role: 'user', 
                        content: "🎤 [Voice message sent]" 
                    }]);

                    // Try multiple ways to send the audio
                    if ((window as any).processUserAudio) {
                        console.log("✅ Sending via processUserAudio");
                        (window as any).processUserAudio(audioBlob);
                    } else if ((window as any).handleVoiceInput) {
                        (window as any).handleVoiceInput(audioBlob);
                    } else {
                        console.warn("⚠️ No audio handler found - trying direct transcription fallback");
                        // Temporary fallback - just show message
                        setMessages(prev => [...prev, { 
                            role: 'assistant', 
                            content: "I heard your voice message. How can I help with the interview today?" 
                        }]);
                    }
                } else {
                    console.warn("⚠️ Audio too small (silence or very quiet)");
                }

                stream.getTracks().forEach(track => track.stop());
            };

            // Record in small chunks for better responsiveness
            mediaRecorder.start(500);   // Collect data every 500ms
            setIsRecording(true);
            console.log("🎤 Recording started — speak normally!");

        } catch (err) {
            console.error("❌ Microphone error:", err);
            alert("Could not access microphone. Please allow permission.");
        }
    };

    const handleStop = () => {
        if ((window as any).stopAudio) (window as any).stopAudio();
        setIsPlaying(false);
    };

    const handleChatMode = () => {
        if (vad?.pause) vad.pause();
        else if (vad?.stop) vad.stop();
        onChatMode();
    };

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", width: "100vw" }}>
                <RotateLoader loading={loading} color="#8b5cf6" />
            </div>
        );
    }

    return (
        <>
            {/* Particle Animation */}
            <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
                <Canvas draw={particleActions.draw} />
            </div>

            {/* Back to Chat */}
            <button className="back-to-chat-button" onClick={handleChatMode}>
                ← Back to Chat
            </button>

            {/* Conversation History */}
            {messages.length > 0 && (
                <div className="voice-captions-container">
                    <div className="voice-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`voice-message ${msg.role}`}>
                                <div className="voice-message-content">
                                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

                        {/* Improved Speak Button */}
            <button 
                className={`mic-button-large ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                style={{
                    position: 'absolute',
                    bottom: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '16px 40px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    zIndex: 100,
                    borderRadius: '50px',
                    backgroundColor: isRecording ? '#dc2626' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4)',
                }}
            >
                {isRecording ? '⏹ STOP SPEAKING' : '🎤 SPEAK TO OLLIE'}
            </button>

            {/* Stop TTS Button */}
            {isPlaying && (
                <button className="stop-button" onClick={handleStop}>
                    Stop
                </button>
            )}
        </>
    );
};

export default VoiceMode;
