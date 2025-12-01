import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatHeader from '../components/messenger/ChatHeader';
import { AiThread } from 'src/services/api/ai';
import { useUiMode } from '../hooks/useUiMode';

// Mock the UI mode hook
vi.mock('../hooks/useUiMode');

// Mock router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('Messenger PR Linking', () => {
  const mockUseUiMode = vi.mocked(useUiMode);

  const mockThreadWithPR: AiThread = {
    id: '1',
    title: 'Test Thread',
    request: '123e4567-e89b-12d3-a456-426614174000',
    request_id: '123e4567-e89b-12d3-a456-426614174000',
    request_code: '123e4567-e89b-12d3-a456-426614174000',
    request_status: 'IN_REVIEW',
    last_message_at: '2025-01-01T00:00:00Z',
    participants: [],
    message_count: 5,
    last_message_preview: 'Test message',
  };

  const mockThreadWithoutPR: AiThread = {
    id: '2',
    title: 'Test Thread 2',
    request: null,
    request_id: null,
    request_code: null,
    request_status: null,
    last_message_at: '2025-01-01T00:00:00Z',
    participants: [],
    message_count: 3,
    last_message_preview: 'Test message 2',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PR hint visible in MESSENGER_ONLY mode, no link', () => {
    mockUseUiMode.mockReturnValue({
      data: {
        ui_mode: 'MESSENGER_ONLY',
        username: 'testuser',
        is_staff: false,
      },
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      status: 'success',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
      refetch: vi.fn(),
      remove: vi.fn(),
    } as any);

    renderWithProviders(<ChatHeader thread={mockThreadWithPR} />);

    // Check that PR hint is visible
    expect(screen.getByText(/Linked PR:/)).toBeInTheDocument();
    expect(screen.getByText(/IN_REVIEW/)).toBeInTheDocument();

    // Check that "Open in PRS" link is NOT visible
    expect(screen.queryByText('Open in PRS')).not.toBeInTheDocument();
  });

  it('PR hint + link visible in FULL_DASHBOARD mode, correct URL', () => {
    mockUseUiMode.mockReturnValue({
      data: {
        ui_mode: 'FULL_DASHBOARD',
        username: 'testuser',
        is_staff: false,
      },
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      status: 'success',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
      refetch: vi.fn(),
      remove: vi.fn(),
    } as any);

    renderWithProviders(<ChatHeader thread={mockThreadWithPR} />);

    // Check that PR hint is visible
    expect(screen.getByText(/Linked PR:/)).toBeInTheDocument();
    expect(screen.getByText(/IN_REVIEW/)).toBeInTheDocument();

    // Check that "Open in PRS" link is visible
    const link = screen.getByText('Open in PRS');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('/requests/123e4567-e89b-12d3-a456-426614174000')
    );
  });

  it('No PR hint when thread is not linked to PR', () => {
    mockUseUiMode.mockReturnValue({
      data: {
        ui_mode: 'FULL_DASHBOARD',
        username: 'testuser',
        is_staff: false,
      },
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      status: 'success',
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: 0,
      failureCount: 0,
      failureReason: null,
      fetchStatus: 'idle',
      isFetched: true,
      isFetchedAfterMount: true,
      isFetching: false,
      isInitialLoading: false,
      isPaused: false,
      isPlaceholderData: false,
      isPreviousData: false,
      isRefetching: false,
      isStale: false,
      refetch: vi.fn(),
      remove: vi.fn(),
    } as any);

    renderWithProviders(<ChatHeader thread={mockThreadWithoutPR} />);

    // Check that PR hint is NOT visible
    expect(screen.queryByText(/Linked PR:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Open in PRS')).not.toBeInTheDocument();
  });
});


