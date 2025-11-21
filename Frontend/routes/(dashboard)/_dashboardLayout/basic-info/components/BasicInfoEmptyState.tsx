import { Box, Typography } from 'injast-core/components';
import { FC } from 'react';

const BasicInfoEmptyState: FC = () => {
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
        minHeight: 200,
      }}
    >
      <Box
        component="img"
        src="https://www.figma.com/api/mcp/asset/43cda013-ab5a-427c-af5c-77ae0a518f5e"
        alt="Empty state"
        sx={{ width: 105, height: 58 }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'neutral.main',
          fontSize: '14px',
          textAlign: 'center',
        }}
      >
        هنوز مدرکی بارگذاری نشده
      </Typography>
    </Box>
  );
};

export default BasicInfoEmptyState;

