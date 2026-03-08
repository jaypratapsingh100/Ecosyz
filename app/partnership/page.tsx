'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { toast } from 'sonner';

const BENEFITS = [
  {
    icon: '🤝',
    title: 'Become an Affiliate',
    description: 'Get your unique affiliate code and link when approved. Share with your network—subscribers enter your code at checkout to give you 5%.',
  },
  {
    icon: '💰',
    title: '5% Commission',
    description: 'Earn 5% commission for every subscription where your code is used. Subscribers enter your code on the pricing page before subscribing.',
  },
  {
    icon: '📈',
    title: 'Share Your Code',
    description: 'Share your link (e.g. /pricing?ref=YOURCODE) or just the code. When someone subscribes and enters it, you earn.',
  },
];

export default function PartnershipPage() {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    linkedin: '',
    coverNote: '',
  });

  const handleApplySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.email.trim()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('email', formData.email);
      fd.append('linkedin', formData.linkedin);
      fd.append('coverNote', formData.coverNote);

      const res = await fetch('/api/partnership/apply', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.details ? `${data.error} (${data.details})` : (data.error || 'Failed to submit. Please try again.');
        toast.error(msg);
        return;
      }

      toast.success('Application sent! We\'ll review and send you your affiliate link soon.');
      setShowApplyModal(false);
      setFormData({ name: '', email: '', linkedin: '', coverNote: '' });
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
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-emerald-500/20 to-transparent opacity-80 blur-3xl" />
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-16"
            >
              <div className="text-center mb-8">
                <span className="inline-block px-3 py-1 text-xs font-medium bg-white/10 text-emerald-400 rounded-full border border-white/20 backdrop-blur-sm mb-4">
                  Affiliate Partnership Program
                </span>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text mb-4">
                  Earn 5% Commission on Every Subscription
                </h1>
                <p className="text-center text-lg sm:text-xl text-teal-100/80 max-w-2xl mx-auto">
                  Become an ECOSYZ affiliate. Get your unique code when approved—share it or your link. When subscribers enter your code at checkout, you earn 5%.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-teal-100/60">
                <span>Free to join</span>
                <span>5% commission per subscription</span>
                <span>Unique referral links</span>
              </div>
            </motion.div>

            {/* How it works */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-20"
            >
              <h2 className="text-2xl font-bold text-emerald-400 mb-6">How it works</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {BENEFITS.map((benefit) => (
                  <div
                    key={benefit.title}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg hover:border-emerald-500/30 hover:bg-white/[0.07] transition-all"
                  >
                    <span className="text-3xl mb-3 block">{benefit.icon}</span>
                    <h3 className="font-semibold text-emerald-400 mb-2">{benefit.title}</h3>
                    <p className="text-sm text-teal-100/80">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Commission details */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mb-20"
            >
              <h2 className="text-2xl font-bold text-emerald-400 mb-6">Commission structure</h2>
              <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">💵</span>
                  <div>
                    <h3 className="font-semibold text-emerald-400 text-lg">5% per subscription</h3>
                    <p className="text-sm text-teal-100/80">
                      When someone subscribes through your affiliate link, you earn 5% commission. No cap on how many subscribers you can refer.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-teal-100/80">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Get your unique affiliate code and link when approved
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Share your link (e.g. /pricing?ref=YOURCODE) or code—subscribers enter it at checkout
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> 5% commission credited when they subscribe with your code
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> Payouts processed regularly
                  </li>
                </ul>
              </div>
            </motion.section>

            {/* CTA */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-center pt-12 border-t border-white/10"
            >
              <h3 className="text-xl font-semibold text-emerald-400 mb-4">Ready to become an affiliate?</h3>
              <p className="text-teal-100/70 text-sm mb-6 max-w-xl mx-auto">
                Apply now. We&apos;ll review your application and send you your unique referral link and dashboard access.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => setShowApplyModal(true)}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-900 font-semibold rounded-lg hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/25 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending...' : 'Apply for Partnership'}
                </button>
                <Link
                  href="/contact?enquiry=partnership"
                  className="inline-flex items-center justify-center px-6 py-3 border border-white/20 text-teal-100/80 font-medium rounded-lg hover:bg-white/10 hover:border-emerald-500/30 transition text-sm backdrop-blur-sm"
                >
                  Contact us
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
              <h3 className="text-lg font-semibold text-emerald-400 mb-1">Affiliate Partnership Program</h3>
              <p className="text-sm text-teal-100/70 mb-5">
                Apply to become an affiliate. We&apos;ll send you your unique referral link and dashboard access.
              </p>
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 backdrop-blur-sm"
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
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">LinkedIn (optional)</label>
                  <input
                    type="url"
                    value={formData.linkedin}
                    onChange={(e) => setFormData((p) => ({ ...p, linkedin: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-100/80 mb-2">How will you promote us? (optional)</label>
                  <textarea
                    value={formData.coverNote}
                    onChange={(e) => setFormData((p) => ({ ...p, coverNote: e.target.value }))}
                    placeholder="e.g. Social media, blog, community, etc."
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/20 text-white text-sm placeholder-teal-100/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 resize-none backdrop-blur-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!formData.email.trim() || submitting}
                    className="flex-1 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-900 font-semibold text-sm rounded-lg hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {submitting ? 'Sending...' : 'Apply Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    disabled={submitting}
                    className="px-6 py-2.5 border border-emerald-500/20 text-teal-100/80 text-sm font-medium rounded-lg hover:bg-emerald-500/10 transition disabled:opacity-50"
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
