import React, { createContext, useContext, useState } from 'react';

/**
 * Shared signal between ProtectedRoute and Layout.
 * sidebarReady: true only after ProtectedRoute has confirmed the user can enter.
 * Prevents the sidebar from appearing during the DB access check, then disappearing
 * on redirect for unauthorised users.
 */
interface AccessContextType {
  sidebarReady: boolean;
  setSidebarReady: (ready: boolean) => void;
}

const AccessContext = createContext<AccessContextType>({
  sidebarReady: false,
  setSidebarReady: () => {},
});

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarReady, setSidebarReady] = useState(false);
  return (
    <AccessContext.Provider value={{ sidebarReady, setSidebarReady }}>
      {children}
    </AccessContext.Provider>
  );
};

export const useAccess = () => useContext(AccessContext);
