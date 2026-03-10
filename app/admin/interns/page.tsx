'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Plus, Loader2, LogIn, FileText, Target, Calendar, ChevronDown, ChevronUp, ChevronRight, Flag, Briefcase, Trash2, Lock, Unlock, Database, IndianRupee, CheckCircle2, XCircle } from 'lucide-react';
import { INTERN_TRACKS } from '@/lib/intern-tracks';

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  stipend: number | null;
  dueDate: string | null;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  stipend: number | null;
  status: string;
  highlighted: boolean;
  tasks: Task[];
  subTrack: { id: string; name: string } | null;
};

type SubTrack = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  milestones: Milestone[];
  _count: { milestones: number };
};

type Track = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  stipendRange: string | null;
  _count: { fellows: number; tasks: number };
  subTracks: SubTrack[];
  milestones: Milestone[];
  tasks: Task[];
};

type Fellow = {
  id: string;
  trackId: string;
  track: { slug: string; name: string };
  resumeUrl: string | null;
  status: string;
  xp: number;
  milestonesCompleted: number;
  unlockedMilestoneIds: string[];
  user: { id: string; name: string | null; email: string };
  tasks: Array<{ id: string; title: string; status: string }>;
};

export default function AdminInternsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [fellows, setFellows] = useState<Fellow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [collapsedSubTrackIds, setCollapsedSubTrackIds] = useState<Set<string>>(new Set());
  const [collapsedMilestoneIds, setCollapsedMilestoneIds] = useState<Set<string>>(new Set());
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string; stats?: Record<string, number> } | null>(null);

  // Modals
  const [showAddSubTrack, setShowAddSubTrack] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const [addSubTrackTrackId, setAddSubTrackTrackId] = useState('');
  const [addSubTrackName, setAddSubTrackName] = useState('');
  const [addSubTrackDesc, setAddSubTrackDesc] = useState('');

  const [addMilestoneTrackId, setAddMilestoneTrackId] = useState('');
  const [addMilestoneSubTrackId, setAddMilestoneSubTrackId] = useState('');
  const [addMilestoneTitle, setAddMilestoneTitle] = useState('');
  const [addMilestoneDesc, setAddMilestoneDesc] = useState('');
  const [addMilestoneDueDate, setAddMilestoneDueDate] = useState('');
  const [addMilestoneStipend, setAddMilestoneStipend] = useState('');

  const [addTaskTrackId, setAddTaskTrackId] = useState('');
  const [addTaskMilestoneId, setAddTaskMilestoneId] = useState('');
  const [addTaskTitle, setAddTaskTitle] = useState('');
  const [addTaskDesc, setAddTaskDesc] = useState('');
  const [addTaskStipend, setAddTaskStipend] = useState('');
  const [addTaskDueDate, setAddTaskDueDate] = useState('');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/check');
        if (res.ok) setIsAdmin(true);
      } catch {
        // not admin
      } finally {
        setAuthLoading(false);
      }
    };
    check();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, fRes] = await Promise.all([
        fetch('/api/admin/interns/tracks'),
        fetch('/api/admin/interns'),
      ]);
      const tData = await tRes.json();
      const fData = await fRes.json();
      if (tRes.ok) setTracks(tData.tracks || []);
      if (fRes.ok) setFellows(fData.fellows || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const handleAddSubTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSubTrackTrackId || !addSubTrackName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/interns/subtracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: addSubTrackTrackId,
          name: addSubTrackName.trim(),
          description: addSubTrackDesc.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShowAddSubTrack(false);
      setAddSubTrackTrackId('');
      setAddSubTrackName('');
      setAddSubTrackDesc('');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add sub-track');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMilestoneTrackId || !addMilestoneTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/interns/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: addMilestoneTrackId,
          subTrackId: addMilestoneSubTrackId || undefined,
          title: addMilestoneTitle.trim(),
          description: addMilestoneDesc.trim() || undefined,
          dueDate: addMilestoneDueDate || undefined,
          stipend: addMilestoneStipend ? parseInt(addMilestoneStipend, 10) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShowAddMilestone(false);
      setAddMilestoneTrackId('');
      setAddMilestoneSubTrackId('');
      setAddMilestoneTitle('');
      setAddMilestoneDesc('');
      setAddMilestoneDueDate('');
      setAddMilestoneStipend('');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add milestone');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTaskTrackId || !addTaskTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/interns/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: addTaskTrackId,
          milestoneId: addTaskMilestoneId || undefined,
          title: addTaskTitle.trim(),
          description: addTaskDesc.trim() || undefined,
          stipend: addTaskStipend ? parseInt(addTaskStipend, 10) : undefined,
          dueDate: addTaskDueDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setShowAddTask(false);
      setAddTaskTrackId('');
      setAddTaskMilestoneId('');
      setAddTaskTitle('');
      setAddTaskDesc('');
      setAddTaskStipend('');
      setAddTaskDueDate('');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      const res = await fetch(`/api/admin/interns/tasks?id=${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete task');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Delete this milestone and all its tasks?')) return;
    try {
      const res = await fetch(`/api/admin/interns/milestones?id=${milestoneId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete milestone');
    }
  };

  const handleDeleteSubTrack = async (subTrackId: string) => {
    if (!confirm('Delete this sub-track and all its milestones and tasks?')) return;
    try {
      const res = await fetch(`/api/admin/interns/subtracks?id=${subTrackId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete sub-track');
    }
  };

  const toggleSubTrack = (id: string) => {
    setCollapsedSubTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMilestone = (id: string) => {
    setCollapsedMilestoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReviewTask = async (taskId: string, action: 'approve' | 'reject', note?: string) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/interns/tasks/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      alert(data.message || 'Done');
      loadData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to review task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveFellow = async (fellowId: string) => {
    try {
      const res = await fetch('/api/admin/interns/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fellowId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setFellows((prev) =>
        prev.map((f) => (f.id === fellowId ? { ...f, status: 'active' } : f))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to approve');
    }
  };

  const handleToggleUnlock = async (fellowId: string, milestoneId: string, unlock: boolean) => {
    try {
      const res = await fetch('/api/admin/interns/unlock-milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fellowId, milestoneId, unlock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setFellows((prev) =>
        prev.map((f) =>
          f.id === fellowId ? { ...f, unlockedMilestoneIds: data.unlockedMilestoneIds } : f
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to toggle unlock');
    }
  };

  const handleSeedWhitepaper = async () => {
    if (!confirm('This will seed all whitepaper-derived sub-tracks, milestones, and tasks. Existing data will not be duplicated. Continue?')) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/interns/seed-whitepaper', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to seed');
      setSeedResult({ success: true, message: data.message, stats: data.stats });
      await loadData();
    } catch (e) {
      setSeedResult({ success: false, message: e instanceof Error ? e.message : 'Seed failed' });
    } finally {
      setSeeding(false);
    }
  };

  const allMilestonesForTrack = (t: Track): Milestone[] => {
    const fromSubTracks = t.subTracks.flatMap((st) => st.milestones);
    const fromTrack = t.milestones || [];
    return [...fromTrack, ...fromSubTracks];
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 border border-slate-700/50 max-w-md w-full text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/30">
                <LogIn className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Admin access required</h2>
            <p className="text-slate-300 mb-6">Sign in with an admin account to manage interns.</p>
            <Link
              href="/auth?redirect=%2Fadmin%2Finterns"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/30 transition-colors font-medium"
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-7xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Office Interns</h1>
        <p className="text-slate-300 mt-1">
          Manage tracks → sub-tracks → milestones → tasks. Milestones have due date and stipend.
        </p>
      </div>

      {/* Available Positions (Tracks) - prominent section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-cyan-400" />
          Available Positions (Tracks)
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          These are the fellowship tracks interns can join. Expand a track to add sub-tracks, milestones, and tasks.
        </p>
      </div>

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setShowAddSubTrack(true)}
          disabled={tracks.length === 0}
          className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add sub-track
        </button>
        <button
          onClick={() => setShowAddMilestone(true)}
          disabled={tracks.length === 0}
          className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Flag className="w-4 h-4" />
          Add milestone
        </button>
        <button
          onClick={() => setShowAddTask(true)}
          disabled={tracks.length === 0}
          className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add task
        </button>

        <div className="w-px bg-slate-700/50 mx-1 hidden sm:block" />

        <button
          onClick={handleSeedWhitepaper}
          disabled={seeding}
          className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {seeding ? 'Seeding...' : 'Seed Whitepaper Data'}
        </button>

        <Link
          href="/admin/interns/payouts"
          className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 flex items-center gap-2 font-medium"
        >
          <IndianRupee className="w-4 h-4" />
          Payouts Dashboard
        </Link>
      </div>

      {/* Seed result banner */}
      {seedResult && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            seedResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={seedResult.success ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
              {seedResult.message}
            </p>
            <button
              onClick={() => setSeedResult(null)}
              className="text-slate-400 hover:text-white text-sm"
            >
              Dismiss
            </button>
          </div>
          {seedResult.stats && (
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-300">
              <span>Tracks: <strong className="text-violet-400">{seedResult.stats.tracksUpserted}</strong></span>
              <span>Sub-tracks: <strong className="text-emerald-400">{seedResult.stats.subTracksCreated}</strong></span>
              <span>Milestones: <strong className="text-amber-400">{seedResult.stats.milestonesCreated}</strong></span>
              <span>Tasks: <strong className="text-cyan-400">{seedResult.stats.tasksCreated}</strong></span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <>
          {/* All Tracks - Hierarchy */}
          <div className="mb-10">
            <div className="space-y-4">
              {tracks.length === 0 ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
                  <p className="text-amber-400 font-medium mb-2">No tracks loaded</p>
                  <p className="text-slate-400 text-sm mb-4">
                    The 4 available positions below should appear here. If not, run migrations and reload.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {INTERN_TRACKS.map((t) => (
                      <div key={t.slug} className="p-3 rounded-lg bg-slate-800/50 border border-slate-600/50">
                        <p className="font-medium text-slate-300">{t.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{t.slug}</p>
                        <p className="text-slate-500 text-xs mt-1">{t.stipendRange}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={loadData}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 text-sm font-medium"
                  >
                    Reload
                  </button>
                </div>
              ) : (
              tracks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-slate-700/50 bg-slate-900/60 overflow-hidden"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedTrackId(expandedTrackId === t.id ? null : t.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedTrackId(expandedTrackId === t.id ? null : t.id); }}
                    className="w-full p-5 flex items-start justify-between gap-4 text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-cyan-400 text-lg">{t.name}</p>
                      <p className="text-slate-500 text-sm mt-0.5">Slug: {t.slug}</p>
                      {t.description && (
                        <p className="text-slate-400 text-sm mt-2 line-clamp-2">{t.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-3 text-sm">
                        <span className="text-slate-400">Stipend: {t.stipendRange || '—'}</span>
                        <span className="text-slate-500">{t._count.fellows} interns</span>
                        <span className="text-slate-500">{t.subTracks?.length || 0} sub-tracks</span>
                        <span className="text-slate-500">{allMilestonesForTrack(t).length} milestones</span>
                        <span className="text-slate-500">{t._count.tasks} tasks</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddSubTrackTrackId(t.id);
                          setShowAddSubTrack(true);
                        }}
                        className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded"
                      >
                        + Sub-track
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddMilestoneTrackId(t.id);
                          setShowAddMilestone(true);
                        }}
                        className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded"
                      >
                        + Milestone
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddTaskTrackId(t.id);
                          setShowAddTask(true);
                        }}
                        className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded"
                      >
                        + Task
                      </button>
                      {expandedTrackId === t.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  {expandedTrackId === t.id && (
                    <div className="border-t border-slate-700/50 p-5 bg-slate-800/30 space-y-4">
                      {/* Sub-tracks */}
                      {t.subTracks && t.subTracks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-emerald-400 mb-2">Sub-tracks</h4>
                          {t.subTracks.map((st) => {
                            const isSubTrackCollapsed = collapsedSubTrackIds.has(st.id);
                            return (
                            <div key={st.id} className="ml-4 mb-4 rounded-lg bg-slate-800/50 border border-emerald-500/20 overflow-hidden">
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleSubTrack(st.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSubTrack(st.id); }}
                                className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-slate-700/30 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isSubTrackCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-emerald-400 shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                                  )}
                                  <p className="font-medium text-white truncate">{st.name}</p>
                                  <span className="text-xs text-slate-500">({st.milestones?.length || 0} milestones)</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => { setAddMilestoneTrackId(t.id); setAddMilestoneSubTrackId(st.id); setShowAddMilestone(true); }}
                                    className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30"
                                  >
                                    + Milestone
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSubTrack(st.id)}
                                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                    title="Delete sub-track"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {!isSubTrackCollapsed && (
                                <div className="px-3 pb-3 pt-0">
                                  {st.description && <p className="text-slate-400 text-sm mb-3">{st.description}</p>}
                                  {st.milestones?.length > 0 ? (
                                <div className="space-y-2">
                                  {st.milestones.map((m) => {
                                    const isMilestoneCollapsed = collapsedMilestoneIds.has(m.id);
                                    return (
                                    <div key={m.id} className={`ml-4 rounded border-l-2 ${m.highlighted ? 'bg-violet-500/10 border-violet-400 ring-1 ring-violet-500/30' : 'bg-slate-900/50 border-amber-500/50'}`}>
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleMilestone(m.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMilestone(m.id); }}
                                        className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-slate-800/30 rounded transition-colors"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          {isMilestoneCollapsed ? (
                                            <ChevronRight className={`w-4 h-4 shrink-0 ${m.highlighted ? 'text-violet-400' : 'text-amber-400'}`} />
                                          ) : (
                                            <ChevronDown className={`w-4 h-4 shrink-0 ${m.highlighted ? 'text-violet-400' : 'text-amber-400'}`} />
                                          )}
                                          <Flag className={`w-4 h-4 shrink-0 ${m.highlighted ? 'text-violet-400' : 'text-amber-400'}`} />
                                          {m.highlighted && <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-violet-500/30 text-violet-300 rounded animate-pulse">Priority</span>}
                                          <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-amber-500/20 text-amber-400 rounded">Milestone</span>
                                          <p className={`font-medium truncate ${m.highlighted ? 'text-violet-300' : 'text-amber-400'}`}>{m.title}</p>
                                          <span className="text-xs text-slate-500">({m.tasks?.length || 0} tasks)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            onClick={() => { setAddTaskTrackId(t.id); setAddTaskMilestoneId(m.id); setShowAddTask(true); }}
                                            className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30"
                                          >
                                            + Add task
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMilestone(m.id)}
                                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                            title="Delete milestone"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      {!isMilestoneCollapsed && (
                                        <div className="px-3 pb-3 pt-0">
                                          <div className="flex gap-3 text-xs text-slate-500 mt-1 ml-6">
                                            {m.dueDate && <span>Due {new Date(m.dueDate).toLocaleDateString()}</span>}
                                            {m.stipend != null && <span className="text-cyan-400">₹{m.stipend}</span>}
                                            <span>{m.tasks?.length || 0} tasks</span>
                                          </div>
                                          {m.tasks?.length > 0 ? (
                                            <ul className="mt-2 ml-6 space-y-1 text-sm text-slate-400">
                                              {m.tasks.map((task) => (
                                                <li key={task.id} className="flex items-center justify-between group">
                                                  <span>• {task.title}{task.stipend != null && <span className="text-cyan-400 ml-1">₹{task.stipend}</span>}</span>
                                                  <button type="button" onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity" title="Delete task">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p className="text-slate-500 text-sm ml-6 mt-2">No tasks in this milestone</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>
                                  ) : (
                                    <p className="text-slate-500 text-sm">No milestones in this sub-track</p>
                                  )}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Track-level milestones */}
                      {t.milestones && t.milestones.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-amber-400 mb-2">Milestones (track-level)</h4>
                          {t.milestones.map((m) => {
                            const isMilestoneCollapsed = collapsedMilestoneIds.has(m.id);
                            return (
                            <div key={m.id} className={`ml-4 mb-3 rounded border-l-2 ${m.highlighted ? 'bg-violet-500/10 border-violet-400 ring-1 ring-violet-500/30' : 'bg-slate-900/50 border-amber-500/50'}`}>
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleMilestone(m.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMilestone(m.id); }}
                                className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-slate-800/30 rounded transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isMilestoneCollapsed ? (
                                    <ChevronRight className={`w-4 h-4 shrink-0 ${m.highlighted ? 'text-violet-400' : 'text-amber-400'}`} />
                                  ) : (
                                    <ChevronDown className={`w-4 h-4 shrink-0 ${m.highlighted ? 'text-violet-400' : 'text-amber-400'}`} />
                                  )}
                                  <Flag className={`w-4 h-4 shrink-0 ${m.highlighted ? 'text-violet-400' : 'text-amber-400'}`} />
                                  {m.highlighted && <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-violet-500/30 text-violet-300 rounded animate-pulse">Priority</span>}
                                  <span className="px-1.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-amber-500/20 text-amber-400 rounded">Milestone</span>
                                  <p className={`font-medium truncate ${m.highlighted ? 'text-violet-300' : 'text-amber-400'}`}>{m.title}</p>
                                  <span className="text-xs text-slate-500">({m.tasks?.length || 0} tasks)</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => { setAddTaskTrackId(t.id); setAddTaskMilestoneId(m.id); setShowAddTask(true); }}
                                    className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30"
                                  >
                                    + Add task
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMilestone(m.id)}
                                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                    title="Delete milestone"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {!isMilestoneCollapsed && (
                                <div className="px-3 pb-3 pt-0">
                                  <div className="flex gap-3 text-xs text-slate-500 mt-1 ml-6">
                                    {m.dueDate && <span>Due {new Date(m.dueDate).toLocaleDateString()}</span>}
                                    {m.stipend != null && <span className="text-cyan-400">₹{m.stipend}</span>}
                                    <span>{m.tasks?.length || 0} tasks</span>
                                  </div>
                                  {m.tasks?.length > 0 ? (
                                    <ul className="mt-2 ml-6 space-y-1 text-sm text-slate-400">
                                      {m.tasks.map((task) => (
                                        <li key={task.id} className="flex items-center justify-between group">
                                          <span>• {task.title}{task.stipend != null && <span className="text-cyan-400 ml-1">₹{task.stipend}</span>}</span>
                                          <button type="button" onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity" title="Delete task">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-slate-500 text-sm ml-6 mt-2">No tasks in this milestone</p>
                                  )}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Legacy tasks (no milestone) */}
                      {t.tasks && t.tasks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2">Tasks (no milestone)</h4>
                          <ul className="space-y-1">
                            {t.tasks.map((task) => (
                              <li key={task.id} className="py-1 px-2 rounded bg-slate-800/50 text-sm flex items-center justify-between group">
                                <span>
                                  {task.title}
                                  {task.stipend != null && <span className="text-cyan-400 ml-2">₹{task.stipend}</span>}
                                </span>
                                <button type="button" onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-300 transition-opacity" title="Delete task">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(!t.subTracks || t.subTracks.length === 0) &&
                        (!t.milestones || t.milestones.length === 0) &&
                        (!t.tasks || t.tasks.length === 0) && (
                          <p className="text-slate-500 text-sm">No sub-tracks, milestones, or tasks. Use the buttons above to add.</p>
                        )}
                    </div>
                  )}
                </div>
              ))
            )}
            </div>
          </div>

          {/* Add Sub-track Modal */}
          {showAddSubTrack && (
            <Modal title="Add sub-track" onClose={() => setShowAddSubTrack(false)}>
              <form onSubmit={handleAddSubTrack} className="space-y-4">
                <Select label="Track *" value={addSubTrackTrackId} onChange={setAddSubTrackTrackId} required>
                  <option value="">Select track</option>
                  {tracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>{tr.name}</option>
                  ))}
                </Select>
                <Input label="Name *" value={addSubTrackName} onChange={setAddSubTrackName} placeholder="e.g. Content Marketing" required />
                <Textarea label="Description" value={addSubTrackDesc} onChange={setAddSubTrackDesc} />
                <FormButtons submitting={submitting} onCancel={() => setShowAddSubTrack(false)} />
              </form>
            </Modal>
          )}

          {/* Add Milestone Modal */}
          {showAddMilestone && (
            <Modal title="Add milestone (due date + stipend)" onClose={() => setShowAddMilestone(false)}>
              <form onSubmit={handleAddMilestone} className="space-y-4">
                <Select label="Track *" value={addMilestoneTrackId} onChange={(v) => { setAddMilestoneTrackId(v); setAddMilestoneSubTrackId(''); }} required>
                  <option value="">Select track</option>
                  {tracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>{tr.name}</option>
                  ))}
                </Select>
                <Select label="Sub-track (optional)" value={addMilestoneSubTrackId} onChange={setAddMilestoneSubTrackId}>
                  <option value="">— Track level —</option>
                  {addMilestoneTrackId && tracks.find((tr) => tr.id === addMilestoneTrackId)?.subTracks?.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </Select>
                <Input label="Title *" value={addMilestoneTitle} onChange={setAddMilestoneTitle} placeholder="e.g. Phase 1: Onboarding" required />
                <Textarea label="Description" value={addMilestoneDesc} onChange={setAddMilestoneDesc} />
                <Input label="Due date" type="date" value={addMilestoneDueDate} onChange={setAddMilestoneDueDate} />
                <Input label="Stipend (₹)" type="number" value={addMilestoneStipend} onChange={setAddMilestoneStipend} placeholder="Optional" />
                <FormButtons submitting={submitting} onCancel={() => setShowAddMilestone(false)} />
              </form>
            </Modal>
          )}

          {/* Add Task Modal */}
          {showAddTask && (
            <Modal title="Add task" onClose={() => setShowAddTask(false)}>
              <form onSubmit={handleAddTask} className="space-y-4">
                <Select label="Track *" value={addTaskTrackId} onChange={(v) => { setAddTaskTrackId(v); setAddTaskMilestoneId(''); }} required>
                  <option value="">Select track</option>
                  {tracks.map((tr) => (
                    <option key={tr.id} value={tr.id}>{tr.name}</option>
                  ))}
                </Select>
                <Select label="Milestone (optional)" value={addTaskMilestoneId} onChange={setAddTaskMilestoneId}>
                  <option value="">— No milestone —</option>
                  {addTaskTrackId && (() => {
                    const tr = tracks.find((t) => t.id === addTaskTrackId);
                    return tr ? allMilestonesForTrack(tr).map((m) => (
                      <option key={m.id} value={m.id}>{m.title} {m.subTrack ? `(${m.subTrack.name})` : ''}</option>
                    )) : null;
                  })()}
                </Select>
                <Input label="Title *" value={addTaskTitle} onChange={setAddTaskTitle} placeholder="Task title" required />
                <Textarea label="Description" value={addTaskDesc} onChange={setAddTaskDesc} />
                <Input label="Stipend (₹)" type="number" value={addTaskStipend} onChange={setAddTaskStipend} />
                <Input label="Due date" type="date" value={addTaskDueDate} onChange={setAddTaskDueDate} />
                <FormButtons submitting={submitting} onCancel={() => setShowAddTask(false)} />
              </form>
            </Modal>
          )}

          {/* Interns list */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Interns ({fellows.length})
            </h2>
            {fellows.length === 0 ? (
              <p className="text-slate-400">No interns yet.</p>
            ) : (
              <div className="space-y-4">
                {fellows.map((f) => {
                  const trackData = tracks.find((t) => t.id === f.trackId);
                  const trackMilestones = trackData ? allMilestonesForTrack(trackData) : [];
                  return (
                    <div key={f.id} className="p-4 rounded-xl border border-slate-700/50 bg-slate-900/60">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">{f.user.name || f.user.email}</p>
                          <p className="text-slate-400 text-sm">{f.user.email}</p>
                          <p className="text-cyan-400 text-sm mt-1">
                            {f.track.name} • {f.xp} XP • {f.milestonesCompleted} milestones
                          </p>
                          {f.resumeUrl ? (
                            <a href={f.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline mt-2">
                              <FileText className="w-4 h-4" /> Resume
                            </a>
                          ) : (
                            <span className="text-slate-500 text-sm mt-2 block">No resume</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {f.status === 'pending_approval' && (
                            <button
                              type="button"
                              onClick={() => handleApproveFellow(f.id)}
                              className="px-3 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
                            >
                              Approve
                            </button>
                          )}
                          <span className={`px-2 py-1 text-xs rounded ${f.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>{f.status}</span>
                        </div>
                      </div>
                      {/* Submitted tasks for review */}
                      {f.tasks.filter((t) => t.status === 'submitted').length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <p className="text-xs text-amber-400 mb-2 font-medium">Tasks awaiting review:</p>
                          <div className="space-y-1.5">
                            {f.tasks.filter((t) => t.status === 'submitted').map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/20">
                                <span className="text-sm text-slate-300 truncate">{t.title}</span>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleReviewTask(t.id, 'approve')}
                                    disabled={submitting}
                                    className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const note = prompt('Feedback for intern (optional):');
                                      handleReviewTask(t.id, 'reject', note || undefined);
                                    }}
                                    disabled={submitting}
                                    className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" /> Reject
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Milestone unlock controls */}
                      {trackMilestones.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <p className="text-xs text-slate-400 mb-2">Milestone access:</p>
                          <div className="space-y-1.5">
                            {trackMilestones.map((m, idx) => {
                              const isUnlocked = idx === 0 || (f.unlockedMilestoneIds || []).includes(m.id);
                              return (
                                <div key={m.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-slate-800/50">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isUnlocked ? (
                                      <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : (
                                      <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    )}
                                    <span className={`text-sm truncate ${isUnlocked ? 'text-slate-300' : 'text-zinc-500'}`}>
                                      {m.title}
                                    </span>
                                    {idx === 0 && <span className="text-[10px] text-emerald-400/70">(always open)</span>}
                                  </div>
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUnlock(f.id, m.id, !isUnlocked)}
                                      className={`px-2 py-0.5 text-xs rounded shrink-0 ${
                                        isUnlocked
                                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                          : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                      }`}
                                    >
                                      {isUnlocked ? 'Lock' : 'Unlock'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-700/50 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
      />
    </div>
  );
}

function Select({ label, value, onChange, children, required }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white">
        {children}
      </select>
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white resize-none" />
    </div>
  );
}

function FormButtons({ submitting, onCancel }: { submitting: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-400 disabled:opacity-50">
        {submitting ? 'Adding...' : 'Add'}
      </button>
      <button type="button" onClick={onCancel} className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800">
        Cancel
      </button>
    </div>
  );
}
