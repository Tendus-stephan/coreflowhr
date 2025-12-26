import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const sizePixels = {
  sm: '32px',
  md: '48px',
  lg: '64px',
  xl: '80px'
};

const textSizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

// Logo path - Vite serves public folder files from root
const logoPath = '/assets/images/coreflow-logo.png';

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className = '',
  showText = true 
}) => {
  const isDarkBackground = className.includes('text-white') || className.includes('bg-black');
  const textColor = isDarkBackground ? 'text-white' : 'text-gray-900';
  
  // If showText is false, only show the image (no text, no flex container)
  if (!showText) {
    return (
      <img 
        src={logoPath}
        alt="CoreFlow Logo" 
        className={className}
        style={{ 
          width: sizePixels[size],
          height: sizePixels[size],
          display: 'block',
          objectFit: 'contain'
        }}
        onError={(e) => {
          console.error('Logo failed to load from:', logoPath);
          const img = e.target as HTMLImageElement;
          img.style.border = '2px solid red';
          img.style.backgroundColor = '#fee';
        }}
        onLoad={() => {
          console.log('Logo loaded successfully');
        }}
      />
    );
  }

  // If showText is true, show image + text
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={logoPath}
        alt="CoreFlow Logo" 
        style={{ 
          width: sizePixels[size],
          height: sizePixels[size],
          display: 'block',
          objectFit: 'contain'
        }}
        onError={(e) => {
          console.error('Logo failed to load from:', logoPath);
          const img = e.target as HTMLImageElement;
          img.style.border = '2px solid red';
          img.style.backgroundColor = '#fee';
        }}
        onLoad={() => {
          console.log('Logo loaded successfully');
        }}
      />
      <span className={`${textSizeMap[size]} font-bold ${textColor} tracking-tight`}>
        CoreFlow
      </span>
    </div>
  );
};

export default Logo;
