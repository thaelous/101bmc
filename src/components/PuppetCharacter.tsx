import React, { useState } from 'react';

interface PuppetCharacterProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
}

export const PuppetCharacter: React.FC<PuppetCharacterProps> = ({
  className = '',
  size = 'md',
  showBadge = true
}) => {
  const [hasImageError, setHasImageError] = useState(false);

  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-28 h-28',
    lg: 'w-44 h-44',
    xl: 'w-60 h-60'
  };

  // Usar la imagen oficial subida /logo.png con fidelidad total
  if (!hasImageError) {
    return (
      <div className={`relative inline-block select-none ${sizeMap[size]} ${className}`}>
        <img
          src="/logo.png"
          alt="101 Buenos Malos Consejos — por Robert Pacheco"
          className="w-full h-full object-contain drop-shadow-2xl rounded-full"
          onError={() => setHasImageError(true)}
        />
        {showBadge && (
          <div className="absolute -bottom-1 -right-1 bg-[#e5b838] text-[#121411] font-heading font-black text-[11px] px-2 py-0.5 rounded-full border-2 border-[#121411] shadow-md">
            101
          </div>
        )}
      </div>
    );
  }

  // Fallback vectorial con camelCase SVG properties
  return (
    <div className={`relative inline-block select-none ${sizeMap[size]} ${className}`}>
      <svg
        viewBox="0 0 320 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xl"
      >
        <defs>
          <radialGradient id="puppet-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2b3323" />
            <stop offset="70%" stopColor="#1e2418" />
            <stop offset="100%" stopColor="#121411" />
          </radialGradient>
          <linearGradient id="felt-skin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d9a873" />
            <stop offset="50%" stopColor="#c9955f" />
            <stop offset="100%" stopColor="#ab7a47" />
          </linearGradient>
          <linearGradient id="beard-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2a221b" />
            <stop offset="40%" stopColor="#1a1410" />
            <stop offset="100%" stopColor="#100c09" />
          </linearGradient>
          <linearGradient id="jacket-olive" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7a8d55" />
            <stop offset="70%" stopColor="#556338" />
            <stop offset="100%" stopColor="#3d4727" />
          </linearGradient>
          <linearGradient id="mustard-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5cc50" />
            <stop offset="100%" stopColor="#d49e1e" />
          </linearGradient>
        </defs>

        <circle cx="160" cy="160" r="150" fill="url(#puppet-bg)" stroke="#3d4533" strokeWidth="6" />
        <circle cx="160" cy="160" r="142" fill="none" stroke="#6b7b4a" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />

        <path
          d="M70 300 C80 240, 110 225, 160 225 C210 225, 240 240, 250 300 Z"
          fill="url(#jacket-olive)"
          stroke="#3d4727"
          strokeWidth="3"
        />
        <path d="M130 230 L160 265 L120 275 Z" fill="url(#mustard-gold)" />
        <path d="M190 230 L160 265 L200 275 Z" fill="url(#mustard-gold)" />
        <path d="M145 228 L160 248 L175 228 Z" fill="#e8ebe3" />

        <ellipse cx="160" cy="140" rx="68" ry="74" fill="url(#felt-skin)" stroke="#9c6d3d" strokeWidth="2" />

        <circle cx="92" cy="145" r="14" fill="url(#felt-skin)" stroke="#9c6d3d" strokeWidth="2" />
        <circle cx="92" cy="145" r="8" fill="#b07d4b" opacity="0.6" />
        <circle cx="228" cy="145" r="14" fill="url(#felt-skin)" stroke="#9c6d3d" strokeWidth="2" />
        <circle cx="228" cy="145" r="8" fill="#b07d4b" opacity="0.6" />

        <path d="M115 110 Q135 102 148 114" stroke="#1a1410" strokeWidth="6" strokeLinecap="round" />
        <path d="M205 110 Q185 102 172 114" stroke="#1a1410" strokeWidth="6" strokeLinecap="round" />

        <circle cx="132" cy="128" r="13" fill="#ffffff" />
        <circle cx="134" cy="128" r="8" fill="#1b1c1b" />
        <circle cx="136" cy="125" r="2.5" fill="#ffffff" />
        <circle cx="188" cy="128" r="13" fill="#ffffff" />
        <circle cx="186" cy="128" r="8" fill="#1b1c1b" />
        <circle cx="184" cy="125" r="2.5" fill="#ffffff" />

        {/* Glasses */}
        <rect x="114" y="114" width="38" height="28" rx="6" fill="none" stroke="#1b1c1b" strokeWidth="5" />
        <rect x="168" y="114" width="38" height="28" rx="6" fill="none" stroke="#1b1c1b" strokeWidth="5" />
        <line x1="152" y1="124" x2="168" y2="124" stroke="#1b1c1b" strokeWidth="5" />

        <ellipse cx="160" cy="142" rx="14" ry="11" fill="#c08552" stroke="#8d5b2c" strokeWidth="2" />

        <line x1="130" y1="168" x2="190" y2="168" stroke="#4a1e1b" strokeWidth="4" strokeLinecap="round" />
        <path d="M136 168 Q160 182 184 168" fill="#6d2b27" />

        <path
          d="M125 156 Q145 152 160 160 Q175 152 195 156 Q180 174 160 170 Q140 174 125 156 Z"
          fill="url(#beard-grad)"
        />
        <path
          d="M102 150 C95 185, 105 235, 160 248 C215 235, 225 185, 218 150 C210 178, 200 195, 185 198 C175 190, 168 190, 160 192 C152 190, 145 190, 135 198 C120 195, 110 178, 102 150 Z"
          fill="url(#beard-grad)"
          stroke="#1a1410"
          strokeWidth="2"
        />

        {showBadge && (
          <g transform="translate(210, 210)">
            <circle cx="28" cy="28" r="26" fill="url(#mustard-gold)" stroke="#121411" strokeWidth="3" />
            <text
              x="28"
              y="34"
              textAnchor="middle"
              fontFamily="'Outfit', sans-serif"
              fontWeight="900"
              fontSize="18"
              fill="#121411"
              letterSpacing="0.5"
            >
              101
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
