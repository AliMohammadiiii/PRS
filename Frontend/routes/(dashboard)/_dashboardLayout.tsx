import { createFileRoute, Outlet, redirect, useNavigate, useLocation } from '@tanstack/react-router';
import { Box, Grid, CircularProgress } from 'injast-core/components';
import { useEffect } from 'react';
import SideBar from './components/SideBar';
import Header from './components/Header';
import { defaultColors } from 'injast-core/constants';
import { getAccessToken } from 'src/client/contexts/AuthContext';
import { useUiMode } from 'src/client/hooks/useUiMode';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout')({
  beforeLoad: () => {
    const token = getAccessToken();
    if (!token) {
      throw redirect({
        to: '/login',
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: uiModeData, isLoading: isLoadingUiMode } = useUiMode();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to messenger if in MESSENGER_ONLY mode and on root/dashboard
  useEffect(() => {
    if (!isLoadingUiMode && uiModeData?.ui_mode === 'MESSENGER_ONLY') {
      const pathname = location.pathname;
      // Redirect if on root dashboard routes (not already on messenger)
      if (pathname === '/' || pathname === '/dashboard' || pathname.startsWith('/dashboard') && !pathname.startsWith('/messenger')) {
        navigate({ to: '/messenger' });
      }
    }
  }, [isLoadingUiMode, uiModeData, location.pathname, navigate]);

  // Show loading spinner while fetching UI mode
  if (isLoadingUiMode) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const isMessengerOnly = uiModeData?.ui_mode === 'MESSENGER_ONLY';

  return (
    <Grid container sx={{ height: '100%' }}>
      <Grid size={2} sx={{ height: '100%' }}>
        <SideBar isMessengerOnly={isMessengerOnly} />
      </Grid>
      <Grid size={10} sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Header />
        <Box
          sx={{
            bgcolor: defaultColors.neutral[50],
            flex: 1,
            overflow: 'auto',
            py: 4,
            px: 3,
          }}
        >
          <Outlet />
        </Box>
      </Grid>
    </Grid>
  );
}

