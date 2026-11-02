import React from 'react';

interface EventraLogoProps {
  variant?: 'full' | 'symbol' | 'horizontal' | 'with-tagline' | 'create-module';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'dark' | 'light';
  className?: string;
}

export const EventraLogoSymbol: React.FC<{ size?: number; className?: string }> = ({ 
  size = 32, 
  className = '' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="Eventra Emblem"
    >
      <defs>
        <linearGradient id="eventra-grad-primary" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9638F5" />
          <stop offset="50%" stopColor="#6425E8" />
          <stop offset="100%" stopColor="#4214B8" />
        </linearGradient>
        <linearGradient id="eventra-grad-elevate" x1="18" y1="8" x2="40" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B366FF" />
          <stop offset="100%" stopColor="#6425E8" />
        </linearGradient>
        <linearGradient id="eventra-grad-base" x1="6" y1="24" x2="32" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4214B8" />
          <stop offset="100%" stopColor="#1E0A52" />
        </linearGradient>
      </defs>

      {/* Geometric Elevated Monogram / Prism Stages symbolizing Events. Elevated. */}
      {/* Upper elevated apex wing */}
      <path
        d="M24 6L40 15.2V21.6L24 12.4L8 21.6V15.2L24 6Z"
        fill="url(#eventra-grad-elevate)"
      />
      
      {/* Mid tier / Crossbar bridge */}
      <path
        d="M24 17.6L36 24.5V29.5L24 22.6L12 29.5V24.5L24 17.6Z"
        fill="url(#eventra-grad-primary)"
      />

      {/* Main architectural foundation pillar & base */}
      <path
        d="M24 28L40 37.2V42L24 32.8L8 42V37.2L24 28Z"
        fill="url(#eventra-grad-base)"
      />

      {/* Dynamic central vertical spine */}
      <path
        d="M21.5 12L26.5 14.8V34.5L21.5 31.7V12Z"
        fill="#FFFFFF"
        fillOpacity="0.25"
      />
    </svg>
  );
};

export const EventraLogo: React.FC<EventraLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const pixelSizes = {
    sm: { symbol: 24, font: 'text-sm', tag: 'text-[9px]' },
    md: { symbol: 32, font: 'text-base', tag: 'text-[10px]' },
    lg: { symbol: 40, font: 'text-xl', tag: 'text-xs' },
    xl: { symbol: 48, font: 'text-2xl', tag: 'text-xs' },
  }[size];

  const textColor = theme === 'dark' ? 'text-white' : 'text-[#111126]';
  const tagColor = theme === 'dark' ? 'text-slate-400' : 'text-[#73738A]';

  if (variant === 'symbol') {
    return <EventraLogoSymbol size={pixelSizes.symbol} className={className} />;
  }

  if (variant === 'create-module') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <EventraLogoSymbol size={pixelSizes.symbol} />
        <div className="flex items-center gap-2">
          <span className={`font-extrabold tracking-wider ${pixelSizes.font} ${textColor}`}>
            EVENTRA
          </span>
          <span className="w-px h-4 bg-[#E9E8F0]" />
          <span className="text-xs font-bold text-[#6425E8] tracking-wider uppercase">
            CREATE
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <EventraLogoSymbol size={pixelSizes.symbol} />
      <div className="flex flex-col justify-center">
        <span className={`font-extrabold tracking-[0.1em] leading-none ${pixelSizes.font} ${textColor}`}>
          EVENTRA
        </span>
        {variant === 'with-tagline' && (
          <span className={`font-medium tracking-wider mt-1 leading-none ${pixelSizes.tag} ${tagColor}`}>
            Events. Elevated.
          </span>
        )}
      </div>
    </div>
  );
};

export default EventraLogo;
