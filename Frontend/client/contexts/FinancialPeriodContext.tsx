import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FinancialPeriod } from 'src/types/api/periods';

interface FinancialPeriodContextType {
  selectedFinancialPeriod: FinancialPeriod | null;
  selectedFinancialPeriodId: string | null;
  setSelectedFinancialPeriod: (period: FinancialPeriod | null) => void;
  setSelectedFinancialPeriodId: (periodId: string | null) => void;
}

const FinancialPeriodContext = createContext<FinancialPeriodContextType | undefined>(undefined);

export function FinancialPeriodProvider({ children }: { children: ReactNode }) {
  const [selectedFinancialPeriod, setSelectedFinancialPeriod] = useState<FinancialPeriod | null>(null);
  const [selectedFinancialPeriodId, setSelectedFinancialPeriodId] = useState<string | null>(null);

  return (
    <FinancialPeriodContext.Provider
      value={{
        selectedFinancialPeriod,
        selectedFinancialPeriodId,
        setSelectedFinancialPeriod,
        setSelectedFinancialPeriodId,
      }}
    >
      {children}
    </FinancialPeriodContext.Provider>
  );
}

export function useFinancialPeriod() {
  const context = useContext(FinancialPeriodContext);
  if (context === undefined) {
    throw new Error('useFinancialPeriod must be used within a FinancialPeriodProvider');
  }
  return context;
}






