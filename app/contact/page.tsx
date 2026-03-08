'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { supabase } from '../../src/lib/supabase';
import { useSearchParams } from 'next/navigation';

function ContactForm() {
  const searchParams = useSearchParams();
  const enquiryType = searchParams.get('enquiry') || 'general';
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getSubject = () => {
    switch (enquiryType) {
      case 'enterprise':
        return 'Enterprise Inquiry - Open Idea';
      case 'sales':
        return 'Sales Inquiry - Open Idea';
      case 'partnership':
        return 'Partnership / Affiliate Inquiry - Open Idea';
      default:
        return 'Contact Form Submission - Open Idea';
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(false);
    setError('');
    setLoading(true);

    try {
      const COMPANY_EMAIL = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@openidea.world';
      
      if (!supabase) {
        throw new Error('Supabase client is not available');
      }

      // Send email via Supabase Edge Function
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: COMPANY_EMAIL,
          subject: getSubject(),
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Inquiry Type:</strong> ${enquiryType}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
          text: `New Contact Form Submission\n\nInquiry Type: ${enquiryType}\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('[ContactForm] send failed', err);
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <main className="flex-grow relative py-16 px-4 sm:px-6 lg:px-8">
        {/* Globe background image */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/hero-globe.png"
            alt="Digital Globe Background"
            fill
            className="object-cover object-right opacity-30"
            quality={100}
            priority
          />
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-radial from-cyan-400/20 to-transparent opacity-80 blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-teal-100/80 font-medium">
              {enquiryType === 'enterprise' 
                ? 'Interested in our Enterprise plan? Let\'s discuss how we can help your organization.'
                : 'Have questions or feedback? We\'d love to hear from you.'}
            </p>
          </div>

          <div className="glass glass-border rounded-xl p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6" aria-label="Contact form">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-teal-200 mb-2">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  className="w-full px-4 py-3 rounded-lg glass glass-border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-teal-200 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-lg glass glass-border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-teal-200 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg glass glass-border text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                  placeholder={enquiryType === 'enterprise' 
                    ? 'Tell us about your organization and requirements...'
                    : 'How can we help you?'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold shadow-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>

              {submitted && (
                <div className="p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/50">
                  <p className="text-emerald-400 text-center">
                    Thank you for your message! We'll get back to you soon.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50">
                  <p className="text-red-400 text-center">{error}</p>
                </div>
              )}
            </form>
          </div>

          <div className="mt-12 text-center">
            <p className="text-teal-100/80 mb-4">Or reach us directly at</p>
            <a 
              href="mailto:info@openidea.world" 
              className="text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              info@openidea.world
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-teal-100/80">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <ContactForm />
    </Suspense>
  );
}

