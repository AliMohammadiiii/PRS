import { Box, Typography, CircularProgress } from 'injast-core/components';
import { AiThread } from 'src/services/api/ai';
import ThreadListItem from './ThreadListItem';

interface ThreadListProps {
  threads: AiThread[];
  isLoading: boolean;
  selectedThreadId?: string;
  onSelect: (threadId: string) => void;
}

export default function ThreadList({
  threads,
  isLoading,
  selectedThreadId,
  onSelect,
}: ThreadListProps) {
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="neutral.light">
          Loading conversations...
        </Typography>
      </Box>
    );
  }

  if (threads.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <Typography variant="body1" color="neutral.light">
          No conversations yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      {threads.map((thread) => (
        <ThreadListItem
          key={thread.id}
          thread={thread}
          selected={thread.id === selectedThreadId}
          onClick={() => onSelect(thread.id)}
        />
      ))}
    </Box>
  );
}



