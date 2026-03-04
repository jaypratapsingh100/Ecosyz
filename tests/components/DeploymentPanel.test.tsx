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
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}))) // loadDeploymentInfo on mount
      .mockRejectedValueOnce(new Error('Network error occurred')); // download

    render(<DeploymentPanel projectId="test-id" projectName="Test" />);

    await waitFor(() => {
      const downloadButton = screen.getByRole('button', { name: /Download ZIP/i });
      expect(downloadButton).toBeInTheDocument();
    });

    const downloadButton = screen.getByRole('button', { name: /Download ZIP/i });
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
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}))) // loadDeploymentInfo on mount
      .mockRejectedValueOnce(new Error('network fetch failed')); // deploy

    render(<DeploymentPanel projectId="test-id" projectName="Test" />);

    await waitFor(() => {
      const deployButton = screen.getByRole('button', { name: /Deploy to Vercel/i });
      expect(deployButton).toBeInTheDocument();
    });

    const deployButton = screen.getByRole('button', { name: /Deploy to Vercel/i });
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
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}))) // loadDeploymentInfo on mount
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Deployment configuration error' }), {
          status: 400,
        })
      ); // deploy

    render(<DeploymentPanel projectId="test-id" projectName="Test" />);

    await waitFor(() => {
      const deployButton = screen.getByRole('button', { name: /Deploy to Vercel/i });
      expect(deployButton).toBeInTheDocument();
    });

    const deployButton = screen.getByRole('button', { name: /Deploy to Vercel/i });
    await user.click(deployButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Deployment Failed',
        expect.any(Object)
      );
    });
  });
});
