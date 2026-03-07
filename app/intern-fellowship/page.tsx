'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FellowshipRoadmapGraph from '../components/fellowship/FellowshipRoadmapGraph';
import { useAuthCheck } from '../hooks/useAuthCheck';
import { toast } from 'sonner';

const CONTRIBUTION_AREAS = [
  {
    id: 'platform-development',
    title: 'Platform Development',
    icon: '⚙️',
    skills: ['JavaScript/TypeScript', 'React', 'Node.js', 'Vite/Webpack'],
    stipendPerMilestone: '₹5,000–15,000',
    description: 'Build the no-code editor, preview engine, deployment pipeline, and workspace.',
  },
  {
    id: 'ai-ml',
    title: 'AI / LLM Systems',
    icon: '🤖',
    skills: ['Python', 'LangChain', 'LLMs', 'RAG', 'Prompt engineering'],
    stipendPerMilestone: '₹8,000–20,000',
    description: 'Design prompt pipelines, semantic search, AI validation, and agentic workflows.',
  },
  {
    id: 'developer-relations',
    title: 'Developer Relations',
    icon: '🤝',
    skills: ['Technical writing', 'Documentation', 'Discord/Slack', 'User support'],
    stipendPerMilestone: '₹4,000–12,000',
    description: 'Build onboarding flows, docs, tutorials, FAQs, and community support.',
  },
  {
    id: 'marketing-growth',
    title: 'Marketing & Growth',
    icon: '📈',
    skills: ['Content marketing', 'Growth hacking', 'SEO', 'Product Hunt'],
    stipendPerMilestone: '₹4,000–12,000',
    description: 'Drive campaigns, content, and multi-channel acquisition.',
  },
];

const MILESTONE_EXAMPLES = [
  { phase: 'Phase 1: Onboarding', tasks: ['Setup', 'First PR', 'Review cycle'], stipend: '₹2,000' },
  { phase: 'Phase 2: Feature work', tasks: ['Feature 1', 'Feature 2', 'Tests'], stipend: '₹8,000' },
  { phase: 'Phase 3: Ownership', tasks: ['Module ownership', 'Docs', 'Mentorship'], stipend: '₹15,000' },
  { phase: 'Phase 4: Impact', tasks: ['Launch impact', 'Community growth', 'Portfolio'], stipend: '₹25,000' },
];

