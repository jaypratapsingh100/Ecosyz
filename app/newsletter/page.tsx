'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Image from 'next/image';

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Subscription failed');
      }
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016] min-h-[70vh]">
          <div className="pointer-events-none absolute inset-0 z-0">
            <Image
              src="/hero-globe.png"
              alt=""
              fill
              className="object-cover object-right opacity-30"
            />
            <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl" />
          </div>
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-[#38bdf8] via-[#0ff0fc] to-cyan-400 bg-clip-text mb-2">
              Newsletter
            </h1>
            <p className="text-teal-200/60 text-sm mb-8">
              Get updates on Open Idea, AI news, and open innovation
            </p>
            <div className="glass glass-border rounded-xl p-6 sm:p-8 space-y-6 border-[#38bdf8]/20">
              <p className="text-teal-100/80 text-sm leading-relaxed">
                Subscribe to our newsletter for product updates, AI and innovation news,
                community highlights, and early access to new features.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="newsletter-email" className="block text-sm font-medium text-teal-100/80 mb-2">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={sending}
                    className="w-full px-4 py-3 rounded-lg bg-zinc-800/80 border border-[#38bdf8]/20 text-white placeholder-teal-100/40 focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8]/30 disabled:opacity-60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-[#38bdf8] to-[#0ff0fc] text-gray-900 font-semibold rounded-lg hover:scale-[1.02] hover:shadow-lg hover:shadow-[#38bdf8]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {sending ? 'Subscribing...' : 'Subscribe'}
                </button>
                {status === 'success' && (
                  <p className="text-emerald-400 text-sm font-medium">
                    Thanks! We&apos;ll add you to our newsletter.
                  </p>
                )}
                {status === 'error' && (
                  <p className="text-red-400 text-sm font-medium">
                    Something went wrong. Please try again or contact us at{' '}
                    <a href="mailto:info@openidea.world" className="underline">info@openidea.world</a>.
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
