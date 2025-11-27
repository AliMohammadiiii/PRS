import { ReactNode, useMemo } from 'react';
import { ThemeProvider, useTheme as useMuiTheme } from '@mui/material/styles';
import { alpha as muiAlpha } from '@mui/material/styles';
import type { Theme, PaletteColor } from '@mui/material/styles';

/**
 * Wrapper component that ensures the theme has the alpha and getColor functions
 * This fixes the "theme.alpha is not a function" and "getColor is not a function" errors
 */
function ThemeAlphaWrapper({ children }: { children: ReactNode }) {
  const baseTheme = useMuiTheme();
  
  // Helper function to get color from palette
  // MUI Alert component uses this to extract colors from theme palette
  // This matches MUI's internal getColor implementation pattern
  const getColor = (palette: PaletteColor | string | any): string => {
    if (typeof palette === 'string') {
      return palette;
    }
    if (palette && typeof palette === 'object') {
      // Try common palette color properties
      return palette.main || palette[500] || palette.light || palette.dark || '#000000';
    }
    return '#000000';
  };
  
  // Create a new theme object that includes the alpha and getColor functions
  const themeWithHelpers = useMemo(() => {
    const hasAlpha = (baseTheme as any).alpha && typeof (baseTheme as any).alpha === 'function';
    const hasGetColor = (baseTheme as any).getColor && typeof (baseTheme as any).getColor === 'function';
    const paletteHasGetColor = (baseTheme.palette as any)?.getColor && typeof (baseTheme.palette as any).getColor === 'function';
    
    // If theme already has both functions, return as is
    if (hasAlpha && hasGetColor && paletteHasGetColor) {
      return baseTheme;
    }
    
    // Create a new theme object that includes the missing functions
    const enhancedTheme: Theme & { alpha?: typeof muiAlpha; getColor?: typeof getColor } = {
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
      },
    };
    
    if (!hasAlpha) {
      enhancedTheme.alpha = muiAlpha;
    }
    
    if (!hasGetColor) {
      enhancedTheme.getColor = getColor;
    }
    
    // Also add getColor to palette if it doesn't exist
    if (!paletteHasGetColor) {
      (enhancedTheme.palette as any).getColor = getColor;
    }
    
    return enhancedTheme;
  }, [baseTheme]);

  return (
    <ThemeProvider theme={themeWithHelpers}>
      {children}
    </ThemeProvider>
  );
}

export default ThemeAlphaWrapper;
