import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { Box, Grid, Typography } from 'injast-core/components';
import SideBar from './components/SideBar';
import Header from './components/Header';
import { defaultColors } from 'injast-core/constants';
import { getAccessToken } from 'src/client/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%',
          bgcolor: 'white',
          px: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            textAlign: 'center',
            color: '#242933',
            fontSize: '18px',
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          برای استفاده از اپلیکیشن لطفا از لپ‌تاپ استفاده کنید
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container sx={{ height: '100%' }}>
      <Grid size={2} sx={{ height: '100%' }}>
        <SideBar />
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

