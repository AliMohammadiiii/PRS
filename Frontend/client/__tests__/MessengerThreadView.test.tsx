import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MessengerThreadView from '../components/messenger/MessengerThreadView';
import { AiThread, AiMessage } from 'src/services/api/ai';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

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

describe('MessengerThreadView', () => {
  const mockThread: AiThread = {
    id: '1',
    title: 'Mom ❤️',
    last_message_preview: 'برم به ادامه جلسه ام برسم',
    message_count: 12,
    last_message_at: '2025-11-30T07:51:00Z',
    participants: [],
    request: null,
    unread_count: 2,
  };

  const mockMessages: AiMessage[] = [
    {
      id: '1',
      sender_type: 'USER',
      content: 'Hi',
      created_at: '2025-11-30T07:50:00Z',
    },
    {
      id: '2',
      sender_type: 'AI',
      content: 'Hello',
      created_at: '2025-11-30T07:51:00Z',
    },
    {
      id: '3',
      sender_type: 'SYSTEM',
      content: 'System message',
      created_at: '2025-11-30T07:52:00Z',
    },
  ];

  const mockOnSend = vi.fn();
  const mockOnAskAi = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('test_renders_header_with_thread_title', () => {
    renderWithProviders(
      <MessengerThreadView
        thread={mockThread}
        messages={[]}
        loadingMessages={false}
        sending={false}
        askingAi={false}
        onSend={mockOnSend}
        onAskAi={mockOnAskAi}
      />
    );

    // Check for thread title
    expect(screen.getByText('Mom ❤️')).toBeInTheDocument();

    // Check for timestamp or subtitle (should be visible)
    // The timestamp format may vary, so we check for presence of subtitle area
    const subtitle = screen.getByText(/AM|PM|online/);
    expect(subtitle).toBeInTheDocument();
  });

  it('test_renders_bubbles_for_user_and_ai', () => {
    renderWithProviders(
      <MessengerThreadView
        thread={mockThread}
        messages={mockMessages}
        loadingMessages={false}
        sending={false}
        askingAi={false}
        onSend={mockOnSend}
        onAskAi={mockOnAskAi}
      />
    );

    // Check that messages are rendered
    expect(screen.getByText('Hi')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('System message')).toBeInTheDocument();

    // Check alignment by looking at parent containers
    // USER message should be in a container with justify-end
    const userMessage = screen.getByText('Hi');
    const userContainer = userMessage.closest('.flex');
    expect(userContainer).toHaveClass('justify-end');

    // AI message should be in a container with justify-start
    const aiMessage = screen.getByText('Hello');
    const aiContainer = aiMessage.closest('.flex');
    expect(aiContainer).toHaveClass('justify-start');

    // SYSTEM message should be centered
    const systemMessage = screen.getByText('System message');
    const systemContainer = systemMessage.closest('.flex');
    expect(systemContainer).toHaveClass('justify-center');
  });

  it('test_sending_message_calls_on_send', async () => {
    renderWithProviders(
      <MessengerThreadView
        thread={mockThread}
        messages={mockMessages}
        loadingMessages={false}
        sending={false}
        askingAi={false}
        onSend={mockOnSend}
        onAskAi={mockOnAskAi}
      />
    );

    // Find the text input (TextField with multiline renders as textarea)
    const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement | HTMLTextAreaElement;
    expect(input).toBeInTheDocument();

    // Type a message
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(input.value).toBe('Test message');

    // Find and click the Send button
    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeInTheDocument();
    fireEvent.click(sendButton);

    // Verify onSend was called with the content
    await waitFor(() => {
      expect(mockOnSend).toHaveBeenCalledTimes(1);
      expect(mockOnSend).toHaveBeenCalledWith('Test message');
    });

    // Verify input is cleared after send
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('test_clicking_ask_ai_calls_on_ask_ai', async () => {
    renderWithProviders(
      <MessengerThreadView
        thread={mockThread}
        messages={mockMessages}
        loadingMessages={false}
        sending={false}
        askingAi={false}
        onSend={mockOnSend}
        onAskAi={mockOnAskAi}
      />
    );

    // Find and click the "Ask AI" button
    const askAiButton = screen.getByText('Ask AI');
    expect(askAiButton).toBeInTheDocument();
    fireEvent.click(askAiButton);

    // Verify onAskAi was called
    await waitFor(() => {
      expect(mockOnAskAi).toHaveBeenCalledTimes(1);
    });
  });

  it('test_auto_scrolls_to_bottom_when_messages_change', () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = renderWithProviders(
      <MessengerThreadView
        thread={mockThread}
        messages={mockMessages.slice(0, 1)}
        loadingMessages={false}
        sending={false}
        askingAi={false}
        onSend={mockOnSend}
        onAskAi={mockOnAskAi}
      />
    );

    // Clear previous calls
    scrollIntoViewMock.mockClear();

    // Add a new message
    rerender(
      <MessengerThreadView
        thread={mockThread}
        messages={mockMessages}
        loadingMessages={false}
        sending={false}
        askingAi={false}
        onSend={mockOnSend}
        onAskAi={mockOnAskAi}
      />
    );

    // Verify scrollIntoView was called
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});

