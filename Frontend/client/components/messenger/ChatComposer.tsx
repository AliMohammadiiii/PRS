import { useState } from 'react';
import { Box, TextField, Button } from 'injast-core/components';
import { appColors } from 'src/theme/colors';

interface ChatComposerProps {
  disabled: boolean;
  askAiDisabled: boolean;
  onSend: (content: string) => void | Promise<void>;
  onAskAi: () => void | Promise<void>;
}

export default function ChatComposer({
  disabled,
  askAiDisabled,
  onSend,
  onAskAi,
}: ChatComposerProps) {
  const [content, setContent] = useState('');

  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || disabled) return;

    await onSend(trimmedContent);
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1.5,
        px: 3,
        py: 2,
        bgcolor: 'white',
        borderTop: 1,
        borderColor: 'neutral.200',
      }}
    >
      <Button
        variant="contained"
        onClick={handleSend}
        disabled={disabled || !content.trim()}
        sx={{
          minWidth: 'auto',
          px: 2.5,
          py: 1.5,
          borderRadius: '20px',
          textTransform: 'none',
          bgcolor: appColors.primary.main,
          '&:hover': {
            bgcolor: appColors.primary.dark,
          },
          '&:disabled': {
            bgcolor: 'neutral.300',
            color: 'neutral.light',
          },
        }}
      >
        Send
      </Button>
      <TextField
        multiline
        maxRows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        disabled={disabled}
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            borderRadius: '20px',
            backgroundColor: '#f5f5f5',
            '& fieldset': {
              border: 'none',
            },
            '&:hover fieldset': {
              border: 'none',
            },
            '&.Mui-focused fieldset': {
              border: '1px solid #179CDE',
            },
          },
        }}
      />
      <Button
        variant="outlined"
        onClick={onAskAi}
        disabled={askAiDisabled}
        sx={{
          minWidth: 'auto',
          px: 2,
          py: 1.5,
          borderRadius: '20px',
          textTransform: 'none',
          borderColor: 'neutral.300',
          color: 'neutral.dark',
          '&:hover': {
            borderColor: 'neutral.400',
            bgcolor: 'neutral.50',
          },
        }}
      >
        Ask AI
      </Button>
    </Box>
  );
}

