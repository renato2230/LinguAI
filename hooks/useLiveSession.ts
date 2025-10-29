import {
  GoogleGenAI,
  LiveSession,
  LiveServerMessage,
  Modality,
  Blob,
} from '@google/genai';
import { useCallback, useRef, useState, RefObject } from 'react';
import { Participant, TranscriptTurn } from '../types';
import { Language } from '../languages';

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
  participants: Participant[];
  languages: Language[];
  onTranscriptUpdate: (transcript: TranscriptTurn[]) => void;
  onError: (error: string) => void;
}

const generateSystemInstruction = (participants: Participant[], languages: Language[]) => {
  const participantLangs = participants.map(p => {
    const langInfo = languages.find(l => l.code === p.languageCode);
    return { code: p.languageCode, name: langInfo?.name || p.languageCode };
  });

  const languageNames = participantLangs.map(l => l.name).join(', ');
  const languageCodes = participantLangs.map(l => l.code);

  const translationSchema = languageCodes.reduce((acc, code) => {
    acc[code] = `Translation into ${languages.find(l => l.code === code)?.name || code}.`;
    return acc;
  }, {} as Record<string, string>);

  return `You are a real-time translator for a group conversation between speakers of the following languages: ${languageNames}.
Your task is to:
1. Listen to the user's speech.
2. Identify which of the specified languages is being spoken.
3. Transcribe the original speech.
4. Translate the transcribed text into all of the *other* languages in the group.
5. You MUST respond ONLY with a single, valid JSON object. Do not add any commentary, greetings, or markdown formatting. The JSON object must have the following structure:
{
  "detectedLanguage": "language_code",
  "originalText": "The transcribed text of what the user said.",
  "translations": {
    ${Object.entries(translationSchema).map(([code, desc]) => `"${code}": "${desc}"`).join(',\n    ')}
  }
}

Example: If the languages are English, French, and Spanish, and the user says "Hello, how are you?" in English, your response must be:
{
  "detectedLanguage": "en",
  "originalText": "Hello, how are you?",
  "translations": {
    "fr": "Bonjour, comment ça va ?",
    "es": "Hola, ¿cómo estás?"
  }
}
`;
};


