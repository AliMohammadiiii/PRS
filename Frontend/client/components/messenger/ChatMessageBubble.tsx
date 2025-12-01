import { AiMessage } from 'src/services/api/ai';

interface ChatMessageBubbleProps {
  message: AiMessage;
}

export default function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.sender_type === 'USER';
  const isAi = message.sender_type === 'AI';
  const isSystem = message.sender_type === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="flex justify-center mb-1 px-3 py-1">
        <div className="text-[11px] text-gray-500 bg-transparent">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-1 px-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] px-3 py-2 text-[13px] rounded-2xl break-words ${
          isUser
            ? 'bg-[#179CDE] text-white rounded-br-sm'
            : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

