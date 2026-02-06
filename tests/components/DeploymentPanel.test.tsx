import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeploymentPanel from '../../app/components/app-builder/DeploymentPanel';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('DeploymentPanel Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows toast on download failure', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockRejectedValueOnce(
      new Error('Network error occurred')
    );

    render(<DeploymentPanel projectId="test-id" projectName="Test" />);

    // Wait for component to load
    await waitFor(() => {
      const downloadButton = screen.getByText(/Download ZIP/i);
      expect(downloadButton).toBeInTheDocument();
    });

    const downloadButton = screen.getByText(/Download ZIP/i);
    await user.click(downloadButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Download Failed',
        expect.objectContaining({
          description: expect.stringContaining('Network error'),
        })
      );
    });
  });

  it('shows toast on deployment failure with network error', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockRejectedValueOnce(
      new Error('network fetch failed')
    );

    render(<DeploymentPanel projectId="test-id" projectName="Test" />);

    await waitFor(() => {
      const deployButton = screen.getByText(/Deploy to Vercel/i);
      expect(deployButton).toBeInTheDocument();
    });

    const deployButton = screen.getByText(/Deploy to Vercel/i);
    await user.click(deployButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Deployment Failed',
        expect.objectContaining({
          description: expect.stringContaining('Network error'),
        })
      );
    });
  });

  it('shows toast on deployment API error', async () => {
    const user = userEvent.setup();
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Deployment configuration error' }),
    });

    render(<DeploymentPanel projectId="test-id" projectName="Test" />);

    await waitFor(() => {
      const deployButton = screen.getByText(/Deploy to Vercel/i);
      expect(deployButton).toBeInTheDocument();
    });

    const deployButton = screen.getByText(/Deploy to Vercel/i);
    await user.click(deployButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Deployment Failed',
        expect.any(Object)
      );
    });
  });
});
