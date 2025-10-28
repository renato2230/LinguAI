import {
  GoogleGenAI,
  LiveSession,
  LiveServerMessage,
  Modality,
  Blob,
} from '@google/genai';
import { useCallback, useRef, useState } from 'react';
import { TranscriptEntry, Speaker } from '../types';

// From the guidelines: DO NOT use encode and decode from external libraries.
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface LiveSessionOptions {
  sourceLanguage: string;
  targetLanguage: string;
  voice: string;
  onTranscriptUpdate: (transcript: TranscriptEntry[]) => void;
  onError: (error: string) => void;
}

export const useLiveSession = ({
  sourceLanguage,
  targetLanguage,
  voice,
  onTranscriptUpdate,
  onError,
}: LiveSessionOptions) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  const transcriptHistoryRef = useRef<TranscriptEntry[]>([]);
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
      const session = await sessionPromiseRef.current;
      session.close();
      sessionPromiseRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (
      inputAudioContextRef.current &&
      inputAudioContextRef.current.state !== 'closed'
    ) {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    if (
      outputAudioContextRef.current &&
      outputAudioContextRef.current.state !== 'closed'
    ) {
      sourcesRef.current.forEach((source) => source.stop());
      sourcesRef.current.clear();
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    nextStartTimeRef.current = 0;
    setIsSessionActive(false);
  }, []);

  const startSession = useCallback(async () => {
    if (isSessionActive) {
      return;
    }
    setIsSessionActive(true);

    transcriptHistoryRef.current = [];
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    onTranscriptUpdate([]);
    onError('');

    try {
      if (!process.env.API_KEY) {
        throw new Error('API_KEY environment variable not set.');
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `You are a real-time translator. The user will speak in ${sourceLanguage}, and you must translate their speech into ${targetLanguage}. Speak clearly and naturally. Do not add any extra commentary or explanations, just provide the translation.`;

      // FIX: Cast window to `any` to access vendor-prefixed `webkitAudioContext`.
      outputAudioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            try {
              mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
              });
              // FIX: Cast window to `any` to access vendor-prefixed `webkitAudioContext`.
              inputAudioContextRef.current = new (window.AudioContext ||
                (window as any).webkitAudioContext)({ sampleRate: 16000 });

              const source =
                inputAudioContextRef.current.createMediaStreamSource(
                  mediaStreamRef.current
                );
              scriptProcessorRef.current =
                inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

              scriptProcessorRef.current.onaudioprocess = (
                audioProcessingEvent
              ) => {
                const inputData =
                  audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromiseRef.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessorRef.current);
              scriptProcessorRef.current.connect(
                inputAudioContextRef.current.destination
              );
            } catch (err) {
              console.error('Error getting user media:', err);
              onError('Could not access microphone. Please check permissions.');
              stopSession();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            let transcriptUpdated = false;
            if (message.serverContent?.inputTranscription?.text) {
              currentInputTranscriptionRef.current +=
                message.serverContent.inputTranscription.text;
              transcriptUpdated = true;
            }
            if (message.serverContent?.outputTranscription?.text) {
              currentOutputTranscriptionRef.current +=
                message.serverContent.outputTranscription.text;
              transcriptUpdated = true;
            }

            if (transcriptUpdated) {
              const newTranscript = [...transcriptHistoryRef.current];
              if (currentInputTranscriptionRef.current) {
                newTranscript.push({
                  speaker: Speaker.USER,
                  text: currentInputTranscriptionRef.current,
                  isFinal: false,
                });
              }
              if (currentOutputTranscriptionRef.current) {
                newTranscript.push({
                  speaker: Speaker.MODEL,
                  text: currentOutputTranscriptionRef.current,
                  isFinal: false,
                });
              }
              onTranscriptUpdate(newTranscript);
            }

            if (message.serverContent?.turnComplete) {
              if (currentInputTranscriptionRef.current) {
                transcriptHistoryRef.current.push({
                  speaker: Speaker.USER,
                  text: currentInputTranscriptionRef.current,
                  isFinal: true,
                });
              }
              if (currentOutputTranscriptionRef.current) {
                transcriptHistoryRef.current.push({
                  speaker: Speaker.MODEL,
                  text: currentOutputTranscriptionRef.current,
                  isFinal: true,
                });
              }
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
              onTranscriptUpdate([...transcriptHistoryRef.current]);
            }

            const base64EncodedAudioString =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (
              base64EncodedAudioString &&
              outputAudioContextRef.current &&
              outputNodeRef.current
            ) {
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContextRef.current.currentTime
              );
              const audioBuffer = await decodeAudioData(
                decode(base64EncodedAudioString),
                outputAudioContextRef.current,
                24000,
                1
              );
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            onError(`Session error: ${e.message}`);
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            console.log('Session closed', e);
            stopSession();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          systemInstruction,
        },
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      let errorMessage = 'An unknown error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      onError(errorMessage);
      setIsSessionActive(false);
    }
  }, [
    isSessionActive,
    sourceLanguage,
    targetLanguage,
    voice,
    onTranscriptUpdate,
    onError,
    stopSession,
  ]);

  return { isSessionActive, startSession, stopSession };
};
