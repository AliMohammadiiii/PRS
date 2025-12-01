import { Box, Typography } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { appColors } from 'src/theme/colors';
import { AiThread } from 'src/services/api/ai';
import { formatThreadTimestamp } from 'src/client/lib/dateUtils';

interface ThreadListItemProps {
  thread: AiThread;
  selected: boolean;
  onClick: () => void;
}

function getAvatarInitials(title: string | null): string {
  if (!title) return '?';
  // Extract first letter(s) from title
  const words = title.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return title[0].toUpperCase();
}

export default function ThreadListItem({ thread, selected, onClick }: ThreadListItemProps) {
  const avatarInitials = getAvatarInitials(thread.title);
  const timestamp = formatThreadTimestamp(thread.last_message_at);
  const hasUnread = (thread.unread_count ?? 0) > 0;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 4,
        py: 3,
        borderBottom: 1,
        borderColor: 'neutral.200',
        bgcolor: selected ? 'neutral.50' : 'white',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: 'neutral.50',
        },
      }}
    >
      {/* Avatar */}
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: appColors.primary.main,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
          fontSize: '16px',
          flexShrink: 0,
          mr: 3,
        }}
      >
        {avatarInitials}
      </Box>

      {/* Title and Preview */}
      <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
        <Typography
          variant="body1"
          fontWeight={600}
          sx={{
            color: defaultColors.neutral.dark,
            mb: 0.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {thread.title || 'Untitled Conversation'}
        </Typography>
        <Typography
          variant="body2"
          color="neutral.light"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {thread.last_message_preview || 'No messages'}
        </Typography>
      </Box>

      {/* Timestamp and Unread Badge */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 0.5,
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="neutral.light">
          {timestamp}
        </Typography>
        {hasUnread && (
          <Box
            sx={{
              bgcolor: appColors.primary.main,
              color: 'white',
              borderRadius: '50%',
              minWidth: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              px: 1,
            }}
          >
            {thread.unread_count}
          </Box>
        )}
      </Box>
    </Box>
  );
}



