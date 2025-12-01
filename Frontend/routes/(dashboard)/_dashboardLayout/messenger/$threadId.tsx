import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useErrorHandler } from 'injast-core/hooks';
import {
  getAiThreads,
  getThreadMessages,
  postThreadMessage,
  runAiOnThread,
} from 'src/services/api/ai';
import MessengerThreadView from 'src/client/components/messenger/MessengerThreadView';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/messenger/$threadId')({
  component: MessengerThreadPage,
});

function MessengerThreadPage() {
  const { threadId } = Route.useParams();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  const threadsQuery = useQuery({
    queryKey: ['aiThreads'],
    queryFn: getAiThreads,
  });

  const messagesQuery = useQuery({
    queryKey: ['aiThreadMessages', threadId],
    queryFn: () => getThreadMessages(threadId),
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => postThreadMessage(threadId, content),
    onError: handleError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiThreadMessages', threadId] });
      queryClient.invalidateQueries({ queryKey: ['aiThreads'] });
    },
  });

  const runAiMutation = useMutation({
    mutationFn: () => runAiOnThread(threadId),
    onError: handleError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiThreadMessages', threadId] });
      queryClient.invalidateQueries({ queryKey: ['aiThreads'] });
    },
  });

  const handleSend = async (content: string) => {
    if (!content.trim()) return;
    await sendMutation.mutateAsync(content);
  };

  const handleAskAi = async () => {
    await runAiMutation.mutateAsync();
  };

  const thread = threadsQuery.data?.find((t) => t.id === threadId);

  return (
    <MessengerThreadView
      thread={thread}
      messages={messagesQuery.data ?? []}
      loadingMessages={messagesQuery.isLoading}
      sending={sendMutation.isPending}
      askingAi={runAiMutation.isPending}
      onSend={handleSend}
      onAskAi={handleAskAi}
    />
  );
}