export const useLiveSession = ({
  participants,
  languages,
  onTranscriptUpdate,
  onError,
}: LiveSessionOptions) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Separate context for TTS output
  const ttsAudioContextRef = useRef<AudioContext | null>(null);
  const ttsOutputNodeRef = useRef<GainNode | null>(null);
  const ttsSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const ttsNextStartTimeRef = useRef(0);
  const audioQueueRef = useRef<{text: string; voiceName: string}[]>([]);
  const isPlayingAudioRef = useRef(false);

  const transcriptHistoryRef = useRef<TranscriptTurn[]>([]);
  const currentOutputTranscriptionRef = useRef('');
  const turnIdCounterRef = useRef(0);

  const processAudioQueue = useCallback(async () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingAudioRef.current = true;
    const { text, voiceName } = audioQueueRef.current.shift()!;
    
    try {
        if (!aiRef.current || !ttsAudioContextRef.current || !ttsOutputNodeRef.current) {
            throw new Error("TTS components not initialized");
        }
        const response = await aiRef.current.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                  },
              },
            },
          });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
            ttsNextStartTimeRef.current = Math.max(
                ttsNextStartTimeRef.current,
                ttsAudioContextRef.current.currentTime
              );
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ttsAudioContextRef.current,
                24000,
                1
              );
              const source = ttsAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ttsOutputNodeRef.current);
              source.addEventListener('ended', () => {
                ttsSourcesRef.current.delete(source);
                isPlayingAudioRef.current = false;
                processAudioQueue(); // Process next item in queue
              });
              source.start(ttsNextStartTimeRef.current);
              ttsNextStartTimeRef.current += audioBuffer.duration;
              ttsSourcesRef.current.add(source);
        } else {
            isPlayingAudioRef.current = false;
            processAudioQueue();
        }
    } catch (error) {
        console.error("Error generating or playing TTS audio:", error);
        onError("Falha ao gerar a tradução falada.");
        isPlayingAudioRef.current = false;
        processAudioQueue();
    }
  }, [onError]);

  const stopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.warn("Error closing session, it might have already been closed.", e)
      } finally {
        sessionPromiseRef.current = null;
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (inputAudioContextRef.current?.state !== 'closed') {
      await inputAudioContextRef.current?.close();
      inputAudioContextRef.current = null;
    }

    // Stop and clear TTS audio
    if (ttsAudioContextRef.current?.state !== 'closed') {
        ttsSourcesRef.current.forEach((source) => source.stop());
        ttsSourcesRef.current.clear();
      await ttsAudioContextRef.current?.close();
      ttsAudioContextRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingAudioRef.current = false;
    ttsNextStartTimeRef.current = 0;

    setIsSessionActive(false);
  }, []);

  const startSession = useCallback(async () => {
    if (isSessionActive || participants.length < 2) {
      if (participants.length < 2) {
        onError("Por favor, configure pelo menos dois participantes para uma conversa.");
      }
      return;
    }
    setIsSessionActive(true);

    transcriptHistoryRef.current = [];
    currentOutputTranscriptionRef.current = '';
    turnIdCounterRef.current = 0;
    onTranscriptUpdate([]);
    onError('');

    try {
      if (!process.env.API_KEY) {
        throw new Error('A variável de ambiente API_KEY não está definida.');
      }
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = generateSystemInstruction(participants, languages);
      
      ttsAudioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)({ sampleRate: 24000 });
      ttsOutputNodeRef.current = ttsAudioContextRef.current.createGain();
      ttsOutputNodeRef.current.connect(ttsAudioContextRef.current.destination);

      sessionPromiseRef.current = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            try {
              mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
              inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
              const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

              scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromiseRef.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };

              source.connect(scriptProcessorRef.current);
              scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
            } catch (err) {
              console.error('Error getting user media:', err);
              onError('Não foi possível acessar o microfone. Verifique as permissões.');
              stopSession();
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription?.text) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            }
            
            if (message.serverContent?.turnComplete) {
              const fullResponse = currentOutputTranscriptionRef.current.trim();
              currentOutputTranscriptionRef.current = '';

              if (!fullResponse) {
                return;
              }

              let jsonStringToParse = fullResponse;
              const match = jsonStringToParse.match(/\{[\s\S]*\}/);

              if (!match) {
                console.warn("Failed to find JSON object in the response from model. Response:", fullResponse);
                return;
              }
              
              jsonStringToParse = match[0];

              try {
                const parsed = JSON.parse(jsonStringToParse);
                const { detectedLanguage, originalText, translations } = parsed;

                const speaker = participants.find(p => p.languageCode === detectedLanguage);
                if (!speaker) {
                    console.warn("Detected language does not match any participant.", parsed);
                    return;
                }
                
                let currentTranscript = [...transcriptHistoryRef.current];
                const lastEntry = currentTranscript[currentTranscript.length - 1];
                if (lastEntry && !lastEntry.isFinal) {
                    lastEntry.isFinal = true;
                    lastEntry.originalText = originalText;
                    lastEntry.translations = translations;
                    lastEntry.speaker = speaker;
                } else {
                    turnIdCounterRef.current++;
                    const newTurn: TranscriptTurn = {
                        id: turnIdCounterRef.current,
                        speaker,
                        originalText,
                        translations,
                        isFinal: true
                    };
                    transcriptHistoryRef.current.push(newTurn);
                }
                onTranscriptUpdate([...transcriptHistoryRef.current]);

                for (const participant of participants) {
                    if (participant.languageCode !== detectedLanguage) {
                        const translatedText = translations[participant.languageCode];
                        if (translatedText) {
                            audioQueueRef.current.push({ text: translatedText, voiceName: participant.voiceName });
                        }
                    }
                }
                processAudioQueue();

              } catch (e) {
                console.error("Failed to parse JSON response from model:", jsonStringToParse, e);
                onError("Recebida uma resposta inválida do tradutor.");
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            onError(`Erro na sessão: ${e.message}`);
            stopSession();
          },
          onclose: (e: CloseEvent) => {
            console.log('Session closed', e);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO], 
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction,
        },
      });
    } catch (error) {
      console.error('Failed to start session:', error);
      let errorMessage = 'Ocorreu um erro desconhecido.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      onError(errorMessage);
      setIsSessionActive(false);
    }
  }, [
    isSessionActive,
    participants,
    languages,
    onTranscriptUpdate,
    onError,
    stopSession,
    processAudioQueue
  ]);

  return { isSessionActive, startSession, stopSession, mediaStreamRef };
};