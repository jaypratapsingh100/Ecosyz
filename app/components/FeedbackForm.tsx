'use client';

import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

// Supabase configuration
const COMPANY_EMAIL = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '';

export default function FeedbackForm() {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(false);
    setError('');
    setLoading(true);

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[FeedbackForm] sending feedback');
      }

      if (!COMPANY_EMAIL) {
        throw new Error('Company email is not set');
      }
      
      if (!supabase) {
        throw new Error('Supabase client is not available');
      }

      // Send email via Supabase Edge Function
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: COMPANY_EMAIL,
          subject: 'New feedback from Open Idea website',
          html: `
            <h2>New Feedback Submission</h2>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
          text: `New feedback submission:\n\n${message}`,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      setMessage('');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error('[FeedbackForm] send failed', err);
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto" aria-label="Send us feedback">
      <textarea
        className="w-full p-4 rounded-md glass glass-border border border-emerald-400/30 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400/50 text-white placeholder-gray-400"
        rows={5}
        value={message}
        placeholder="Share your thoughts..."
        onChange={(e) => setMessage(e.target.value)}
        required
        disabled={loading}
      />
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 rounded-md bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 font-semibold shadow hover:scale-105 transition"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Submit'}
        </button>
      </div>
      {submitted && (
        <p className="mt-4 text-emerald-500">Thank you for your feedback!</p>
      )}
      {error && (
        <p className="mt-4 text-red-500">{error}</p>
      )}
    </form>
  );
}
