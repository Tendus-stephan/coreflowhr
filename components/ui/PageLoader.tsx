import React from 'react';

interface PageLoaderProps {
  /** true = fixed overlay covering entire viewport (use for standalone/auth pages only)
   *  false (default) = fills the content area next to the sidebar */
  fullScreen?: boolean;
}

const Spinner = () => (
  <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
);

export const PageLoader: React.FC<PageLoaderProps> = ({ fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <Spinner />
      </div>
    );
  }

  // Fills the content area (rendered inside <main> next to the sidebar)
  return (
    <div className="flex items-center justify-center w-full" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <Spinner />
    </div>
  );
};
