import { Box, Typography } from 'injast-core/components';
import { FC } from 'react';
import { Package } from 'lucide-react';

const OrganizationInfoEmptyState: FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 2.5,
        py: 10,
        minHeight: 279,
        bgcolor: 'background.secondary',
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Package
          size={58}
          strokeWidth={1.5}
          style={{ color: '#91969F' }}
        />
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: 'neutral.secondary',
          fontSize: '14px',
          textAlign: 'center',
        }}
      >
        برای شروع یک سازمان اضافه کن
      </Typography>
    </Box>
  );
};

export default OrganizationInfoEmptyState;

