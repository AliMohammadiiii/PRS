import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MessageProvider } from 'injast-core/context';
import { SPAThemeProvider } from 'injast-core/providers';
import { appColors } from 'src/theme/colors';
import { faIR } from '@mui/x-data-grid/locales';
import { coreFaIR } from 'injast-core/utils';
import { AuthProvider } from 'src/client/contexts/AuthContext';
import { CompanyProvider } from 'src/client/contexts/CompanyContext';
import { FinancialPeriodProvider } from 'src/client/contexts/FinancialPeriodContext';
import { TeamProvider } from 'src/client/contexts/TeamContext';
import ThemeAlphaWrapper from 'src/theme/themeWrapper';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const options = {
    ...coreFaIR,
    ...faIR,
  };
  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <SPAThemeProvider dir="rtl" appColors={appColors} themeOptions={options}>
        <ThemeAlphaWrapper>
          <QueryClientProvider client={queryClient}>
            <MessageProvider
              width="350px"
              toastPosition={{ vertical: 'top', horizontal: 'center' }}
            >
              <AuthProvider>
                <CompanyProvider>
                  <FinancialPeriodProvider>
                    <TeamProvider>
                      {children}
                    </TeamProvider>
                  </FinancialPeriodProvider>
                </CompanyProvider>
              </AuthProvider>
            </MessageProvider>
          </QueryClientProvider>
        </ThemeAlphaWrapper>
      </SPAThemeProvider>
    </ThemeProvider>
  );
}

