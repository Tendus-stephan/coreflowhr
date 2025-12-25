import React from 'react';

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, className = "w-10 h-10" }) => {
  const initials = (name || '')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (src) {
    return (
      <img 
        src={src} 
        alt={name}
        className={`rounded-full object-cover ${className}`}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const fallback = document.createElement('div');
            fallback.className = `bg-gray-900 text-white flex items-center justify-center rounded-full font-bold select-none text-xs tracking-wider ${className}`;
            fallback.textContent = initials || '??';
            parent.appendChild(fallback);
          }
        }}
      />
    );
  }

  return (
    <div className={`bg-gray-900 text-white flex items-center justify-center rounded-full font-bold select-none text-xs tracking-wider ${className}`}>
      {initials || '??'}
    </div>
  );
};