import React, { useState, useEffect, useRef } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { Participant, TranscriptTurn } from './types';
import { LANGUAGES } from './languages';
import { VOICES } from './voices';
import { MicOn, MicOff, X, Plus } from './components/Icons';
import { Logo } from './components/Logo';
import { SplashScreen } from './SplashScreen';

const PARTICIPANT_COLORS = ['border-sky-500', 'border-emerald-500', 'border-amber-500', 'border-rose-500', 'border-violet-500'];

const PARTICIPANT_STYLES: Record<string, { card: string; glow: string; text: string; }> = {
    'border-sky-500': { 
        text: 'text-sky-400',
        card: 'border-sky-400/50 bg-sky-950/40',
        glow: 'shadow-sky-400/20',
    },
    'border-emerald-500': {
        text: 'text-emerald-400',
        card: 'border-emerald-400/50 bg-emerald-950/40',
        glow: 'shadow-emerald-400/20',
    },
    'border-amber-500': {
        text: 'text-amber-400',
        card: 'border-amber-400/50 bg-amber-950/40',
        glow: 'shadow-amber-400/20',
    },
    'border-rose-500': {
        text: 'text-rose-400',
        card: 'border-rose-400/50 bg-rose-950/40',
        glow: 'shadow-rose-400/20',
    },
    'border-violet-500': {
        text: 'text-violet-400',
        card: 'border-violet-400/50 bg-violet-950/40',
        glow: 'shadow-violet-400/20',
    },
};

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'Speaker 1', languageCode: 'en', voiceName: 'Zephyr', color: PARTICIPANT_COLORS[0] },
    { id: '2', name: 'Speaker 2', languageCode: 'pt', voiceName: 'Puck', color: PARTICIPANT_COLORS[1] },
  ]);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [error, setError] = useState<string>('');

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { isSessionActive, startSession, stopSession } = useLiveSession({
    participants,
    languages: LANGUAGES,
    onTranscriptUpdate: setTranscript,
    onError: setError,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleToggleSession = () => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  };

  const addParticipant = () => {
    if (participants.length >= 5) {
        setError("A maximum of 5 participants is supported.");
        return;
    };
    const nextId = (participants.length > 0 ? Math.max(...participants.map(p => parseInt(p.id))) : 0) + 1;
    const usedVoices = participants.map(p => p.voiceName);
    const nextVoice = VOICES.find(v => !usedVoices.includes(v.name)) || VOICES[0];
    const nextColor = PARTICIPANT_COLORS[participants.length % PARTICIPANT_COLORS.length];
    
    setParticipants([
      ...participants,
      { id: String(nextId), name: `Speaker ${nextId}`, languageCode: 'es', voiceName: nextVoice.name, color: nextColor }
    ]);
  };

  const removeParticipant = (id: string) => {
    if (participants.length <= 2) {
        setError("A minimum of 2 participants is required.");
        return;
    }
    setParticipants(participants.filter(p => p.id !== id));
  };

  const updateParticipant = (id: string, updated: Partial<Participant>) => {
    setParticipants(participants.map(p => (p.id === id ? { ...p, ...updated } : p)));
  };


  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#05060A] to-[#0D0F16] text-gray-200 font-sans">
      <header className="w-full max-w-7xl mx-auto p-4 sm:p-6 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
            <div className='flex items-center gap-3'>
              <Logo className="w-8 h-8 text-cyan-400" />
              <h1 className="text-xl font-bold tracking-wider">linguAI</h1>
            </div>
            <button
              onClick={addParticipant}
              disabled={isSessionActive || participants.length >= 5}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add participant"
            >
              <Plus className="w-5 h-5" />
              <span className='hidden sm:inline'>Add Participant</span>
            </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {participants.map(p => {
              const styles = PARTICIPANT_STYLES[p.color] || PARTICIPANT_STYLES[PARTICIPANT_COLORS[0]];
              const language = LANGUAGES.find(l => l.code === p.languageCode);
              return (
                <div key={p.id} className={`relative p-3 rounded-xl border bg-white/5 backdrop-blur-md transition-all shadow-lg ${styles.card} ${styles.glow}`}>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div
                                className="text-3xl transition-transform duration-200 ease-in-out group-hover:scale-110 cursor-pointer"
                            >
                                {language?.flag}
                            </div>
                            <select
                                value={p.languageCode}
                                onChange={(e) => updateParticipant(p.id, { languageCode: e.target.value })}
                                disabled={isSessionActive}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                aria-label={`Change language for ${p.name}`}
                            >
                                {LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code} className="bg-[#0D0F16]">
                                        {lang.flag} {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-grow">
                            <input
                                type="text"
                                value={p.name}
                                onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                                disabled={isSessionActive}
                                className={`bg-transparent font-bold text-lg p-0 border-none focus:outline-none focus:ring-0 w-full placeholder:text-gray-400 ${styles.text}`}
                                aria-label={`Name for participant ${p.id}`}
                            />
                            <p className="text-xs text-gray-400 -mt-1">
                                {language?.name}
                            </p>
                        </div>
                        <button
                            onClick={() => removeParticipant(p.id)}
                            disabled={isSessionActive || participants.length <= 2}
                            className="text-gray-500 hover:text-rose-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                            aria-label={`Remove ${p.name}`}
                        >
                            <X className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
              )
            })}
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 w-full max-w-4xl mx-auto">
        {transcript.length === 0 && !isSessionActive && (
          <div className="text-center text-gray-500 mt-16 animate-fade-in">
            <p className="text-lg">Welcome to your real-time group conversation.</p>
            <p>Configure participants above and press the microphone to begin.</p>
          </div>
        )}
        <div className="space-y-6">
          {transcript.map((turn) => {
            const styles = PARTICIPANT_STYLES[turn.speaker.color] || PARTICIPANT_STYLES[PARTICIPANT_COLORS[0]];
            return (
              <div
                key={turn.id}
                className={`p-4 rounded-xl backdrop-blur-md border transition-all duration-300 shadow-xl ${styles.card} ${styles.glow}`}
              >
                <div className={`font-bold mb-2 flex items-center gap-2 ${styles.text}`}>
                    {LANGUAGES.find(l => l.code === turn.speaker.languageCode)?.flag} {turn.speaker.name}
                </div>
                <p className="text-xl mb-3 text-gray-100 font-medium">
                  {turn.originalText || '...'}
                </p>
                {Object.keys(turn.translations).length > 0 && (
                  <div className="border-t border-white/10 pt-2 space-y-1">
                      {Object.entries(turn.translations).map(([langCode, text]) => {
                          const targetParticipant = participants.find(p => p.languageCode === langCode);
                          if (!targetParticipant || !text) return null;
                          return (
                             <p key={langCode} className="text-sm text-gray-400">
                               <span className='font-semibold text-gray-300'>{LANGUAGES.find(l => l.code === langCode)?.flag} {targetParticipant.name}:</span> {text}
                             </p>
                          )
                      })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div ref={transcriptEndRef} />
      </main>

      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md mx-auto bg-rose-900/70 backdrop-blur-md border border-rose-500/30 text-rose-300 px-4 py-3 rounded-lg shadow-lg" role="alert">
          <p className="font-bold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <footer className="w-full flex justify-center p-4 sm:p-6 flex-shrink-0">
        <button
          onClick={handleToggleSession}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            isSessionActive
              ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
              : 'bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-[0_0_25px_rgba(34,211,238,0.5)]'
          }`}
          aria-label={ isSessionActive ? 'Stop conversation' : 'Start conversation' }
        >
          {isSessionActive ? (
            <MicOff className="w-9 h-9" />
          ) : (
            <MicOn className="w-9 h-9" />
          )}
        </button>
      </footer>
    </div>
  );
};

export default App;