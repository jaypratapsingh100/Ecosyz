'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Snapshot {
  id: string;
  label: string | null;
  createdAt: string;
  fileCount: number;
}

interface SnapshotPanelProps {
  projectId: string;
  onRestored?: () => void;
}

export default function SnapshotPanel({ projectId, onRestored }: SnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/app-projects/${projectId}/snapshot`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data.snapshots ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const saveVersion = async () => {
    setSaving(true);
    try {
      const label = `Version ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      const res = await fetch(`/api/app-projects/${projectId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label }),
      });
      if (res.ok) {
        toast.success('Version saved');
        await loadSnapshots();
      } else {
        toast.error('Failed to save version');
      }
    } catch {
      toast.error('Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  const restoreSnapshot = async (snapId: string) => {
    setRestoringId(snapId);
    try {
      const res = await fetch(`/api/app-projects/${projectId}/snapshot/${snapId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success('Version restored');
        onRestored?.();
        window.dispatchEvent(new CustomEvent('files-updated', { detail: { projectId } }));
        setTimeout(() => window.dispatchEvent(new CustomEvent('auto-refresh-preview', { detail: { projectId } })), 400);
      } else {
        toast.error('Failed to restore version');
      }
    } catch {
      toast.error('Failed to restore version');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white p-4 gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Version History</h3>
        <button
          onClick={saveVersion}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg font-medium hover:shadow-lg hover:shadow-violet-500/25 transition-all disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          )}
          Save Version
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mr-2" />
          Loading...
        </div>
      ) : snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm text-center gap-2">
          <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No versions saved yet.</p>
          <p className="text-xs text-slate-600">Click "Save Version" to create your first snapshot.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/8 transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{snap.label || 'Unnamed version'}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(snap.createdAt).toLocaleString()} · {snap.fileCount} file{snap.fileCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => restoreSnapshot(snap.id)}
                disabled={!!restoringId}
                className="ml-3 flex-shrink-0 text-xs px-3 py-1.5 border border-violet-500/40 text-violet-400 rounded-lg hover:bg-violet-500/10 transition-colors disabled:opacity-50"
              >
                {restoringId === snap.id ? (
                  <span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Restore'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
