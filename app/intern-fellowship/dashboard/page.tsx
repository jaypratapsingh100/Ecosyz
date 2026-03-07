'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuthCheck } from '../../hooks/useAuthCheck';
import { toast } from 'sonner';
import {
  FileUp,
  Trophy,
  Target,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  Activity,
  Briefcase,
  Upload,
  UserCheck,
  Play,
  Send,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:     { label: 'Pending',     bg: 'bg-[#38bdf8]/30', text: 'text-[#38bdf8]' },
  in_progress: { label: 'In Progress', bg: 'bg-amber-400/30',  text: 'text-amber-300' },
  submitted:   { label: 'Submitted',   bg: 'bg-purple-400/30', text: 'text-purple-300' },
  completed:   { label: 'Completed',   bg: 'bg-emerald-400/30', text: 'text-emerald-300' },
  approved:    { label: 'Approved',    bg: 'bg-emerald-400/30', text: 'text-emerald-300' },
};

function TaskItem({ task, onUpdate, onProgress }: {
  task: { id: string; title: string; description: string | null; status: string; progress: number; stipend: number | null; dueDate: string | null };
  onUpdate: (taskId: string, status: string, note?: string) => void;
  onProgress: (taskId: string, progress: number) => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [localProgress, setLocalProgress] = useState(task.progress || 0);
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;

  useEffect(() => {
    setLocalProgress(task.progress || 0);
  }, [task.progress]);
  const isDone = task.status === 'completed' || task.status === 'approved';
  const isSubmitted = task.status === 'submitted';

  const handleAction = async (status: string) => {
    setUpdating(true);
    await onUpdate(task.id, status, note.trim() || undefined);
    setNote('');
    setShowNote(false);
    setUpdating(false);
  };

  return (
    <div className="p-4 rounded-xl border border-zinc-600/50 bg-zinc-800/90 backdrop-blur-md shadow-sm">
      <div className="flex items-start gap-3">
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        ) : isSubmitted ? (
          <Send className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        ) : task.status === 'in_progress' ? (
          <Play className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <Circle className="w-4 h-4 text-[#38bdf8]/50 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-100 text-sm">{task.title}</p>
          {task.description && (
            <div className="text-xs text-zinc-300 mt-1 space-y-1">
              {task.description.split('\n').filter(Boolean).map((line, i) => (
                <p key={i} className={line.startsWith('[') ? 'text-teal-100/50 border-l-2 border-[#38bdf8]/20 pl-2' : ''}>
                  {line}
                </p>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
            {task.dueDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {task.stipend != null && <span className="text-[#0ff0fc]">₹{task.stipend}</span>}
            <span className={`px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {(task.status === 'in_progress' || task.status === 'submitted' || isDone) && (
        <div className="mt-2 ml-7">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-zinc-700/80 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isDone ? 'bg-emerald-400' : isSubmitted ? 'bg-purple-400' : 'bg-amber-400'
                }`}
                style={{ width: `${isDone ? 100 : localProgress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400 w-10 text-right font-medium">{isDone ? 100 : localProgress}%</span>
          </div>
          {task.status === 'in_progress' && (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={localProgress}
                onChange={(e) => setLocalProgress(Number(e.target.value))}
                className="flex-1 h-1 accent-amber-400 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => { onProgress(task.id, localProgress); toast.success(`Progress saved: ${localProgress}%`); }}
                disabled={localProgress === (task.progress || 0)}
                className="px-3 py-1.5 text-xs font-medium bg-amber-500/40 text-amber-200 rounded-lg hover:bg-amber-500/50 transition-colors disabled:opacity-30 disabled:cursor-default shrink-0"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status actions */}
      {!isDone && (
        <div className="mt-3 ml-7">
          {!isSubmitted && (
            <div className="flex flex-wrap gap-2">
              {task.status === 'pending' && (
                <button
                  onClick={() => handleAction('in_progress')}
                  disabled={updating}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500/40 text-amber-200 rounded-lg hover:bg-amber-500/50 transition-colors disabled:opacity-50"
                >
                  <Play className="w-3 h-3" /> Start
                </button>
              )}
              {(task.status === 'pending' || task.status === 'in_progress') && (
                <button
                  onClick={() => setShowNote(!showNote)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-500/40 text-purple-200 rounded-lg hover:bg-purple-500/50 transition-colors"
                >
                  <Send className="w-3 h-3" /> Submit for review
                </button>
              )}
              {task.status === 'in_progress' && !showNote && (
                <button
                  onClick={() => setShowNote(!showNote)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[#38bdf8]/30 text-[#38bdf8] rounded-lg hover:bg-[#38bdf8]/40 transition-colors"
                >
                  Add update
                </button>
              )}
            </div>
          )}

          {/* Note / update input */}
          {showNote && (
            <div className="mt-2 space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note or update (e.g. link to work, progress details)..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-800/80 border border-zinc-600/50 text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:border-[#38bdf8]/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('submitted')}
                  disabled={updating}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-500/40 text-purple-200 rounded-lg hover:bg-purple-500/50 transition-colors disabled:opacity-50 font-medium"
                >
                  <Send className="w-3 h-3" /> {updating ? 'Submitting...' : 'Submit for review'}
                </button>
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => { onUpdate(task.id, 'in_progress', note.trim() || undefined); setNote(''); setShowNote(false); }}
                    disabled={!note.trim() || updating}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#38bdf8]/30 text-[#38bdf8] rounded-lg hover:bg-[#38bdf8]/40 transition-colors disabled:opacity-50 font-medium"
                  >
                    Save update only
                  </button>
                )}
                <button
                  onClick={() => { setShowNote(false); setNote(''); }}
                  className="px-3 py-1.5 text-xs text-teal-100/50 hover:text-teal-100/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isSubmitted && (
            <p className="text-xs text-purple-400/80 mt-1 italic">Submitted — waiting for admin review</p>
          )}
        </div>
      )}
    </div>
  );
}

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
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
  isLocked: boolean;
  isCompleted: boolean;
};

type SubTrack = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

type Fellow = {
  id: string;
  track: {
    id: string;
    slug: string;
    name: string;
    stipendRange: string | null;
    subTracks: SubTrack[];
  };
  resumeUrl: string | null;
  status: string;
  xp: number;
  milestonesCompleted: number;
  milestones?: Milestone[];
  tasks: Task[];
};

export default function InternDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthCheck();
  const [fellow, setFellow] = useState<Fellow | null>(null);
  const [loadingFellow, setLoadingFellow] = useState(true);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [selectedTrack, setSelectedTrack] = useState('');
  const [activeSubTrack, setActiveSubTrack] = useState<string | null>(null);
  const [collapsedMilestoneIds, setCollapsedMilestoneIds] = useState<Set<string>>(new Set());

  const toggleMilestone = (id: string) => {
    setCollapsedMilestoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/auth?redirect=${encodeURIComponent('/intern-fellowship/dashboard')}`);
      return;
    }
    if (isAuthenticated) {
      fetchFellow();
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchFellow = async () => {
    setLoadingFellow(true);
    try {
      const res = await fetch('/api/intern-fellowship/me');
      const data = await res.json();
      if (res.ok) setFellow(data.fellow);
    } catch {
      setFellow(null);
    } finally {
      setLoadingFellow(false);
    }
  };

  const handleJoinTrack = async (trackSlug: string) => {
    if (selectedTrack) return;
    setSelectedTrack(trackSlug);
    try {
      const res = await fetch('/api/intern-fellowship/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track: trackSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      await fetchFellow();
      toast.success('Joined track! Upload your resume to continue.');
    } catch (e) {
      setSelectedTrack('');
      toast.error(e instanceof Error ? e.message : 'Failed to join');
    }
  };

  const handleResumeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile || !fellow) return;
    setUploadingResume(true);
    try {
      const fd = new FormData();
      fd.append('resume', resumeFile);
      fd.append('track', fellow.track.slug);
      const res = await fetch('/api/intern-fellowship/resume', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFellow((p) => (p ? { ...p, resumeUrl: data.fellow.resumeUrl } : null));
      setResumeFile(null);
      toast.success('Resume uploaded!');
      fetchFellow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, status: string, note?: string) => {
    try {
      const res = await fetch('/api/intern-fellowship/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task');
      toast.success(
        status === 'submitted' ? 'Task submitted for review!' :
        note ? 'Update saved!' : 'Task updated!'
      );
      await fetchFellow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update task');
    }
  };

  const handleProgressUpdate = async (taskId: string, progress: number) => {
    try {
      const res = await fetch('/api/intern-fellowship/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: 'in_progress', progress }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      await fetchFellow();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update progress');
    }
  };

  const rawMilestones = fellow?.milestones?.filter((m) => {
    if (!activeSubTrack) return true;
    return m.subTrack?.id === activeSubTrack;
  }) ?? [];
  const filteredMilestones = rawMilestones.slice().sort((a, b) => {
    // Unlocked priority milestones first
    const aPriority = a.highlighted && !a.isLocked ? 1 : 0;
    const bPriority = b.highlighted && !b.isLocked ? 1 : 0;
    if (bPriority !== aPriority) return bPriority - aPriority;
    return 0;
  });

  if (isLoading || (!isAuthenticated && !fellow)) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#38bdf8]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt=""
              fill
              className="object-cover object-right opacity-30"
            />
          </div>
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <div className="mb-8">
              <Link
                href="/intern-fellowship"
                className="text-sm text-[#38bdf8] hover:text-[#0ff0fc] flex items-center gap-1"
              >
                ← Back to Fellowship
              </Link>
            </div>

            {loadingFellow ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-[#38bdf8]" />
              </div>
            ) : !fellow ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8"
              >
                <h2 className="text-xl font-bold text-[#38bdf8] mb-4">Choose your track</h2>
                <p className="text-teal-100/80 text-sm mb-2">
                  Select <strong>one track only</strong>. You cannot change your track after joining.
                </p>
                <p className="text-teal-100/60 text-sm mb-6">
                  You will see only this track, its sub-tracks, milestones, and tasks. Upload your resume after joining.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { slug: 'platform-development', name: 'Platform Development', icon: '⚙️' },
                    { slug: 'ai-ml', name: 'AI / LLM Systems', icon: '🤖' },
                    { slug: 'developer-relations', name: 'Developer Relations', icon: '🤝' },
                    { slug: 'marketing-growth', name: 'Marketing & Growth', icon: '📈' },
                  ].map((t) => (
                    <button
                      key={t.slug}
                      onClick={() => handleJoinTrack(t.slug)}
                      disabled={!!selectedTrack}
                      className="flex items-center gap-3 p-4 rounded-xl border border-white/20 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-colors text-left disabled:opacity-70"
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <span className="font-semibold text-[#38bdf8]">{t.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <>
                {fellow.status === 'pending_approval' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 mb-6"
                  >
                    <p className="text-amber-400 font-medium">Enrollment pending approval</p>
                    <p className="text-teal-100/70 text-sm mt-1">We&apos;ve notified the admin team. You&apos;ll get access to milestones once approved.</p>
                  </motion.div>
                )}
                {/* Your selected track */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 mb-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <Briefcase className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-emerald-400/80 uppercase tracking-wider font-medium">Your selected track</p>
                      <p className="text-lg font-bold text-emerald-300">{fellow.track.name}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                      {fellow.status}
                    </span>
                  </div>
                  <p className="text-teal-100/60 text-sm mt-2 ml-12">
                    Stipend range: {fellow.track.stipendRange || '—'}
                  </p>
                </motion.div>

                {/* Stats row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
                >
                  <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center">
                    <Trophy className="w-5 h-5 text-[#0ff0fc] mx-auto mb-1" />
                    <p className="text-xl font-bold text-[#0ff0fc]">{fellow.xp}</p>
                    <p className="text-xs text-teal-100/60">XP earned</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center">
                    <Target className="w-5 h-5 text-[#38bdf8] mx-auto mb-1" />
                    <p className="text-xl font-bold text-[#38bdf8]">{fellow.milestonesCompleted}</p>
                    <p className="text-xs text-teal-100/60">Milestones</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-emerald-400">
                      {(() => {
                        const all = [...(fellow.milestones?.flatMap(m => m.tasks) ?? []), ...(fellow.tasks ?? [])];
                        return all.filter(t => t.status === 'completed' || t.status === 'approved').length;
                      })()}
                    </p>
                    <p className="text-xs text-teal-100/60">Tasks done</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 text-center">
                    <FileUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-amber-400">{fellow.resumeUrl ? 'Yes' : 'No'}</p>
                    <p className="text-xs text-teal-100/60">Resume</p>
                  </div>
                </motion.div>

                {/* Resume upload */}
                {!fellow.resumeUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl p-6 mb-6"
                  >
                    <h3 className="font-semibold text-amber-400 flex items-center gap-2 mb-3">
                      <FileUp className="w-5 h-5" />
                      Upload your resume
                    </h3>
                    <p className="text-teal-100/80 text-sm mb-4">
                      Upload your resume for <strong>{fellow.track.name}</strong> so we can match you with the right milestones.
                    </p>
                    <form onSubmit={handleResumeUpload} className="flex flex-wrap gap-3">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        className="text-sm text-teal-100 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#38bdf8]/20 file:text-[#38bdf8] file:cursor-pointer"
                      />
                      <button
                        type="submit"
                        disabled={!resumeFile || uploadingResume}
                        className="px-4 py-2 bg-[#38bdf8] text-gray-900 font-semibold rounded-lg hover:bg-[#0ff0fc] transition disabled:opacity-50"
                      >
                        {uploadingResume ? 'Uploading...' : 'Upload'}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* Sub-track tabs */}
                {fellow.track.subTracks && fellow.track.subTracks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-6"
                  >
                    <h3 className="font-semibold text-[#38bdf8] mb-3">Sub-tracks</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveSubTrack(null)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          !activeSubTrack
                            ? 'bg-[#38bdf8] text-gray-900'
                            : 'border border-white/20 bg-white/10 backdrop-blur-sm text-[#38bdf8] hover:bg-white/15'
                        }`}
                      >
                        All
                      </button>
                      {fellow.track.subTracks.map((st) => (
                        <button
                          key={st.id}
                          onClick={() => setActiveSubTrack(st.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeSubTrack === st.id
                              ? 'bg-[#38bdf8] text-gray-900'
                              : 'border border-white/20 bg-white/10 backdrop-blur-sm text-[#38bdf8] hover:bg-white/15'
                          }`}
                        >
                          {st.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Milestones & Tasks */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl border border-zinc-600/40 bg-zinc-800/60 backdrop-blur-xl p-6 mb-6"
                >
                  <h3 className="font-semibold text-[#38bdf8] mb-4">Milestones & tasks</h3>
                  <p className="text-teal-100/70 text-sm mb-4">
                    <strong>Priority</strong> tasks are always unlocked — start anytime. Other milestones unlock when you complete the previous one. Use <strong>Start</strong> to begin a task, then <strong>Submit for review</strong> when done.
                  </p>
                  {filteredMilestones.some((m) => m.highlighted && !m.isLocked) && (
                    <div className="mb-4 px-4 py-2.5 rounded-lg border border-[#38bdf8]/30 bg-zinc-800/80 text-zinc-200 text-sm">
                      <span className="font-semibold">Priority tasks</span> — Jump in without approval. These are highlighted below.
                    </div>
                  )}
                  {filteredMilestones.length > 0 ? (
                    <div className="space-y-4">
                      {filteredMilestones.map((m) => {
                        const isCollapsed = collapsedMilestoneIds.has(m.id);
                        return (
                        <div
                          key={m.id}
                          className={`rounded-xl border overflow-hidden ${
                            m.isLocked
                              ? 'border-zinc-600/40 bg-zinc-800/50 opacity-80'
                              : m.highlighted
                                ? 'border-[#38bdf8]/40 bg-zinc-800/80 backdrop-blur-md shadow-lg'
                                : 'border-zinc-600/50 bg-zinc-800/70 backdrop-blur-sm'
                          }`}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleMilestone(m.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMilestone(m.id); }}
                            className="flex items-center gap-2 p-4 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-teal-100/60 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-teal-100/60 shrink-0" />
                            )}
                            {m.isLocked ? (
                              <Lock className="w-4 h-4 text-zinc-500" />
                            ) : m.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Target className={`w-4 h-4 ${m.highlighted ? 'text-[#38bdf8]' : 'text-amber-400'}`} />
                            )}
                            {m.highlighted && !m.isLocked && (
                              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-[#38bdf8]/30 text-[#38bdf8] border border-[#38bdf8]/40 rounded">Priority</span>
                            )}
                            <p
                              className={`font-medium flex-1 min-w-0 ${
                                m.isLocked ? 'text-zinc-500' : m.isCompleted ? 'text-emerald-400' : m.highlighted ? 'text-[#38bdf8]' : 'text-amber-400'
                              }`}
                            >
                              {m.title}
                            </p>
                            {m.subTrack && (
                              <span className="text-xs text-teal-100/60 shrink-0">({m.subTrack.name})</span>
                            )}
                            {m.isLocked && (
                              <span className="text-xs text-zinc-500 shrink-0">
                                Locked — complete previous milestone
                              </span>
                            )}
                          </div>
                          {!isCollapsed && (
                            <div className="px-4 pb-4 pt-0">
                              <div className="flex gap-4 text-xs text-zinc-400 mb-3 ml-6">
                                {m.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Due {new Date(m.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {m.stipend != null && (
                                  <span className="text-[#0ff0fc]">₹{m.stipend} stipend</span>
                                )}
                                {m.tasks?.length > 0 && (
                                  <span>{m.tasks.length} task{m.tasks.length !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                              {m.isLocked ? (
                                <p className="text-zinc-500 text-sm ml-6 italic">
                                  Locked — complete the previous milestone to see tasks
                                </p>
                              ) : m.tasks?.length > 0 ? (
                                <div className="space-y-3 ml-6">
                                  {m.tasks.map((task) => (
                                    <TaskItem key={task.id} task={task} onUpdate={handleTaskUpdate} onProgress={handleProgressUpdate} />
                                  ))}
                                </div>
                              ) : (
                                <p className="text-zinc-500 text-sm ml-6">No tasks in this milestone</p>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {!activeSubTrack && fellow.tasks && fellow.tasks.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-teal-100/80 mb-2">Other tasks (no milestone)</h4>
                      <div className="space-y-2">
                        {fellow.tasks.map((task) => (
                          <TaskItem key={task.id} task={task} onUpdate={handleTaskUpdate} onProgress={handleProgressUpdate} />
                        ))}
                      </div>
                    </div>
                  )}
                  {filteredMilestones.length === 0 &&
                    (!fellow.tasks || fellow.tasks.length === 0) && (
                      <p className="text-teal-100/60 text-sm">
                        {activeSubTrack
                          ? 'No milestones in this sub-track yet.'
                          : 'No milestones or tasks yet. Your admin will add them. Check back soon!'}
                      </p>
                    )}
                </motion.div>

                {/* Activity Log */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
                >
                  <h3 className="font-semibold text-[#38bdf8] mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Activity log
                  </h3>
                  <div className="space-y-3">
                    {/* Track joined */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1 rounded-full bg-emerald-500/20">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm text-teal-100">Joined <strong className="text-emerald-400">{fellow.track.name}</strong> track</p>
                        <p className="text-xs text-teal-100/50">Fellowship enrolled</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0 mt-0.5" />
                    </div>

                    {/* Resume uploaded */}
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1 rounded-full ${fellow.resumeUrl ? 'bg-emerald-500/20' : 'bg-zinc-700/50'}`}>
                        <Upload className="w-3.5 h-3.5" style={{ color: fellow.resumeUrl ? '#34d399' : '#71717a' }} />
                      </div>
                      <div>
                        <p className={`text-sm ${fellow.resumeUrl ? 'text-teal-100' : 'text-zinc-500'}`}>
                          Resume upload
                        </p>
                        <p className="text-xs text-teal-100/50">
                          {fellow.resumeUrl ? 'Uploaded' : 'Pending — upload above'}
                        </p>
                      </div>
                      {fellow.resumeUrl ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-600 ml-auto shrink-0 mt-0.5" />
                      )}
                    </div>

                    {/* Completed milestones */}
                    {fellow.milestones?.filter(m => m.isCompleted).map((m) => (
                      <div key={`ms-${m.id}`} className={`flex items-start gap-3 ${m.highlighted ? 'rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm p-2 -mx-2' : ''}`}>
                        <div className="mt-0.5 p-1 rounded-full bg-emerald-500/20">
                          <Target className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm text-teal-100">Completed milestone: <strong className="text-emerald-400">{m.title}</strong>{m.highlighted && <span className="ml-1.5 px-1 py-0.5 text-[10px] uppercase font-bold bg-white/20 backdrop-blur-sm text-teal-100 border border-white/20 rounded">Priority</span>}</p>
                          {m.stipend != null && <p className="text-xs text-[#0ff0fc]">₹{m.stipend} stipend earned</p>}
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0 mt-0.5" />
                      </div>
                    ))}

                    {/* All task activity */}
                    {(() => {
                      const allTasks = [
                        ...(fellow.milestones?.flatMap(m => m.tasks) ?? []),
                        ...(fellow.tasks ?? []),
                      ].filter(t => t.status !== 'pending');

                      const statusStyles: Record<string, { icon: typeof CheckCircle2; bg: string; color: string; label: string }> = {
                        in_progress: { icon: Play, bg: 'bg-amber-500/20', color: 'text-amber-400', label: 'Started' },
                        submitted:   { icon: Send, bg: 'bg-purple-500/20', color: 'text-purple-400', label: 'Submitted for review' },
                        completed:   { icon: CheckCircle2, bg: 'bg-emerald-500/20', color: 'text-emerald-400', label: 'Completed' },
                        approved:    { icon: CheckCircle2, bg: 'bg-emerald-500/20', color: 'text-emerald-400', label: 'Approved' },
                      };

                      if (allTasks.length === 0) return (
                        <p className="text-teal-100/50 text-sm ml-8">
                          No task activity yet. Start working on your milestones!
                        </p>
                      );

                      return allTasks.map((t) => {
                        const s = statusStyles[t.status] || statusStyles.in_progress;
                        const Icon = s.icon;
                        return (
                          <div key={`task-${t.id}`} className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1 rounded-full ${s.bg}`}>
                              <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-teal-100">
                                <span className={s.color}>{s.label}:</span>{' '}
                                <strong className="text-teal-100">{t.title}</strong>
                              </p>
                              {t.stipend != null && <p className="text-xs text-[#0ff0fc]">₹{t.stipend}</p>}
                            </div>
                            <Icon className={`w-4 h-4 ${s.color} ml-auto shrink-0 mt-0.5`} />
                          </div>
                        );
                      });
                    })()}
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
