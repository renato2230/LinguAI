import React, { useState, useEffect, useRef } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import { TranscriptEntry, Speaker } from './types';
import { LANGUAGES } from './languages';
import { VOICES } from './voices';
import { MicOn, MicOff, Settings } from './components/Icons';
import { Logo } from './components/Logo';
import { SplashScreen } from './SplashScreen';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [voice, setVoice] = useState('Zephyr');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(true);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const { isSessionActive, startSession, stopSession } = useLiveSession({
    sourceLanguage,
    targetLanguage,
    voice,
    onTranscriptUpdate: setTranscript,
    onError: setError,
  });

  useEffect(() => {
    // Simulate app initialization
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

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Logo style={styles.logo} />
        <h1 style={styles.title}>Gemini Translate</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={styles.settingsButton}
          aria-label="Toggle settings"
        >
          <Settings />
        </button>
      </header>

      {showSettings && (
        <div style={styles.settingsContainer}>
          <div style={styles.selectWrapper}>
            <label htmlFor="source-lang">From:</label>
            <select
              id="source-lang"
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              disabled={isSessionActive}
              style={styles.select}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.selectWrapper}>
            <label htmlFor="target-lang">To:</label>
            <select
              id="target-lang"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={isSessionActive}
              style={styles.select}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.selectWrapper}>
            <label htmlFor="voice">Voice:</label>
            <select
              id="voice"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              disabled={isSessionActive}
              style={styles.select}
            >
              {VOICES.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      <main style={styles.transcriptContainer}>
        {transcript.length === 0 && !isSessionActive && (
             <div style={styles.placeholder}>
                <p>Click the microphone to start translating.</p>
             </div>
        )}
        {transcript.map((entry, index) => (
          <div
            key={index}
            style={{
              ...styles.transcriptEntry,
              ...(entry.speaker === Speaker.USER
                ? styles.userEntry
                : styles.modelEntry),
            }}
          >
            <p style={{
                ...styles.transcriptText, 
                ...(entry.isFinal ? {} : styles.interimText)
            }}>
                <span style={styles.speakerLabel}>{entry.speaker === Speaker.USER ? 'You' : 'Translation'}: </span>
                {entry.text}
            </p>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </main>
      
      {error && <div style={styles.errorBanner}>{error}</div>}

      <footer style={styles.footer}>
        <button
          onClick={handleToggleSession}
          style={{
            ...styles.micButton,
            ...(isSessionActive ? styles.micButtonActive : {}),
          }}
          aria-label={isSessionActive ? 'Stop translation' : 'Start translation'}
        >
          {isSessionActive ? <MicOff /> : <MicOn />}
        </button>
      </footer>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f0f4f9',
      fontFamily: 'sans-serif',
      color: '#1f2937',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      padding: '0.75rem 1rem',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      flexShrink: 0,
    },
    logo: {
      width: '32px',
      height: '32px',
      color: '#4f46e5',
    },
    title: {
      fontSize: '1.25rem',
      fontWeight: '600',
      marginLeft: '0.75rem',
      marginRight: 'auto',
    },
    settingsButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '0.5rem',
      color: '#6b7280',
    },
    settingsContainer: {
      display: 'flex',
      justifyContent: 'space-around',
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
      flexWrap: 'wrap',
      gap: '1rem',
    },
    selectWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    select: {
      padding: '0.5rem',
      borderRadius: '6px',
      border: '1px solid #d1d5db',
    },
    transcriptContainer: {
      flexGrow: 1,
      overflowY: 'auto',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    },
    placeholder: {
        textAlign: 'center',
        color: '#6b7280',
        margin: 'auto',
    },
    transcriptEntry: {
      maxWidth: '80%',
      padding: '0.75rem 1rem',
      borderRadius: '12px',
      lineHeight: 1.5,
    },
    userEntry: {
      backgroundColor: '#dbeafe',
      alignSelf: 'flex-start',
      borderBottomLeftRadius: '2px',
    },
    modelEntry: {
      backgroundColor: '#e0e7ff',
      alignSelf: 'flex-end',
      borderBottomRightRadius: '2px',
    },
    transcriptText: {
        margin: 0,
    },
    interimText: {
        color: '#4b5563',
    },
    speakerLabel: {
        fontWeight: 'bold',
        marginRight: '0.5em',
    },
    errorBanner: {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      padding: '1rem',
      textAlign: 'center',
    },
    footer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1rem',
      borderTop: '1px solid #e5e7eb',
      backgroundColor: 'white',
      flexShrink: 0,
    },
    micButton: {
      width: '64px',
      height: '64px',
      borderRadius: '50%',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#4ade80',
      color: 'white',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    micButtonActive: {
      backgroundColor: '#f87171',
    },
  };
  

export default App;
