import { useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from 'injast-core/components';
import { AiMessage } from 'src/services/api/ai';
import ChatMessageBubble from './ChatMessageBubble';

interface ChatMessageListProps {
  messages: AiMessage[];
  loading: boolean;
}

export default function ChatMessageList({ messages, loading }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (loading) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          py: 8,
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="neutral.light">
          Loading messages...
        </Typography>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          py: 8,
        }}
      >
        <Typography variant="body1" color="neutral.light">
          No messages yet. Start the conversation.
        </Typography>
      </Box>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f5f5] py-2">
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

