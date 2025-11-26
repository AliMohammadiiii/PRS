import { ReactNode, useMemo } from 'react';
import { ThemeProvider, useTheme as useMuiTheme } from '@mui/material/styles';
import { alpha as muiAlpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

/**
 * Wrapper component that ensures the theme has the alpha function
 * This fixes the "theme.alpha is not a function" error
 */
function ThemeAlphaWrapper({ children }: { children: ReactNode }) {
  const baseTheme = useMuiTheme();
  
  // Create a new theme object that includes the alpha function
  // Only add alpha if it doesn't already exist
  const themeWithAlpha = useMemo(() => {
    if ((baseTheme as any).alpha && typeof (baseTheme as any).alpha === 'function') {
      // Theme already has alpha function, return as is
      return baseTheme;
    }
    
    // Create a new theme object that includes the alpha function
    return {
      ...baseTheme,
      alpha: muiAlpha,
    } as Theme & { alpha: typeof muiAlpha };
  }, [baseTheme]);

  return (
    <ThemeProvider theme={themeWithAlpha}>
      {children}
    </ThemeProvider>
  );
}

export default ThemeAlphaWrapper;
