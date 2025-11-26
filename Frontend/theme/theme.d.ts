import '@mui/material/styles';
import { alpha } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    alpha: typeof alpha;
  }
}

