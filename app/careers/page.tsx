'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SocialShareButtons from '../components/ui/SocialShareButtons';
import { toast } from 'sonner';

const JOBS = [
  {
    id: 'platform-development-engineer',
    title: 'Platform Development Engineer – Innovation Platform',
    role: 'Technical Intern / Startup Fellow',
    icon: '⚙️',
    pdfPath: '/careers/platform-development-engineer.pdf',
    borderColor: 'border-[#38bdf8]/50',
    summary: `Foundational full-stack engineering role building the core infrastructure that powers Open Idea's innovation platform. You'll develop the no-code editor, real-time preview engine, deployment pipeline, and workspace environment that enable users to go from idea to working prototype. Key deliverables: 95%+ preview success rate, ≥99% platform uptime, one-click Vercel/Netlify deployment, collaborative workspace with version control. Requires proficiency in JavaScript/TypeScript, React, Node.js, build tools (Vite/Webpack), and deployment platforms.`,
    highlights: [
      'Editor & Workspace: Intuitive editing interfaces, file management, component libraries, collaborative workspaces',
      'Preview & Build: Real-time render AI-generated code, handle esbuild/Vite/Webpack, hot module replacement',
      'Deployment: Automated workflows to Vercel/Netlify, zero manual intervention, ≥98% success rate',
      'Backend: APIs, database design, authentication, file storage, server-side logic',
    ],
    skills: ['JavaScript/TypeScript', 'React.js', 'Node.js', 'Vite/Webpack', 'Vercel/Netlify', 'PostgreSQL', 'Git'],
    applyNote: 'Send resume, GitHub profile, and a brief note to info@openidea.world',
    needsGithub: true,
  },
  {
    id: 'developer-relations',
    title: 'Developer Relations & Platform Operations Associate',
    role: 'Community & Operations Intern',
    icon: '🤝',
    pdfPath: '/careers/developer-relations.pdf',
    borderColor: 'border-[#0ff0fc]/50',
    summary: `Critical role bridging users and product—ensuring Open Idea is accessible, user-friendly, and community-driven. Design onboarding flows for 80%+ first-prototype success within 24 hours. Create comprehensive documentation, video tutorials, FAQs, and 12+ sample project templates. Provide first-line support via Discord/email (≤6hr response, ≤24hr resolution), foster community to 300+ members, and represent user needs to the product team.`,
    highlights: [
      'Documentation: Getting Started Guide, 30+ knowledge-base articles, video walkthroughs',
      'Sample Projects: 12+ templates (web apps, mobile prototypes, AI tools, dashboards)',
      'Support: ≤24hr resolution, ≥8/10 satisfaction, Discord/Slack community',
      'Developer Advocacy: Feedback loop, pain-point reports, feature prioritization',
    ],
    skills: ['Technical writing', 'Documentation', 'Discord/Slack', 'Notion/GitBook', 'User support'],
    applyNote: 'Send resume and a brief note to info@openidea.world',
    needsGithub: false,
  },
  {
    id: 'marketing-growth',
    title: 'Marketing & Growth Associate – Innovation Platform',
    role: 'Growth & Strategy Intern',
    icon: '📈',
    pdfPath: '/careers/marketing-growth-associate.pdf',
    borderColor: 'border-[#a78bfa]/50',
    summary: `High-impact role driving go-to-market strategy and user acquisition. Plan campaigns to onboard 500+ early adopters from universities, research institutions, and startup incubators. Produce 3+ weekly content pieces: tutorials, founder interviews, success stories, comparison content. Run multi-channel campaigns (LinkedIn, Twitter, Reddit, Product Hunt, Hacker News). Establish community, craft positioning for 4 key segments, and execute a top-10 Product Hunt launch.`,
    highlights: [
      'Beta Launch: 500+ early adopters, 100+ beta users with ≥30% activation',
      'Content: 40+ pieces—blogs, videos, case studies, email sequences',
      'Channels: LinkedIn, Twitter, Reddit, Product Hunt, university innovation clubs',
      'Analytics: Funnel metrics, A/B tests, CAC optimization, growth dashboard',
    ],
    skills: ['Content marketing', 'Growth hacking', 'SEO/Social', 'Google Analytics', 'Product Hunt'],
    applyNote: 'Send resume and a brief note to info@openidea.world',
    needsGithub: false,
  },
  {
    id: 'ai-ml-engineer',
    title: 'AI / LLM Systems Engineer – Innovation Intelligence',
    role: 'AI Research & Engineering Intern',
    icon: '🤖',
    pdfPath: '/careers/ai-ml-engineer.pdf',
    borderColor: 'border-[#0ff0fc]/50',
    summary: `Core AI infrastructure role designing the intelligence layer that turns user ideas into executable prototypes. Build prompt pipelines with 90%+ success rate, develop semantic search across research/code/datasets (≥85% precision), implement AI validation for security and intent alignment. Evaluate and fine-tune LLMs (GPT-4, Claude, Gemini, open-source). Optimize to ≤1.5s latency, build monitoring dashboards, and experiment with RAG, function calling, and agentic workflows.`,
    highlights: [
      'Prompt Engineering: Production templates for idea gen, code synthesis, project structuring',
      'Semantic Search: Vector DBs, embeddings, RAG, knowledge graph (≥85% precision)',
      'AI Validation: Automated testing for syntax, security, logical consistency',
      'Performance: ≤1.5s latency, ≤1 AI failure/week, cost optimization',
    ],
    skills: ['Python', 'LangChain', 'LLMs', 'RAG', 'Vector DBs', 'Prompt engineering', 'PyTorch'],
    applyNote: 'Send resume, GitHub profile, and a brief note to info@openidea.world',
    needsGithub: true,
  },
];

