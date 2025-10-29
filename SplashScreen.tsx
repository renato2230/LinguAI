import React from 'react';
import { Logo } from './components/Logo';

export const SplashScreen = () => {
  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen text-gray-200 font-sans animate-fade-out">
        <div className="animate-fade-in">
          <Logo className="w-48 h-auto" style={{ filter: 'drop-shadow(0 0 20px rgba(123, 92, 255, 0.4))' }} />
          <div className="w-48 h-1.5 bg-white/10 rounded-full mt-8 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#6B00FF] to-[#00E0FF] rounded-full animate-loading-bar"></div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes loading-bar {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-fade-out {
          animation: fadeOut 0.5s ease-in forwards 2s;
        }
        .animate-loading-bar {
          animation: loading-bar 1.8s ease-in-out forwards 0.2s;
        }
      `}</style>
    </>
  );
};