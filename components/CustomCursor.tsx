import React, { useState, useEffect, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation: number;
}

const PARTICLE_COLORS = ['#6B00FF', '#00E0FF', '#7B5CFF'];

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdCounter = useRef(0);
  const requestRef = useRef<number>();
  const previousPosition = useRef(position);
  // Fix: Use ReturnType<typeof setTimeout> for browser compatibility instead of NodeJS.Timeout.
  const throttleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addParticle = (x: number, y: number) => {
    const newParticle: Particle = {
      id: particleIdCounter.current++,
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      size: Math.random() * 6 + 2,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      rotation: Math.random() * 360,
    };

    setParticles((prev) => [...prev, newParticle]);

    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => p.id !== newParticle.id));
    }, 1000); // Corresponds to animation duration
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        setPosition({ x: e.clientX, y: e.clientY });
        
        if (!throttleTimeout.current) {
            addParticle(e.clientX, e.clientY);
            throttleTimeout.current = setTimeout(() => {
                throttleTimeout.current = null;
            }, 50); // Throttle particle creation
        }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
    };
  }, []);

  return (
    <>
      <style>{`
        .particle {
          position: fixed;
          left: 0;
          top: 0;
          pointer-events: none;
          border-radius: 2px;
          animation: fade-out 1s forwards;
          z-index: 9999;
        }
        @keyframes fade-out {
          from {
            opacity: 1;
            transform: translate(var(--startX), var(--startY)) scale(1) rotate(var(--startRotation)deg);
          }
          to {
            opacity: 0;
            transform: translate(var(--endX), var(--endY)) scale(0) rotate(var(--endRotation)deg);
          }
        }
      `}</style>
      <div
        className="fixed w-2 h-2 bg-white rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 ease-out"
        style={{ left: position.x, top: position.y, zIndex: 10000 }}
      />
      {particles.map((p) => {
        const endX = p.x + (Math.random() - 0.5) * 50;
        const endY = p.y + (Math.random() - 0.5) * 50;
        const endRotation = p.rotation + (Math.random() - 0.5) * 180;
        
        return (
          <div
            key={p.id}
            className="particle"
            style={
              {
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                '--startX': `${p.x}px`,
                '--startY': `${p.y}px`,
                '--startRotation': p.rotation,
                '--endX': `${endX}px`,
                '--endY': `${endY}px`,
                '--endRotation': `${endRotation}deg`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </>
  );
};