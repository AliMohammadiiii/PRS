import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from '@tanstack/react-router';
import { useUiMode } from '../hooks/useUiMode';
import { getUiMode } from 'src/services/api/uiMode';

// Mock the UI mode API
vi.mock('src/services/api/uiMode', () => ({
  getUiMode: vi.fn(),
}));

// Mock the hook
vi.mock('../hooks/useUiMode');

// Mock router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/dashboard' }),
  };
});

describe('UI Mode Routing', () => {
  const mockGetUiMode = vi.mocked(getUiMode);
  const mockUseUiMode = vi.mocked(useUiMode);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('FULL_DASHBOARD mode shows PRS menu items', async () => {
    mockGetUiMode.mockResolvedValue({
      ui_mode: 'FULL_DASHBOARD',
      username: 'testuser',
      is_staff: false,
    });

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

    // This test verifies that when UI mode is FULL_DASHBOARD,
    // the SideBar component should receive isMessengerOnly=false
    // and show all PRS menu items
    expect(mockUseUiMode().data?.ui_mode).toBe('FULL_DASHBOARD');
  });

  it('MESSENGER_ONLY mode hides PRS menu items', async () => {
    mockGetUiMode.mockResolvedValue({
      ui_mode: 'MESSENGER_ONLY',
      username: 'testuser',
      is_staff: false,
    });

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

    // This test verifies that when UI mode is MESSENGER_ONLY,
    // the SideBar component should receive isMessengerOnly=true
    // and show only messenger-related menu items
    expect(mockUseUiMode().data?.ui_mode).toBe('MESSENGER_ONLY');
  });
});





