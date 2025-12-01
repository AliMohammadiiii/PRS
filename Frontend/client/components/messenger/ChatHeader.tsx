import { useNavigate } from '@tanstack/react-router';
import { Box, Typography, IconButton } from 'injast-core/components';
import { Link as MuiLink, Chip } from '@mui/material';
import { appColors } from 'src/theme/colors';
import { AiThread } from 'src/services/api/ai';
import { formatThreadTimestamp } from 'src/client/lib/dateUtils';
import { getAvatarInitials } from 'src/client/lib/threadUtils';
import { ArrowRight2 } from 'iconsax-reactjs';
import { useUiMode } from 'src/client/hooks/useUiMode';

interface ChatHeaderProps {
  thread?: AiThread;
}

function formatRequestCodeForDisplay(code?: string | null): string {
  if (!code) return '';
  // Show last 6 chars of UUID
  const short = code.slice(-6);
  return `PR-${short}`;
}

export default function ChatHeader({ thread }: ChatHeaderProps) {
  const navigate = useNavigate();
  const { data: uiModeData } = useUiMode();
  const avatarInitials = getAvatarInitials(thread?.title ?? null);
  const timestamp = thread?.last_message_at
    ? formatThreadTimestamp(thread.last_message_at)
    : 'online';

  const handleBack = () => {
    navigate({ to: '/messenger' });
  };

  const isFullDashboard = uiModeData?.ui_mode === 'FULL_DASHBOARD';
  const hasPrLink = !!(thread?.request_code && thread?.request_id);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 2,
        borderBottom: 1,
        borderColor: 'neutral.200',
        bgcolor: 'white',
      }}
    >
      {/* Left: Back button */}
      <IconButton
        onClick={handleBack}
        sx={{
          flexShrink: 0,
          mr: 1,
          '&:hover': {
            bgcolor: 'neutral.50',
          },
        }}
      >
        <ArrowRight2 size={20} />
      </IconButton>

      {/* Center: Avatar + Title + Subtitle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: appColors.primary.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: '16px',
            flexShrink: 0,
          }}
        >
          {avatarInitials}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
            {thread?.title || 'Conversation'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="neutral.light">
              {timestamp}
            </Typography>
            {hasPrLink && (
              <Chip
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                      Linked PR: {formatRequestCodeForDisplay(thread.request_code)}
                      {thread.request_status && ` · ${thread.request_status}`}
                    </Typography>
                  </Box>
                }
                size="small"
                sx={{
                  height: 20,
                  bgcolor: 'neutral.100',
                  color: 'neutral.dark',
                  fontSize: '0.75rem',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Right: PR link or placeholder icons */}
      <Box sx={{ flexShrink: 0, display: 'flex', gap: 1, alignItems: 'center' }}>
        {hasPrLink && isFullDashboard && (
          <MuiLink
            href={`${import.meta.env.VITE_PRS_DASHBOARD_URL || ''}/requests/${thread.request_id}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontSize: '0.875rem',
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            Open in PRS
          </MuiLink>
        )}
      </Box>
    </Box>
  );
}

