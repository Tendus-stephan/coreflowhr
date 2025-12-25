import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SourcingProgress {
    current: number;
    total: number;
    currentCandidateName: string;
}

interface SourcingContextType {
    isSourcing: boolean;
    sourcingProgress: SourcingProgress;
    startSourcing: (total: number) => void;
    updateProgress: (progress: Partial<SourcingProgress>) => void;
    stopSourcing: () => void;
}

const SourcingContext = createContext<SourcingContextType | undefined>(undefined);

export const SourcingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isSourcing, setIsSourcing] = useState(false);
    const [sourcingProgress, setSourcingProgress] = useState<SourcingProgress>({
        current: 0,
        total: 0,
        currentCandidateName: '',
    });

    const startSourcing = (total: number) => {
        setIsSourcing(true);
        setSourcingProgress({
            current: 0,
            total,
            currentCandidateName: '',
        });
    };

    const updateProgress = (progress: Partial<SourcingProgress>) => {
        setSourcingProgress(prev => ({
            ...prev,
            ...progress,
        }));
    };

    const stopSourcing = () => {
        setIsSourcing(false);
        setSourcingProgress({
            current: 0,
            total: 0,
            currentCandidateName: '',
        });
    };

    return (
        <SourcingContext.Provider
            value={{
                isSourcing,
                sourcingProgress,
                startSourcing,
                updateProgress,
                stopSourcing,
            }}
        >
            {children}
        </SourcingContext.Provider>
    );
};

export const useSourcing = () => {
    const context = useContext(SourcingContext);
    if (context === undefined) {
        throw new Error('useSourcing must be used within a SourcingProvider');
    }
    return context;
};




