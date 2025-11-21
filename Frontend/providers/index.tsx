import { ReactNode } from 'react';
import { MessageProvider } from 'injast-core/context';
import { SPAThemeProvider } from 'injast-core/providers';
import { appColors } from 'src/theme/colors';
import { faIR } from '@mui/x-data-grid/locales';
import { coreFaIR } from 'injast-core/utils';
import { AuthProvider } from 'src/client/contexts/AuthContext';
import { CompanyProvider } from 'src/client/contexts/CompanyContext';
import { FinancialPeriodProvider } from 'src/client/contexts/FinancialPeriodContext';

export default function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const options = {
    ...coreFaIR,
    ...faIR,
  };
  return (
    <SPAThemeProvider dir="rtl" appColors={appColors} themeOptions={options}>
      <MessageProvider
        width="350px"
        toastPosition={{ vertical: 'top', horizontal: 'center' }}
      >
        <AuthProvider>
          <CompanyProvider>
            <FinancialPeriodProvider>
              {children}
            </FinancialPeriodProvider>
          </CompanyProvider>
        </AuthProvider>
      </MessageProvider>
    </SPAThemeProvider>
  );
}

