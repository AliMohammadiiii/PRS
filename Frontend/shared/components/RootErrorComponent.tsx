/* csf-ignore */

import { FC } from 'react';
import { ErrorComponentProps } from '@tanstack/react-router';
import { Box } from 'injast-core/components';
import logger from '@/lib/logger';

const RootErrorComponent: FC<ErrorComponentProps> = ({ error, info }) => {
  logger.error('Root error component caught error', error, { 
    errorName: error.name,
    errorMessage: error.message,
    componentStack: info?.componentStack 
  });
  // Render an error message
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      Error
    </Box>
  );
};

export default RootErrorComponent;

