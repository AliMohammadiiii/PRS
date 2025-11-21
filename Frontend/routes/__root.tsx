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
      import('@tanstack/react-router-devtools')
        .then((module) => {
          setDevtools(() => module.TanStackRouterDevtools);
        })
        .catch(() => {
          // Devtools not available
        });
    }
  }, []);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Outlet />
      {import.meta.env.DEV && Devtools && <Devtools />}
    </Box>
  );
}

