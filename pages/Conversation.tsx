import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLiveSession } from '../hooks/useLiveSession';
import { Participant, TranscriptTurn } from '../types';
import { Language, LANGUAGES } from '../languages';
import { Voice, VOICES } from '../voices';
import { Logo } from '../components/Logo';
import { SleekMic, StopIcon, SettingsIcon, ChevronUp } from '../components/Icons';
import { PulsingCircle } from '../components/AnimatedIcons';

interface ConversationProps {
  onGoHome: () => void;
}

const PARTICIPANT_COLORS = [
  '#0ea5e9', // Sky
  '#ec4899', // Pink
  '#22c55e', // Green
  '#eab308', // Yellow
  '#8b5cf6', // Violet
];

const initialParticipants: Participant[] = [
  {
    id: 'participant-1',
    name: 'Participante 1',
    languageCode: 'pt',
    voiceName: 'Zephyr',
    color: PARTICIPANT_COLORS[0],
  },
  {
    id: 'participant-2',
    name: 'Participante 2',
    languageCode: 'fr',
    voiceName: 'Puck',
    color: PARTICIPANT_COLORS[1],
  },
];

// --- Language Selector Modal ---
const LanguageSelectorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (language: Language) => void;
  languages: readonly Language[];
}> = ({ isOpen, onClose, onSelect, languages }) => {
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (event: MouseEvent) => {
        if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
          onClose();
        }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in-fast">
      <div 
        ref={modalContentRef}
        className="w-full max-w-2xl h-[60vh] bg-[#1A1C2A]/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg flex flex-col p-6 m-4"
      >
        <h3 className="text-2xl font-semibold text-white mb-4">Selecione um Idioma</h3>
        <div className="flex-grow overflow-y-auto pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => onSelect(lang)}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-md hover:bg-white/10 transition-all duration-200 transform hover:scale-105"
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-white text-left truncate">{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Custom Select Component ---
function CustomSelect<T>({
  options,
  value,
  onChange,
  renderDisplay,
  renderOption,
  getKey,
  disabled = false,
}: {
  options: readonly T[];
  value: T;
  onChange: (selected: T) => void;
  renderDisplay: (selected: T) => React.ReactNode;
  renderOption: (option: T) => React.ReactNode;
  getKey: (option: T) => React.Key;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: T) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={selectRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-black/30 p-2.5 rounded-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex-grow text-left">{renderDisplay(value)}</div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 top-full mt-2 w-full max-h-60 overflow-y-auto bg-[#1A1C2A]/80 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg animate-fade-in-fast">
          <ul className="py-1">
            {options.map((option) => (
              <li key={getKey(option)}>
                <button
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  {renderOption(option)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


export const Conversation: React.FC<ConversationProps> = ({ onGoHome }) => {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [error, setError] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [langModalState, setLangModalState] = useState<{ open: boolean; participantId: string | null }>({ open: false, participantId: null });
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const onTranscriptUpdate = useCallback((newTranscript: TranscriptTurn[]) => {
    setTranscript(newTranscript);
  }, []);

  const { isSessionActive, startSession, stopSession } = useLiveSession({
    participants,
    languages: LANGUAGES,
    onTranscriptUpdate,
    onError: setError,
  });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleParticipantChange = (
    id: string,
    update: Partial<Omit<Participant, 'id' | 'color'>>
  ) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...update } : p))
    );
  };
  
  const addParticipant = () => {
    setParticipants(prev => {
        if (prev.length >= 5) {
            setError("Máximo de 5 participantes atingido.");
            return prev;
        };
        const newId = `participant-${Date.now()}`;
        const newColor = PARTICIPANT_COLORS[prev.length % PARTICIPANT_COLORS.length];
        return [...prev, {
            id: newId,
            name: `Participante ${prev.length + 1}`,
            languageCode: 'en',
            voiceName: 'Zephyr',
            color: newColor,
        }];
    });
};

const removeParticipant = (id: string) => {
    setParticipants(prev => prev.length > 2 ? prev.filter(p => p.id !== id) : prev);
    if(participants.length <= 2) {
        setError("São necessários pelo menos 2 participantes.");
    }
};

  const toggleSession = () => {
    if (isSessionActive) {
      stopSession();
    } else {
      setIsSettingsOpen(false);
      startSession();
    }
  };

  const handleLanguageSelect = (language: Language) => {
    if (langModalState.participantId) {
      handleParticipantChange(langModalState.participantId, { languageCode: language.code });
    }
    setLangModalState({ open: false, participantId: null });
  };
  
  return (
    <div className="flex flex-col h-screen text-gray-200 font-sans bg-gradient-to-b from-[#05060A] to-[#0D0F16]">
      <LanguageSelectorModal 
        isOpen={langModalState.open}
        onClose={() => setLangModalState({ open: false, participantId: null })}
        onSelect={handleLanguageSelect}
        languages={LANGUAGES}
      />
      <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
        <button onClick={onGoHome} className="transition-transform duration-200 hover:scale-105" aria-label="Voltar para a Home">
          <Logo className="w-32 h-auto" />
        </button>
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Toggle Settings"
        >
          <SettingsIcon className="w-6 h-6 text-gray-400" />
        </button>
      </header>
       <style>{`
        .animate-fade-in-fast { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-gradient-flow {
          background-size: 200% auto !important;
          animation: gradient-flow 4s ease-in-out infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
      {isSettingsOpen && (
        <div className="p-4 border-b border-white/10 bg-black/20 animate-fade-in-fast">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PulsingCircle className="w-4 h-4 text-sky-400" />
              <h2 className="text-xl font-semibold text-white">Participantes</h2>
            </div>
            <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Minimizar Configurações"
            >
                <ChevronUp className="w-6 h-6" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {participants.map((p, index) => (
              <div 
                key={p.id} 
                className={`bg-white/5 backdrop-blur-sm p-4 rounded-lg relative overflow-hidden transition-all duration-300 group hover:bg-white/10 animate-fade-in-up`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div 
                    className="absolute top-0 left-0 w-1 h-full"
                    style={{ backgroundColor: p.color, boxShadow: `0 0 12px ${p.color}` }}
                />
                <div className="flex justify-between items-center mb-3">
                    <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleParticipantChange(p.id, { name: e.target.value })}
                        className="w-full bg-transparent text-lg font-bold text-white focus:outline-none border-b-2 border-transparent focus:border-sky-500 transition-colors"
                        placeholder="Nome"
                        disabled={isSessionActive}
                    />
                    <button 
                        onClick={() => removeParticipant(p.id)} 
                        disabled={isSessionActive || participants.length <= 2} 
                        className="group text-gray-500 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                       <svg 
                           xmlns="http://www.w3.org/2000/svg" 
                           width="20" 
                           height="20" 
                           viewBox="0 0 24 24" 
                           fill="none" 
                           stroke="currentColor" 
                           strokeWidth="2" 
                           strokeLinecap="round" 
                           strokeLinejoin="round"
                           className="transition-transform duration-200 group-hover:scale-125"
                       >
                           <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                       </svg>
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isSessionActive}
                    onClick={() => setLangModalState({ open: true, participantId: p.id })}
                    className="w-full flex items-center justify-between bg-black/30 p-2.5 rounded-md border border-white/20 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                        <span>{LANGUAGES.find(l => l.code === p.languageCode)?.flag}</span>
                        <span className="truncate">{LANGUAGES.find(l => l.code === p.languageCode)?.name}</span>
                    </div>
                     <svg className={`w-4 h-4 text-gray-400 flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </button>

                  <CustomSelect<Voice>
                    value={VOICES.find(v => v.name === p.voiceName)!}
                    onChange={(voice) => handleParticipantChange(p.id, { voiceName: voice.name })}
                    options={VOICES}
                    getKey={(voice) => voice.name}
                    renderDisplay={(voice) => <span className="truncate">{voice.name}</span>}
                    renderOption={(voice) => <span>{voice.name}</span>}
                    disabled={isSessionActive}
                  />
                </div>
              </div>
            ))}
          </div>
            <button 
                onClick={addParticipant}
                disabled={isSessionActive || participants.length >= 5}
                className="w-full p-3 border border-white/20 rounded-lg flex items-center justify-center gap-2 text-gray-400 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-sky-400/50 hover:text-white hover:shadow-[0_0_15px_rgba(123,92,255,0.4)] hover:shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Adicionar Participante
            </button>
        </div>
      )}

      <main className="flex-grow p-4 overflow-y-auto flex flex-col justify-center">
        <div className="space-y-6">
          {transcript.map((turn) => (
            <div key={turn.id} className={`p-4 rounded-lg bg-white/5 relative overflow-hidden animate-fade-in-up`}>
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: turn.speaker.color }}></div>
              <p className="font-bold text-white ml-3">{turn.speaker.name}</p>
              <p className="text-lg text-gray-100 ml-3">{turn.originalText}</p>
              <div className="mt-2 space-y-1 text-sm text-gray-400 border-t border-white/10 pt-2 ml-3">
                {Object.entries(turn.translations).map(([langCode, text]) => {
                  if (langCode === turn.speaker.languageCode) return null;
                  const lang = LANGUAGES.find(l => l.code === langCode);
                  return (
                    <p key={langCode}>
                      <span className="font-semibold">{lang?.flag} {lang?.name}:</span> {text}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
        {!isSessionActive && transcript.length === 0 && !error && (
            <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full animate-fade-in-up">
                <h3 className="text-2xl font-semibold text-white mb-2">O Palco Está Pronto</h3>
                <p className="max-w-md">
                    Configure os participantes, pressione o microfone e quebre as barreiras do idioma em tempo real.
                </p>
            </div>
        )}
      </main>

      <footer className="flex flex-col items-center justify-center p-4 border-t border-white/10 flex-shrink-0">
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <button
          onClick={toggleSession}
          className={`group relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform focus:outline-none focus:ring-4 ${
            isSessionActive
              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/50 shadow-[0_0_25px_rgba(255,50,50,0.6)]'
              : 'bg-gradient-to-br from-[#00E0FF] to-[#6B00FF] hover:scale-105 active:scale-95 focus:ring-sky-500/50 shadow-[0_0_25px_rgba(107,0,255,0.5)] animate-gradient-flow'
          }`}
        >
          {isSessionActive ? (
            <StopIcon className="w-8 h-8 text-white" />
          ) : (
            <SleekMic className="w-8 h-8 text-white animate-float" />
          )}
        </button>
        <div className="flex items-center gap-2 mt-3 text-gray-400 text-sm">
            {isSessionActive && <PulsingCircle className="w-4 h-4 text-red-500" />}
            <span>{isSessionActive ? 'Sessão Ativa' : 'Pronto para começar'}</span>
        </div>
      </footer>
    </div>
  );
};