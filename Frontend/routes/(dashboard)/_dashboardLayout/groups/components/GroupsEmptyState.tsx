import { Box, Typography } from 'injast-core/components';
import { FC } from 'react';

const GroupsEmptyState: FC = () => {
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
        bgcolor: 'grey.50',
        borderRadius: 2,
      }}
    >
      <Box
        component="img"
        src="https://www.figma.com/api/mcp/asset/624b00c1-5f63-4745-aa84-5951dd7c4383"
        alt="Empty state"
        sx={{ width: 105, height: 58 }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        هنوز گروهی تعریف نشده
      </Typography>
    </Box>
  );
};

export default GroupsEmptyState;

