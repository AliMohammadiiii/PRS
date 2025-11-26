import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Box } from 'injast-core/components';
import RootErrorComponent from 'src/shared/components/RootErrorComponent';
import { useEffect, useState } from 'react';

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootErrorComponent,
});

function RootComponent() {
  const [Devtools, setDevtools] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Only load devtools in development
    if (import.meta.env.DEV) {
      // Use a timeout to ensure React is fully loaded
      const timer = setTimeout(() => {
        import('@tanstack/react-router-devtools')
          .then((module) => {
            if (module?.TanStackRouterDevtools) {
              setDevtools(() => module.TanStackRouterDevtools);
            }
          })
          .catch((error) => {
            // Devtools not available or incompatible - silently fail
            // This can happen with React 19 compatibility issues
            if (error.message?.includes('jsx') || error.message?.includes('jsx-runtime')) {
              console.warn('Router devtools not compatible with current React version');
            } else {
              console.warn('Router devtools could not be loaded:', error);
            }
          });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'auto',
      }}
    >
      <Outlet />
      {import.meta.env.DEV && Devtools && <Devtools />}
    </Box>
  );
}

