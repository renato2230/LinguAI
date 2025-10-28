import React from 'react';
import { Logo } from './components/Logo';

export const SplashScreen = () => {
  return (
    <div style={styles.container}>
      <Logo width={80} height={80} color="#4f46e5" />
      <h1 style={styles.title}>Gemini Translate</h1>
      <p style={styles.loadingText}>Initializing...</p>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f4f9',
    color: '#1f2937',
    fontFamily: 'sans-serif',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginTop: '1rem',
  },
  loadingText: {
    fontSize: '1rem',
    color: '#6b7280',
  },
};
