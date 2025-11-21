import { Box, Typography } from 'injast-core/components';
import { FC } from 'react';

const ReportTitlesEmptyState: FC = () => {
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
        minHeight: 267,
        bgcolor: 'neutral.50',
        borderRadius: 2,
      }}
    >
      <Box
        component="img"
        src="https://www.figma.com/api/mcp/asset/513c6153-8482-42c7-81dd-fb3343206772"
        alt="Empty state"
        sx={{ width: 105, height: 58 }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'neutral.main',
          fontSize: '14px',
          textAlign: 'center',
          fontWeight: 500,
        }}
      >
        هنوز عنوانی تعریف نشده
      </Typography>
    </Box>
  );
};

export default ReportTitlesEmptyState;

