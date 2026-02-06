import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppChat from '../../app/components/app-builder/AppChat';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

global.fetch = vi.fn();

describe('AppChat Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful GET for chat history
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });
  });

  it('shows specific error message for 401 status', async () => {
    const user = userEvent.setup();
    
    // Mock POST request failure
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    render(<AppChat projectId="test-id" />);

    // Wait for component to load
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/describe/i);
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/describe/i);
    await user.type(input, 'Test message');
    
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Chat Error',
        expect.objectContaining({
          description: expect.stringContaining('sign in'),
        })
      );
    });
  });

  it('shows network error message for fetch failures', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<AppChat projectId="test-id" />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/describe/i);
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/describe/i);
    await user.type(input, 'Test message');
    
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Connection Error',
        expect.objectContaining({
          description: expect.stringContaining('Network error'),
        })
      );
    });
  });

  it('shows 429 error message for rate limiting', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Too many requests' }),
    });

    render(<AppChat projectId="test-id" />);

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/describe/i);
      expect(input).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/describe/i);
    await user.type(input, 'Test message');
    
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Chat Error',
        expect.objectContaining({
          description: expect.stringContaining('wait a moment'),
        })
      );
    });
  });
});
