import React from 'react';

interface Props {
  /** true = fills the full viewport, false = fills its container (min-h-[320px]) */
  fullScreen?: boolean;
}

export const PageLoader: React.FC<Props> = ({ fullScreen = true }) => (
  <div
    className={`flex items-center justify-center bg-white ${
      fullScreen ? 'min-h-screen' : 'min-h-[320px]'
    }`}
  >
    <div className="relative w-10 h-10">
      {/* Track */}
      <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
      {/* Spinner */}
      <div className="absolute inset-0 rounded-full border-[3px] border-gray-900 border-t-transparent animate-spin" />
    </div>
  </div>
);
