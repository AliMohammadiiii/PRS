import React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box } from 'injast-core/components';
import { useErrorHandler } from 'injast-core/hooks';
import { getAiThreads, createAiThread } from 'src/services/api/ai';
import MessengerInbox from 'src/client/components/messenger/MessengerInbox';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/messenger/')({
  component: MessengerPage,
});

function MessengerPage() {
  const { handleError } = useErrorHandler();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | undefined>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['aiThreads'],
    queryFn: getAiThreads,
  });

  const createThreadMutation = useMutation({
    mutationFn: createAiThread,
    onError: handleError,
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: ['aiThreads'] });
      // Navigate to the new thread
      navigate({ to: '/messenger/$threadId', params: { threadId: newThread.id } });
    },
  });

  // Handle errors
  React.useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  const threads = data ?? [];

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    navigate({ to: '/messenger/$threadId', params: { threadId } });
  };

  const handleCreateThread = () => {
    createThreadMutation.mutate({});
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <MessengerInbox
        threads={threads}
        isLoading={isLoading}
        selectedThreadId={selectedThreadId}
        onSelectThread={handleSelectThread}
        onCreateThread={handleCreateThread}
      />
    </Box>
  );
}

