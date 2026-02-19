'use client';

import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

interface Message {
  text: string;
  isBot?: boolean;
}

type SubmissionType = 'general' | 'bug' | 'feature';

// Supabase configuration
const COMPANY_EMAIL = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? 'info@openidea.world';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<'ask' | 'askContact' | 'done'>('ask');
  const [userChat, setUserChat] = useState('');
  const [submissionType, setSubmissionType] = useState<SubmissionType>('general');
  const [loading, setLoading] = useState(false);

  // Simple regex for validation
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const phoneRegex = /^[\d\s\-+()]{6,}$/;

  const selectType = (type: SubmissionType) => {
    setSubmissionType(type);
    const labels: Record<SubmissionType, string> = {
      general: 'How can we help?',
      bug: 'Describe the bug you encountered...',
      feature: 'Tell us about your feature idea...',
    };
    setMessages([{ text: labels[type], isBot: true }]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1st stage: Get user's message
    if (stage === 'ask') {
      if (!input.trim()) return;
      const userMessage = input.trim();
      setMessages((msgs) => [...msgs, { text: userMessage }]);
      setInput('');
      setUserChat(userMessage);
      setTimeout(() => {
        setMessages((msgs) => [
          ...msgs,
          { text: "Please leave your email and phone number for further contact.", isBot: true },
        ]);
        setStage('askContact');
      }, 500);
      return;
    }

    // 2nd stage: Get email/phone from dedicated inputs
    if (stage === 'askContact') {
      const email = contactEmail.trim();
      const phone = contactPhone.trim();
      const isValidEmail = emailRegex.test(email);
      const isValidPhone = phoneRegex.test(phone.replace(/\s/g, ''));

      if (isValidEmail && isValidPhone) {
        setLoading(true);

        try {
          if (process.env.NODE_ENV !== 'production') {
            console.info('[ChatBot] Attempting send with params:', {
              companyEmail: COMPANY_EMAIL,
              email,
              phone,
            });
          }
          if (!COMPANY_EMAIL) {
            throw new Error('Company email is not configured');
          }

          if (!supabase) {
            throw new Error('Supabase client is not available');
          }

          const typeLabels: Record<SubmissionType, string> = {
            general: 'General inquiry',
            bug: 'Bug Report',
            feature: 'Feature Request',
          };
          const subjectPrefix = typeLabels[submissionType];

          // Send email via Supabase Edge Function
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              to: COMPANY_EMAIL,
              subject: `${subjectPrefix}: ${userChat.slice(0, 50)}${userChat.length > 50 ? '...' : ''}`,
              html: `
                <h2>${subjectPrefix}</h2>
                <p><strong>Type:</strong> ${subjectPrefix}</p>
                <p><strong>Message:</strong> ${userChat}</p>
                <p><strong>User Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
              `,
              text: `${subjectPrefix}\n\nMessage: ${userChat}\nUser Email: ${email}\nPhone: ${phone}`,
            },
          });

          if (error) throw error;

          setLoading(false);
          setContactEmail('');
          setContactPhone('');
          setTimeout(() => {
            setMessages((msgs) => [
              ...msgs,
              { text: "Thank you! We'll get in touch soon.", isBot: true },
            ]);
            setStage('done');
          }, 500);
        } catch (error) {
          setLoading(false);
          console.error('Email send failed:', error);
          setMessages((msgs) => [
            ...msgs,
            { text: "Sorry, there was an error sending your message. Please try again or email us directly.", isBot: true },
          ]);
        }
      } else {
        setTimeout(() => {
          setMessages((msgs) => [
            ...msgs,
            { text: isValidEmail ? "Please enter a valid phone number (at least 6 digits)." : isValidPhone ? "Please enter a valid email address." : "Please enter a valid email and phone number.", isBot: true },
          ]);
        }, 300);
      }
      return;
    }
  };

  return (
    <div className="fixed bottom-24 sm:bottom-32 right-4 sm:right-6 z-50 text-sm">
      {open ? (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg w-[calc(100vw-2rem)] sm:w-72 max-w-sm flex flex-col h-80 border border-teal-400/50">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="font-semibold">Chat</span>
            <button
              onClick={() => {
                setOpen(false);
                setMessages([]);
                setStage('ask');
                setSubmissionType('general');
                setContactEmail('');
                setContactPhone('');
              }}
              aria-label="Close chat"
              className="hover:text-red-500"
            >
              &times;
            </button>
          </div>
          <div className="flex-grow p-2 overflow-y-auto space-y-2">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-gray-500 dark:text-gray-400 text-xs">How can we help?</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectType('bug')}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Bug Report
                  </button>
                  <button
                    type="button"
                    onClick={() => selectType('feature')}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Feature Request
                  </button>
                  <button
                    type="button"
                    onClick={() => selectType('general')}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30 transition-colors"
                  >
                    Other
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`self-end max-w-full ${msg.isBot ? "text-left" : "text-right"}`}>
                <div
                  className={`${
                    msg.isBot
                      ? "bg-gray-200 text-gray-800"
                      : "bg-emerald-500 text-white"
                  } p-2 rounded-md break-words`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-center text-gray-400">Sending...</div>
            )}
          </div>
          {stage !== 'done' && (
            <form onSubmit={handleSend} className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {stage === 'askContact' ? (
                <>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email"
                    required
                    disabled={loading}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                  />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Phone number"
                    required
                    disabled={loading}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                  />
                </>
              ) : (
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none"
                  value={input}
                  placeholder={
                    submissionType === 'bug'
                      ? "Describe the bug..."
                      : submissionType === 'feature'
                        ? "Describe your feature idea..."
                        : "Type a message..."
                  }
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                />
              )}
              <button type="submit" disabled={loading} className="w-full py-2 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm transition disabled:opacity-50">
                {loading ? 'Sending...' : stage === 'askContact' ? 'Submit' : 'Send'}
              </button>
            </form>
          )}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="p-3 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-gray-900 shadow-lg hover:scale-105 transition-all duration-200 animate-bounce-fast"
        >
          Chat
        </button>
      )}
    </div>
  );
}
