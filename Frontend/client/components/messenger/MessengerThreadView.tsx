import { Box } from 'injast-core/components';
import { AiThread, AiMessage } from 'src/services/api/ai';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import ChatComposer from './ChatComposer';

interface MessengerThreadViewProps {
  thread?: AiThread;
  messages: AiMessage[];
  loadingMessages: boolean;
  sending: boolean;
  askingAi: boolean;
  onSend: (content: string) => void | Promise<void>;
  onAskAi: () => void | Promise<void>;
}

export default function MessengerThreadView({
  thread,
  messages,
  loadingMessages,
  sending,
  askingAi,
  onSend,
  onAskAi,
}: MessengerThreadViewProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#f5f5f5',
      }}
    >
      <ChatHeader thread={thread} />
      <ChatMessageList messages={messages} loading={loadingMessages} />
      <ChatComposer
        disabled={sending}
        askAiDisabled={askingAi}
        onSend={onSend}
        onAskAi={onAskAi}
      />
    </Box>
  );
}


