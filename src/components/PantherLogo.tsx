import React from 'react';

interface PantherLogoProps {
  className?: string;
  size?: number;
  textColor?: string;
  showText?: boolean;
}

export const PantherLogo: React.FC<PantherLogoProps> = ({
  className = '',
  size = 32,
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Black Panther Head Icon */}
      <div 
        className="relative flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-sm"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Panther head silhouette */}
          <path
            d="M50 8 
               C38 8 28 14 20 22 
               L12 12 
               C10 24 14 36 18 42
               C12 48 10 56 10 65
               C10 82 26 94 50 94
               C74 94 90 82 90 65
               C90 56 88 48 82 42
               C86 36 90 24 88 12
               L80 22
               C72 14 62 8 50 8 Z"
            className="fill-slate-900 dark:fill-slate-100"
          />
          {/* Inner face sculpt and snout */}
          <path
            d="M50 20
               L42 34
               L30 38
               L36 50
               L32 60
               L42 66
               L50 82
               L58 66
               L68 60
               L64 50
               L70 38
               L58 34 Z"
            className="fill-slate-800 dark:fill-slate-300"
          />
          {/* Glowing feline eyes */}
          <polygon
            points="34,44 44,46 38,50"
            className="fill-[#6320ee] dark:fill-[#a855f7]"
          />
          <polygon
            points="66,44 56,46 62,50"
            className="fill-[#6320ee] dark:fill-[#a855f7]"
          />
          {/* Nose and whiskers accent */}
          <polygon
            points="46,65 54,65 50,70"
            className="fill-slate-700 dark:fill-slate-400"
          />
          <line x1="28" y1="62" x2="16" y2="60" stroke="currentColor" strokeWidth="2" className="text-slate-700 dark:text-slate-400" />
          <line x1="28" y1="68" x2="18" y2="72" stroke="currentColor" strokeWidth="2" className="text-slate-700 dark:text-slate-400" />
          <line x1="72" y1="62" x2="84" y2="60" stroke="currentColor" strokeWidth="2" className="text-slate-700 dark:text-slate-400" />
          <line x1="72" y1="68" x2="82" y2="72" stroke="currentColor" strokeWidth="2" className="text-slate-700 dark:text-slate-400" />
        </svg>
      </div>

      {showText && (
        <span className="text-2xl font-bold tracking-tight text-[#6320ee] dark:text-[#8b5cf6]">
          StreamAdda
        </span>
      )}
    </div>
  );
};
