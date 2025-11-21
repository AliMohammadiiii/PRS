import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Box, Grid } from 'injast-core/components';
import SideBar from './components/SideBar';
import Header from './components/Header';
import { defaultColors } from 'injast-core/constants';
import { getAccessToken } from 'src/client/contexts/AuthContext';

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
  return (
    <Grid container sx={{ height: '100%' }}>
      <Grid size={2} sx={{ height: '100%' }}>
        <SideBar />
      </Grid>
      <Grid size={10}>
        <Header />
        <Box
          sx={{
            bgcolor: defaultColors.neutral[50],
            height: '100%',
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

