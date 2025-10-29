import React from 'react';

export const Logo = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="190"
    height="40"
    viewBox="0 0 190 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="LinguAI Logo"
    {...props}
  >
    <style>
      {`
        .pulse {
          animation: pulse 3s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
            transform-origin: center; 
          }
          50% { 
            transform: scale(1.05); 
            transform-origin: center; 
          }
        }
      `}
    </style>
    {/* New Minimalist Symbol: Translation/Conversation */}
    <g>
      {/* Outer bubble (outline) */}
      <path
        d="M20 2C10.058 2 2 8.583 2 17.5C2 26.417 10.058 33 20 33C21.785 33 23.51 32.721 25.086 32.19L34 37L31.721 28.373C34.956 25.756 37 21.821 37 17.5C37 8.583 29.942 2 20 2Z"
        stroke="#6B00FF"
        strokeWidth="3"
      />
      {/* Inner bubble (solid) */}
      <path
        className="pulse"
        d="M20 9C13.925 9 9 12.82 9 17.5S13.925 26 20 26S31 22.18 31 17.5S26.075 9 20 9Z"
        fill="#00E0FF"
      />
    </g>
    
    {/* Logotype */}
    <text
      fill="white"
      fontFamily="Poppins, sans-serif"
      fontSize="32"
      fontWeight="600"
      x="50"
      y="30"
      letterSpacing="0.5"
    >
      Lingu
    </text>
    <text
      fill="#00E0FF"
      fontFamily="Poppins, sans-serif"
      fontSize="32"
      fontWeight="700"
      x="138"
      y="30"
    >
      AI
    </text>
  </svg>
);