export default function CareersPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyJob, setApplyJob] = useState<typeof JOBS[0] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    linkedin: '',
    github: '',
    coverNote: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Scroll to job when landing with #job-id (e.g. from shared link)
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (hash && JOBS.some((j) => j.id === hash)) {
      setExpandedId(hash);
      const el = document.getElementById(`job-${hash}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleApplyClick = (job: typeof JOBS[0]) => {
    setApplyJob(job);
    setFormData({ name: '', email: '', linkedin: '', github: '', coverNote: '' });
    setResumeFile(null);
    setShowApplyModal(true);
  };

  const handleApplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!applyJob || !formData.email.trim()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('email', formData.email);
      fd.append('linkedin', formData.linkedin);
      fd.append('github', formData.github);
      fd.append('coverNote', formData.coverNote);
      fd.append('jobTitle', applyJob.title);
      if (resumeFile) fd.append('resume', resumeFile);

      const res = await fetch('/api/careers/apply', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Failed to submit. Please try again.');
        return;
      }

      toast.success('Application sent! We\'ll be in touch soon.');
      setShowApplyModal(false);
      setApplyJob(null);
      setFormData({ name: '', email: '', linkedin: '', github: '', coverNote: '' });
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
          {/* Globe background */}
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

          {/* Tech grid overlay */}
          <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-16"
            >
              <div className="text-center mb-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-[#38bdf8] via-[#0ff0fc] to-[#a78bfa] bg-clip-text mb-4">
                  Careers at Open Idea
                </h1>
                <p className="text-center text-lg sm:text-xl text-teal-100/80 max-w-2xl mx-auto">
                  Join us in building India&apos;s first AI-powered innovation platform. Internship and fellowship opportunities available.
                </p>
                <div className="flex justify-center mt-4">
                  <Link
                    href="/intern-fellowship"
                    className="inline-flex items-center gap-2 text-[#38bdf8] hover:text-[#0ff0fc] transition-colors text-sm font-medium"
                  >
                    Milestone-based Fellowship Program →
                  </Link>
                </div>
              </div>
              <div className="flex justify-center gap-6 text-sm text-teal-100/60">
                <span>Remote</span>
                <span>Internship / Fellowship</span>
              </div>
            </motion.div>

            {/* Jobs */}
            <div className="space-y-4">
              {JOBS.map((job, idx) => (
                <motion.div
                  key={job.id}
                  id={`job-${job.id}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4 }}
                  className={`group relative rounded-xl overflow-hidden transition-all duration-300 ${job.borderColor} border bg-zinc-900/40 backdrop-blur-sm hover:shadow-lg hover:shadow-[#38bdf8]/15`}
                >
                  <button
                    onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                    className="w-full px-6 py-5 flex items-start sm:items-center gap-4 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-3xl flex-shrink-0 drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]">{job.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-[#38bdf8] group-hover:text-[#0ff0fc] transition-colors">{job.title}</h2>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-[#38bdf8]/20 text-[#38bdf8] rounded">
                        {job.role}
                      </span>
                    </div>
                    <span className="text-teal-100/60 flex-shrink-0 text-sm">
                      {expandedId === job.id ? '−' : '+'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {expandedId === job.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-[#38bdf8]/10 overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-4 space-y-5">
                          <div>
                            <h3 className="text-sm font-semibold text-[#38bdf8] mb-2">Summary</h3>
                            <p className="text-sm text-teal-100/80 leading-relaxed">{job.summary}</p>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-[#38bdf8] mb-2">Key highlights</h3>
                            <ul className="space-y-2 text-sm text-teal-100/80">
                              {job.highlights.map((h, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-[#38bdf8]">•</span>
                                  {h}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h3 className="text-sm font-semibold text-[#38bdf8] mb-2">Skills</h3>
                            <div className="flex flex-wrap gap-2">
                              {job.skills.map((s) => (
                                <span
                                  key={s}
                                  className="px-3 py-1 text-xs bg-zinc-800/80 text-teal-100 rounded-full border border-[#38bdf8]/20"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <a
                              href={job.pdfPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-[#38bdf8] hover:text-[#0ff0fc] transition-colors"
                            >
                              Download job description
                            </a>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <span className="text-sm text-teal-100/70">Share this job</span>
                            <SocialShareButtons
                              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/careers#${job.id}`}
                              title={job.title}
                              text={`${job.title} – ${job.role} at Open Idea. Apply now!`}
                              size="md"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button
                              onClick={() => handleApplyClick(job)}
                              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#38bdf8] to-[#0ff0fc] text-gray-900 font-semibold rounded-lg hover:scale-[1.02] hover:shadow-lg hover:shadow-[#38bdf8]/25 transition-all text-sm"
                            >
                              Apply Now
                            </button>
                            <Link
                              href="/contact"
                              className="inline-flex items-center justify-center px-6 py-2.5 border border-[#38bdf8]/20 text-teal-100/80 font-medium rounded-lg hover:bg-[#38bdf8]/10 transition text-sm"
                            >
                              Contact Us
                            </Link>
                          </div>
                          <p className="text-xs text-teal-100/50 pt-1">{job.applyNote}</p>
                          {job.needsGithub && (
                            <p className="text-xs text-teal-100/50">Include your GitHub profile with your application.</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-16 pt-12 border-t border-[#38bdf8]/10 text-center"
            >
              <h3 className="text-sm font-semibold text-[#38bdf8] mb-4">Get in touch</h3>
              <p className="text-teal-100/70 text-sm mb-4">
                Questions? Visit our platform or get in touch.
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <a
                  href="https://openidea.world"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#38bdf8] hover:text-[#0ff0fc] hover:underline transition-colors"
                >
                  openidea.world
                </a>
                <a href="mailto:info@openidea.world" className="text-[#38bdf8] hover:text-[#0ff0fc] hover:underline transition-colors">
                  info@openidea.world
                </a>
              </div>
              <p className="mt-6 text-teal-100/40 text-sm">
                From idea to app—democratizing innovation.
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Apply Modal - Tech style */}
      <AnimatePresence>
        {showApplyModal && applyJob && (
          <motion.div
            key="apply-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative rounded-xl p-6 max-w-md w-full shadow-2xl border border-[#38bdf8]/30 bg-zinc-900/95 backdrop-blur-sm max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-[#38bdf8] mb-1">{applyJob.title}</h3>
            <p className="text-sm text-teal-100/70 mb-5">
              Submit your application. We&apos;ll send it directly to our team.
            </p>
            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-teal-100/80 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Your name"
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/80 border border-[#38bdf8]/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-100/80 mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@email.com"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/80 border border-[#38bdf8]/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-100/80 mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData((p) => ({ ...p, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/80 border border-[#38bdf8]/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-100/80 mb-2">
                  GitHub {applyJob.needsGithub && <span className="text-amber-400">(recommended)</span>}
                </label>
                <input
                  type="url"
                  value={formData.github}
                  onChange={(e) => setFormData((p) => ({ ...p, github: e.target.value }))}
                  placeholder="https://github.com/username"
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/80 border border-[#38bdf8]/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-100/80 mb-2">Resume <span className="text-red-400">*</span></label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/80 border border-[#38bdf8]/20 text-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-[#38bdf8]/20 file:text-[#38bdf8] file:cursor-pointer focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30"
                />
                <p className="mt-1 text-xs text-teal-100/50">PDF or DOC, max 5MB</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-teal-100/80 mb-2">Cover note / Why you?</label>
                <textarea
                  value={formData.coverNote}
                  onChange={(e) => setFormData((p) => ({ ...p, coverNote: e.target.value }))}
                  placeholder="Brief note about your experience and interest in Open Idea..."
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg bg-zinc-800/80 border border-[#38bdf8]/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 resize-none"
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
                  onClick={() => {
                    setShowApplyModal(false);
                    setApplyJob(null);
                  }}
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
