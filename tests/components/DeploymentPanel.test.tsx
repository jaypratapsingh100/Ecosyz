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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // loadDeploymentInfo
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
    // loadDeploymentInfo (mount), session check, then deploy fails
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // loadDeploymentInfo
      .mockResolvedValueOnce({ ok: true }) // session
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
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // loadDeploymentInfo
      .mockResolvedValueOnce({ ok: true }) // session
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Deployment configuration error' }),
      }); // deploy

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

  it('renders deployment URLs after successful deploy', async () => {
    const user = userEvent.setup();
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // loadDeploymentInfo
      .mockResolvedValueOnce({ ok: true }) // session
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: 'https://my-app.vercel.app',
          claimUrl: 'https://vercel.com/claim/abc',
        }),
      }); // deploy

    render(<DeploymentPanel projectId="test-id" projectName="Test" />);

    await waitFor(() => {
      const deployButton = screen.getByRole('button', { name: /Deploy to Vercel/i });
      expect(deployButton).toBeInTheDocument();
    });

    const deployButton = screen.getByRole('button', { name: /Deploy to Vercel/i });
    await user.click(deployButton);

    await waitFor(() => {
      expect(screen.getByText('https://my-app.vercel.app')).toBeInTheDocument();
      expect(screen.getByText('https://vercel.com/claim/abc')).toBeInTheDocument();
    });
  });

  it('calls onAuthRequired when download returns 401', async () => {
    const user = userEvent.setup();
    const onAuthRequired = vi.fn();
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // loadDeploymentInfo
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Not authenticated' }),
      }); // download

    render(
      <DeploymentPanel
        projectId="test-id"
        projectName="Test"
        onAuthRequired={onAuthRequired}
      />
    );

    await waitFor(() => {
      const downloadButton = screen.getByText(/Download ZIP/i);
      expect(downloadButton).toBeInTheDocument();
    });

    const downloadButton = screen.getByText(/Download ZIP/i);
    await user.click(downloadButton);

    await waitFor(() => {
      expect(onAuthRequired).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        'Session Expired',
        expect.any(Object)
      );
    });
  });

  it('disables buttons when projectId is empty', () => {
    render(<DeploymentPanel projectId="" projectName="Test" />);

    expect(screen.getByRole('button', { name: /Deploy to Vercel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Download ZIP/i })).toBeDisabled();
  });
});
