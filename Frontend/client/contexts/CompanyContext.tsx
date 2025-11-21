import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import logger from "@/lib/logger";
import { OrgNode } from 'src/types/api/organizations';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  selectedCompany: OrgNode | null;
  accessibleCompanies: OrgNode[];
  isLoading: boolean;
  selectCompany: (company: OrgNode | null) => void;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const SELECTED_COMPANY_KEY = 'selected_company_id';

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState<OrgNode | null>(null);
  const [accessibleCompanies, setAccessibleCompanies] = useState<OrgNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load accessible companies from user data
  const loadCompanies = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setAccessibleCompanies([]);
      setSelectedCompany(null);
      setIsLoading(false);
      return;
    }

    try {
      // Get companies from user's accessible_companies
      const companies = user.accessible_companies || [];
      setAccessibleCompanies(companies);

      // Try to restore selected company from storage
      const savedCompanyId = sessionStorage.getItem(SELECTED_COMPANY_KEY);
      if (savedCompanyId && companies.length > 0) {
        const savedCompany = companies.find((c) => c.id === savedCompanyId);
        if (savedCompany) {
          setSelectedCompany(savedCompany);
        } else if (companies.length > 0) {
          // If saved company not found, select first available
          setSelectedCompany(companies[0]);
          sessionStorage.setItem(SELECTED_COMPANY_KEY, companies[0].id);
        }
      } else if (companies.length > 0) {
        // No saved company, select first available
        setSelectedCompany(companies[0]);
        sessionStorage.setItem(SELECTED_COMPANY_KEY, companies[0].id);
      } else {
        setSelectedCompany(null);
        sessionStorage.removeItem(SELECTED_COMPANY_KEY);
      }
    } catch (error) {
      logger.error('Error loading companies:',  error);
      setAccessibleCompanies([]);
      setSelectedCompany(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  // Load companies when user changes
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const selectCompany = useCallback((company: OrgNode | null) => {
    setSelectedCompany(company);
    if (company) {
      sessionStorage.setItem(SELECTED_COMPANY_KEY, company.id);
    } else {
      sessionStorage.removeItem(SELECTED_COMPANY_KEY);
    }
  }, []);

  const refreshCompanies = useCallback(async () => {
    await loadCompanies();
  }, [loadCompanies]);

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        accessibleCompanies,
        isLoading,
        selectCompany,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}