export default function InternFellowshipPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthCheck();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const handleEnroll = async (trackSlug?: string) => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=${encodeURIComponent('/intern-fellowship')}`);
      toast.info('Sign in to enroll in the fellowship.');
      return;
    }
    setEnrolling(true);
    try {
      const res = await fetch('/api/intern-fellowship/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track: trackSlug || 'platform-development' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Failed to enroll. Please try again.');
        return;
      }
      toast.success(data.message || 'Enrollment request sent! Admin will review and get back to you.');
      router.push('/intern-fellowship/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handlePositionClick = (trackId: string) => {
    if (!isAuthenticated) {
      router.push(`/auth?redirect=${encodeURIComponent('/intern-fellowship/dashboard')}`);
      toast.info('Sign in to join the fellowship and upload your resume.');
      return;
    }
    router.push('/intern-fellowship/dashboard');
  };
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    linkedin: '',
    github: '',
    coverNote: '',
    preferredArea: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleApplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.email.trim()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('email', formData.email);
      fd.append('linkedin', formData.linkedin);
      fd.append('github', formData.github);
      fd.append('coverNote', formData.coverNote);
      fd.append('jobTitle', 'Intern Fellowship Program');
      fd.append('preferredArea', formData.preferredArea);
      if (resumeFile) fd.append('resume', resumeFile);

      const res = await fetch('/api/careers/apply', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Failed to submit. Please try again.');
        return;
      }

      toast.success('Application sent! We\'ll match you with your roadmap and be in touch soon.');
      setShowApplyModal(false);
      setFormData({ name: '', email: '', linkedin: '', github: '', coverNote: '', preferredArea: '' });
      setResumeFile(null);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-screen">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt="Digital Globe Background"
              fill
              className="object-cover object-right opacity-30"
              quality={100}
              priority
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-[#38bdf8]/20 to-transparent opacity-80 blur-3xl" />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-16"
            >
              <div className="text-center mb-8">
                <span className="inline-block px-3 py-1 text-xs font-medium bg-white/10 text-[#38bdf8] rounded-full border border-white/20 backdrop-blur-sm mb-4">
                  Intern Fellowship Program
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-[#38bdf8] via-[#0ff0fc] to-[#a78bfa] bg-clip-text mb-4">
                  Milestone-Based Fellowship
                </h1>
                <p className="text-center text-lg sm:text-xl text-teal-100/80 max-w-2xl mx-auto">
                  Join us as an engineer. We match your resume + skills to our roadmap, create a personalized milestone path, and pay you per milestone as you build your gamified portfolio.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-teal-100/60">
                <span>Remote</span>
                <span>Milestone-based stipend</span>
                <span>Graph-based contribution roadmap</span>
              </div>
            </motion.div>

            {/* How it works */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-20"
            >
              <h2 className="text-2xl font-bold text-[#38bdf8] mb-6">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg hover:border-[#38bdf8]/30 hover:bg-white/[0.07] transition-all">
                  <span className="text-3xl mb-3 block">📄</span>
                  <h3 className="font-semibold text-[#38bdf8] mb-2">1. Resume</h3>
                  <p className="text-sm text-teal-100/80">Upload your resume. We analyze skills and experience to map you to the right contribution areas.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg hover:border-[#38bdf8]/30 hover:bg-white/[0.07] transition-all">
                  <span className="text-3xl mb-3 block">🗺️</span>
                  <h3 className="font-semibold text-[#38bdf8] mb-2">2. Roadmap graph</h3>
                  <p className="text-sm text-teal-100/80">Our roadmap is a graph—nodes are areas you can help in. Pick your path, unlock milestones.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg hover:border-[#38bdf8]/30 hover:bg-white/[0.07] transition-all">
                  <span className="text-3xl mb-3 block">💰</span>
                  <h3 className="font-semibold text-[#38bdf8] mb-2">3. Stipend per milestone</h3>
                  <p className="text-sm text-teal-100/80">Complete a milestone → earn stipend. Build a gamified portfolio of achievements as you go.</p>
                </div>
              </div>
            </motion.section>

            {/* Roadmap graph */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-20"
            >
              <h2 className="text-2xl font-bold text-[#38bdf8] mb-6">Contribution graph</h2>
              <p className="text-teal-100/80 mb-6 max-w-2xl">
                Choose where you want to contribute. Each node is a product area. Click to see milestones and stipend ranges.
              </p>
              <FellowshipRoadmapGraph areas={CONTRIBUTION_AREAS} />
            </motion.section>

            {/* All positions - click to join (login required) */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-20"
            >
              <h2 className="text-2xl font-bold text-[#38bdf8] mb-6">All positions available</h2>
              <p className="text-teal-100/80 mb-6 max-w-2xl">
                Click a position to join. Sign in required. After joining, upload your resume at your dashboard.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONTRIBUTION_AREAS.map((area) => (
                  <div
                    key={area.id}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-lg hover:border-[#38bdf8]/40 hover:bg-white/[0.07] hover:shadow-xl hover:shadow-[#38bdf8]/5 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{area.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#38bdf8]">{area.title}</h3>
                        <p className="text-sm text-teal-100/80 mt-1">{area.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {area.skills.slice(0, 3).map((s) => (
                            <span key={s} className="px-2 py-0.5 text-xs bg-white/10 text-teal-100 rounded-full border border-white/20 backdrop-blur-sm">
                              {s}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-[#38bdf8] mt-2">Stipend: {area.stipendPerMilestone}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => handleEnroll(area.id)}
                            disabled={enrolling || isLoading}
                            className="px-3 py-1.5 text-xs font-medium bg-[#38bdf8]/20 text-[#38bdf8] rounded-lg hover:bg-[#38bdf8]/30 disabled:opacity-50"
                          >
                            {enrolling ? 'Sending...' : 'Enroll'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePositionClick(area.id)}
                            className="px-3 py-1.5 text-xs text-teal-100/70 hover:text-teal-100"
                          >
                            {isAuthenticated ? 'Go to dashboard →' : 'Sign in to join →'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Milestone example */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mb-20"
            >
              <h2 className="text-2xl font-bold text-[#38bdf8] mb-6">Milestone-based stipend</h2>
              <p className="text-teal-100/80 mb-6 max-w-2xl">
                Each milestone unlocks a stipend. Progress through phases to build your portfolio and earn more.
              </p>
              <div className="flex flex-wrap gap-4">
                {MILESTONE_EXAMPLES.map((m) => (
                  <div
                    key={m.phase}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 min-w-[200px] shadow-lg hover:border-[#38bdf8]/30 hover:bg-white/[0.07] transition-all"
                  >
                    <h4 className="font-semibold text-[#38bdf8] text-sm mb-2">{m.phase}</h4>
                    <ul className="text-xs text-teal-100/80 space-y-1 mb-3">
                      {m.tasks.map((t) => (
                        <li key={t}>• {t}</li>
                      ))}
                    </ul>
                    <p className="text-sm font-semibold text-[#0ff0fc]">{m.stipend}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* CTA */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-center pt-12 border-t border-white/10"
            >
              <h3 className="text-xl font-semibold text-[#38bdf8] mb-4">Ready to apply?</h3>
              <p className="text-teal-100/70 text-sm mb-6 max-w-xl mx-auto">
                Upload your resume and a brief note. We&apos;ll create your personalized milestone roadmap and get back to you.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => handleEnroll()}
                  disabled={enrolling || isLoading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#38bdf8] to-[#0ff0fc] text-gray-900 font-semibold rounded-lg hover:scale-[1.02] hover:shadow-lg hover:shadow-[#38bdf8]/25 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enrolling ? 'Sending...' : 'Enroll in Fellowship'}
                </button>
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/20 text-[#38bdf8] font-medium rounded-lg hover:bg-white/10 hover:border-[#38bdf8]/40 transition text-sm backdrop-blur-sm"
                >
                  Apply to Fellowship
                </button>
                <Link
                  href="/careers"
                  className="inline-flex items-center justify-center px-6 py-3 border border-white/20 text-teal-100/80 font-medium rounded-lg hover:bg-white/10 hover:border-[#38bdf8]/30 transition text-sm backdrop-blur-sm"
                >
                  View all roles
                </Link>
              </div>
            </motion.section>
          </div>
        </section>
      </main>
      <Footer />

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <motion.div
            key="apply-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative rounded-2xl p-6 max-w-md w-full shadow-2xl border border-white/20 bg-zinc-900/90 backdrop-blur-xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold text-[#38bdf8] mb-1">Intern Fellowship Program</h3>
              <p className="text-sm text-teal-100/70 mb-5">
                Submit your resume. We&apos;ll match you to our roadmap and create your milestone path.
              </p>
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="you@email.com"
                    required
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">LinkedIn</label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData((p) => ({ ...p, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">GitHub</label>
                  <input
                    type="url"
                    value={formData.github}
                    onChange={(e) => setFormData((p) => ({ ...p, github: e.target.value }))}
                    placeholder="https://github.com/username"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">Preferred area</label>
                  <select
                    value={formData.preferredArea}
                    onChange={(e) => setFormData((p) => ({ ...p, preferredArea: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 backdrop-blur-sm"
                  >
                    <option value="">Select area</option>
                    {CONTRIBUTION_AREAS.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">Resume <span className="text-red-400">*</span></label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[#38bdf8]/20 file:text-[#38bdf8] file:cursor-pointer focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 backdrop-blur-sm"
                  />
                  <p className="mt-1 text-xs text-teal-100/50">PDF or DOC, max 5MB</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">Cover note / Why you?</label>
                  <textarea
                    value={formData.coverNote}
                    onChange={(e) => setFormData((p) => ({ ...p, coverNote: e.target.value }))}
                    placeholder="Brief note about your experience and interest in the fellowship..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 resize-none backdrop-blur-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!formData.email.trim() || !resumeFile || submitting}
                    className="flex-1 px-6 py-2.5 bg-gradient-to-r from-[#38bdf8] to-[#0ff0fc] text-gray-900 font-semibold text-sm rounded-lg hover:scale-[1.02] hover:shadow-lg hover:shadow-[#38bdf8]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {submitting ? 'Sending...' : 'Apply Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    disabled={submitting}
                    className="px-6 py-2.5 border border-[#38bdf8]/20 text-teal-100/80 text-sm font-medium rounded-lg hover:bg-[#38bdf8]/10 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
