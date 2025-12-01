import { Box } from 'injast-core/components';
import { appColors } from 'src/theme/colors';

interface MessengerAppIconProps {
  size?: number;
}

export default function MessengerAppIcon({ size = 40 }: MessengerAppIconProps) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: appColors.primary.main,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        fontSize: size * 0.4,
      }}
    >
      AI
    </Box>
  );
}


