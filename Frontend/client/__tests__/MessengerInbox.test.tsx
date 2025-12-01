import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MessengerInbox from '../components/messenger/MessengerInbox';
import { AiThread } from 'src/services/api/ai';

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

describe('MessengerInbox', () => {
  const mockThreads: AiThread[] = [
    {
      id: '1',
      title: 'Mom ❤️',
      last_message_preview: 'برم به ادامه جلسه ام برسم',
      message_count: 12,
      last_message_at: '2025-11-30T07:51:00Z',
      participants: [],
      request: null,
      unread_count: 2,
    },
    {
      id: '2',
      title: 'Moon :) 🌑',
      last_message_preview: 'خوب بخوابی قشنگ جان',
      message_count: 3,
      last_message_at: '2025-11-30T00:37:00Z',
      participants: [],
      request: null,
      unread_count: 0,
    },
  ];

  const mockOnSelectThread = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_renders_top_app_bar', () => {
    renderWithProviders(
      <MessengerInbox
        threads={[]}
        isLoading={false}
        onSelectThread={mockOnSelectThread}
      />
    );

    // Check for "AI Messenger" title
    expect(screen.getByText('AI Messenger')).toBeInTheDocument();

    // Check for subtitle (should not be visible when not loading)
    const subtitle = screen.queryByText('Updating...');
    expect(subtitle).not.toBeInTheDocument();
  });

  it('test_renders_top_app_bar_with_loading', () => {
    renderWithProviders(
      <MessengerInbox
        threads={[]}
        isLoading={true}
        onSelectThread={mockOnSelectThread}
      />
    );

    // Check for "AI Messenger" title
    expect(screen.getByText('AI Messenger')).toBeInTheDocument();

    // Check for "Updating..." subtitle when loading
    expect(screen.getByText('Updating...')).toBeInTheDocument();

    // Check for loading spinner (CircularProgress)
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('test_renders_segmented_filters', () => {
    renderWithProviders(
      <MessengerInbox
        threads={[]}
        isLoading={false}
        onSelectThread={mockOnSelectThread}
      />
    );

    // Check for filter buttons
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('Injast')).toBeInTheDocument();
    expect(screen.getByText('University')).toBeInTheDocument();
    expect(screen.getByText('Proxy')).toBeInTheDocument();

    // Check that "All" is selected (should have contained variant)
    // The button should have the contained variant styling
    const allButton = screen.getByText('All').closest('button');
    expect(allButton).toBeInTheDocument();
    // The button should be styled as contained (we can check by its text color or background)
  });

  it('test_renders_thread_rows_with_metadata', () => {
    renderWithProviders(
      <MessengerInbox
        threads={mockThreads}
        isLoading={false}
        onSelectThread={mockOnSelectThread}
      />
    );

    // Check thread titles
    expect(screen.getByText('Mom ❤️')).toBeInTheDocument();
    expect(screen.getByText('Moon :) 🌑')).toBeInTheDocument();

    // Check previews
    expect(screen.getByText('برم به ادامه جلسه ام برسم')).toBeInTheDocument();
    expect(screen.getByText('خوب بخوابی قشنگ جان')).toBeInTheDocument();

    // Check unread badge for first thread (should show "2")
    expect(screen.getByText('2')).toBeInTheDocument();

    // Check that timestamps are present (they should be formatted)
    // The exact format may vary, so we just check that some timestamp text exists
    const timestamps = screen.getAllByText(/AM|PM|Sat|Sun|Mon|Tue|Wed|Thu|Fri|\d{1,2}\/\d{1,2}/);
    expect(timestamps.length).toBeGreaterThan(0);
  });

  it('test_clicking_thread_calls_on_select', () => {
    renderWithProviders(
      <MessengerInbox
        threads={mockThreads}
        isLoading={false}
        onSelectThread={mockOnSelectThread}
      />
    );

    // Find and click on the first thread row
    // The ThreadListItem has onClick handler on the Box container
    const threadTitle = screen.getByText('Mom ❤️');
    const threadContainer = threadTitle.closest('div[style*="cursor: pointer"]') || 
                            threadTitle.closest('div');
    
    if (threadContainer) {
      fireEvent.click(threadContainer);
    } else {
      // Fallback: click on the title directly
      fireEvent.click(threadTitle);
    }
    
    expect(mockOnSelectThread).toHaveBeenCalledTimes(1);
    expect(mockOnSelectThread).toHaveBeenCalledWith('1');
  });

  it('test_empty_state_message_when_no_threads', () => {
    renderWithProviders(
      <MessengerInbox
        threads={[]}
        isLoading={false}
        onSelectThread={mockOnSelectThread}
      />
    );

    // Check for empty state message
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });
});

