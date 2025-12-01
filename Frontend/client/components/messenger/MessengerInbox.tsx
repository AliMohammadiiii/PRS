import { useState } from 'react';
import { Box, Typography, Button, CircularProgress, IconButton } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { appColors } from 'src/theme/colors';
import { AiThread } from 'src/services/api/ai';
import MessengerAppIcon from './MessengerAppIcon';
import ThreadList from './ThreadList';
import { Add } from 'iconsax-reactjs';

interface MessengerInboxProps {
  threads: AiThread[];
  isLoading: boolean;
  selectedThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onCreateThread?: () => void;
}

type FilterType = 'ALL' | 'CONTACTS' | 'INJAST' | 'UNIVERSITY' | 'PROXY';

const FILTERS: { value: FilterType; label: string; badge?: number }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'CONTACTS', label: 'Contacts' },
  { value: 'INJAST', label: 'Injast' },
  { value: 'UNIVERSITY', label: 'University', badge: 4 },
  { value: 'PROXY', label: 'Proxy' },
];

export default function MessengerInbox({
  threads,
  isLoading,
  selectedThreadId,
  onSelectThread,
  onCreateThread,
}: MessengerInboxProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'white',
      }}
    >
      {/* Top App Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'neutral.200',
          gap: 2,
        }}
      >
        {/* Left: App Icon */}
        <Box sx={{ flexShrink: 0 }}>
          <MessengerAppIcon size={40} />
        </Box>

        {/* Center: Title and Subtitle */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" fontWeight={600}>
            AI Messenger
          </Typography>
          {isLoading && (
            <Typography variant="caption" color="neutral.light">
              Updating...
            </Typography>
          )}
        </Box>

        {/* Right: New Chat Button and Loading Spinner */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {onCreateThread && (
            <IconButton
              onClick={onCreateThread}
              sx={{
                bgcolor: appColors.primary.main,
                color: 'white',
                '&:hover': {
                  bgcolor: appColors.primary.dark,
                },
              }}
            >
              <Add size={20} />
            </IconButton>
          )}
          {isLoading && (
            <CircularProgress size={20} />
          )}
        </Box>
      </Box>

      {/* Segmented Filters */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: 'neutral.200',
          overflowX: 'auto',
        }}
      >
        {FILTERS.map((filter) => {
          const isSelected = selectedFilter === filter.value;
          return (
            <Button
              key={filter.value}
              variant={isSelected ? 'contained' : 'text'}
              onClick={() => setSelectedFilter(filter.value)}
              sx={{
                position: 'relative',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                minWidth: 'auto',
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: isSelected ? 600 : 400,
                color: isSelected ? 'white' : defaultColors.neutral.light,
                bgcolor: isSelected ? appColors.primary.main : 'transparent',
                '&:hover': {
                  bgcolor: isSelected ? appColors.primary.dark : 'neutral.50',
                },
                ...(isSelected && {
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60%',
                    height: 2,
                    bgcolor: appColors.primary.main,
                    borderRadius: 1,
                  },
                }),
              }}
            >
              {filter.label}
              {filter.badge && (
                <Box
                  sx={{
                    ml: 1,
                    bgcolor: isSelected ? 'rgba(255, 255, 255, 0.3)' : defaultColors.neutral[300],
                    color: isSelected ? 'white' : defaultColors.neutral.dark,
                    borderRadius: '50%',
                    minWidth: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {filter.badge}
                </Box>
              )}
            </Button>
          );
        })}
      </Box>

      {/* Thread List */}
      <ThreadList
        threads={threads}
        isLoading={isLoading}
        selectedThreadId={selectedThreadId}
        onSelect={onSelectThread}
      />
    </Box>
  );
}

