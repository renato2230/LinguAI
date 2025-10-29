import React from 'react';

export const PulsingCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <style>{`
      .pulse-circle {
        animation: pulse 2s infinite ease-in-out;
        transform-origin: center;
      }
      @keyframes pulse {
        0% { transform: scale(0.9); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.7; }
        100% { transform: scale(0.9); opacity: 1; }
      }
    `}</style>
    <circle className="pulse-circle" cx="12" cy="12" r="10" fill="currentColor" />
  </svg>
);
