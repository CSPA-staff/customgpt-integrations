'use client';

import Canvas from '@/components/Canvas';
import { SystemCapabilities } from '@/hooks/useCapabilities';
import { particleActions } from '@/lib/particle-manager';
import { processAudioBlob } from '@/lib/speech-manager';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

interface Message {
 role: 'user' | 'assistant';
  content: string;
}

interface VoiceModeProps {
  onChatMode: () => void;
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
  capabilities?: SystemCapabilities;
}

type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking';

const VoiceMode = ({ onChatMode }: VoiceModeProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    (window as any).particleActions = particleActions;
    (window as any).updateCaptions = (text: string) => {
      if (text) {
        setMessages(previous => [...previous, { role: 'assistant', content: text }]);
        setVoiceState('speaking');
      } else {
        setVoiceState('idle');
      }
    };
    (window as any).addUserMessage = (text: string) => {
      if (text) setMessages(previous => [...previous, { role: 'user', content: text }]);    
    };

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      (window as any).stopAudio?.();
      delete (window as any).particleActions;
      delete (window as any).updateCaptions;
      delete (window as any).addUserMessage;
    };
  }, []);

  const finishRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setVoiceState('processing');
        particleActions.onProcessing();
        try {
          await processAudioBlob(audio);
        } catch (recordingError) {
          console.error('[VoiceMode] Voice request failed:', recordingError);
          setError(recordingError instanceof Error ? recordingError.message : 'Ollie could not process that recording. Please try again.');
          setVoiceState('idle');
          particleActions.reset();
        }
      };
      recorder.start(250);
      setVoiceState('recording');
      particleActions.onUserSpeaking();
    } catch (microphoneError) {
      console.error('[VoiceMode] Microphone access failed:', microphoneError);
      setError('Microphone access is required. Please allow it in your browser and try again.');
      setVoiceState('idle');
    }
  };

  const handlePrimaryAction = () => {
    if (voiceState === 'recording') finishRecording();
    else if (voiceState === 'idle') void startRecording();
  };

  const handleStopAudio = () => {
    (window as any).stopAudio?.();
    setVoiceState('idle');
  };

  const labels: Record<VoiceState, string> = {
    idle: 'Talk to Ollie',
    recording: 'Send to Ollie',
    processing: 'Ollie is thinking…',
    speaking: 'Ollie is speaking…',
  };

  return (
    <main className="voice-mode-container">
      <div className="voice-mode-canvas"><Canvas draw={particleActions.draw} /></div>
      <button className="back-to-chat-button" onClick={onChatMode} aria-label="Back to chat">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z" /></svg>
        Back to Chat
      </button>

      {messages.length > 0 && (
        <section className="voice-captions-container" aria-label="Voice conversation">
          <div className="voice-messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`voice-message ${message.role}`}>
                <div className="voice-message-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{message.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </section>
      )}

      <div className="voice-controls">
        <button
          className={`voice-primary-button ${voiceState}`}
          onClick={handlePrimaryAction}
          disabled={voiceState === 'processing' || voiceState === 'speaking'}
          aria-label={labels[voiceState]}
        >
          <span className="voice-button-icon" aria-hidden="true">
            {voiceState === 'recording' ? <span className="send-arrow">↑</span> : <span className="mic-icon" />}
          </span>
          <span>{labels[voiceState]}</span>
        </button>
        {voiceState === 'recording' && <p className="voice-status"><span /> Listening — tap to send</p>}
        {error && <p className="voice-error" role="alert">{error}</p>}
        {voiceState === 'speaking' && <button className="voice-stop-link" onClick={handleStopAudio}>Stop response</button>}
      </div>
    </main>
  );
};

export default VoiceMode;
