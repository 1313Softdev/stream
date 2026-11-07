import React from 'react';

interface StreamLiveLogoProps {
  className?: string;
  size?: number;
  textColor?: string;
  showText?: boolean;
  variant?: 'full' | 'icon';
}

export const StreamLiveLogo: React.FC<StreamLiveLogoProps> = ({
  className = '',
  size = 36,
  showText = true,
  variant,
}) => {
  const isIconOnly = variant === 'icon' || !showText;

  if (isIconOnly) {
    return (
      <div className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}>
        <img
          src="/logo-icon.png"
          alt="Stream LIVE"
          className="object-contain drop-shadow-sm"
          style={{ height: size, width: size }}
          loading="eager"
        />
      </div>
    );
  }

  // Full Horizontal "Stream LIVE" Brand Logo
  return (
    <div className={`inline-flex items-center select-none shrink-0 ${className}`}>
      <img
        src="/logo.png"
        alt="Stream LIVE"
        className="object-contain drop-shadow-sm max-w-full"
        style={{ height: size, width: 'auto' }}
        loading="eager"
      />
    </div>
  );
};

// Backwards-compatible export alias
export const PantherLogo = StreamLiveLogo;
export default StreamLiveLogo;
