import React from 'react';
import { Logo } from './components/Logo';

export const SplashScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#05060A] to-[#0D0F16] text-gray-200 font-sans">
      <Logo className="w-20 h-20 text-cyan-400 animate-pulse" style={{filter: 'drop-shadow(0 0 10px #22D3EE80)'}} />
      <h1 className="text-4xl font-bold mt-6 tracking-wider">linguAI</h1>
      <p className="text-lg text-gray-400 mt-2">Initializing real-time translation...</p>
    </div>
  );
};
