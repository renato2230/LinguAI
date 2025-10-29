import React from 'react';
import { Logo } from '../components/Logo';
import { SleekMic } from '../components/Icons';
import FuturisticBackground from '../components/FuturisticBackground';

interface HomeProps {
  onStart: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStart }) => {
  const line1 = "Tradução Instantânea.";
  const line2 = "Comunicação Real.";
  const initialDelay = 0.2;
  const charStagger = 0.04;

  return (
    <div className="flex flex-col min-h-screen text-gray-200 font-sans">
      <FuturisticBackground />
      <header className="w-full flex justify-center" style={{ paddingTop: '50px' }}>
        <Logo className="w-48 h-auto" style={{ filter: 'drop-shadow(0 0 20px rgba(123, 92, 255, 0.4))' }} />
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-white leading-normal">
            {line1.split("").map((char, index) => (
              <span key={`l1-${index}`} className="char-reveal" style={{ animationDelay: `${initialDelay + index * charStagger}s` }}>
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
            <br />
            <span>
              {line2.split("").map((char, index) => (
                <span key={`l2-${index}`} className="char-reveal" style={{ animationDelay: `${initialDelay + (line1.length + index) * charStagger}s` }}>
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>
          </h1>
          <p className="max-w-xl mx-auto text-lg text-gray-400 mb-12 animate-fade-in-up" style={{ animationDelay: '1.8s' }}>
            A tecnologia do LinguAI escuta, traduz e responde com naturalidade, quebrando barreiras e aproximando pessoas.
          </p>
          <button
            onClick={onStart}
            className="group inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold text-white rounded-full bg-gradient-to-br from-[#00E0FF] to-[#6B00FF] shadow-[0_0_25px_rgba(107,0,255,0.5)] transition-all duration-300 transform hover:scale-105 active:scale-95 animate-fade-in-up"
            style={{ animationDelay: '2.0s' }}
          >
            <SleekMic className="w-6 h-6 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:rotate-[5deg] group-hover:[filter:drop-shadow(0_0_8px_rgba(255,255,255,0.8))] group-active:scale-95" />
            <span>Iniciar Conversa</span>
          </button>
        </div>
      </main>

      <footer className="w-full text-center py-4 flex-shrink-0 text-gray-500 text-sm">
        Renato Designer ® 2025 | Todos os direitos reservados
      </footer>
      <style>{`
        .animate-fade-in-up { 
            animation: fadeInUp 0.8s ease-out forwards; 
            opacity: 0;
        }
        @keyframes fadeInUp {
            from { 
                opacity: 0; 
                transform: translateY(20px); 
                filter: blur(5px);
            }
            to { 
                opacity: 1; 
                transform: translateY(0); 
                filter: blur(0);
            }
        }

        .char-reveal {
          display: inline-block;
          opacity: 0;
          animation: revealChar 0.6s cubic-bezier(0.3, 0.8, 0.2, 1) forwards;
        }

        @keyframes revealChar {
          from {
            opacity: 0;
            filter: blur(5px);
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }

        .animate-gradient-text {
            background-size: 200% auto;
            animation: gradient-flow 3s ease-in-out infinite;
        }
        @keyframes gradient-flow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    `}</style>
    </div>
  );
};