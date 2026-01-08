import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isCandidateModalOpen: boolean;
  setCandidateModalOpen: (isOpen: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCandidateModalOpen, setCandidateModalOpen] = useState(false);

  return (
    <ModalContext.Provider value={{ isCandidateModalOpen, setCandidateModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};



