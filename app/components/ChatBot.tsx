'use client';

import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

interface Message {
  text: string;
  isBot?: boolean;
}

// Supabase configuration
const COMPANY_EMAIL = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? '';

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<'ask' | 'askContact' | 'done'>('ask');
  const [userChat, setUserChat] = useState('');
  const [loading, setLoading] = useState(false);

  // Simple regex for email and phone (very basic)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const phoneRegex = /\b\d{6,}\b/; // At least 6 digits for phone

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((msgs) => [...msgs, { text: userMessage }]);
    setInput('');

    // 1st stage: Get user's message
    if (stage === 'ask') {
      setUserChat(userMessage);
      setTimeout(() => {
        setMessages((msgs) => [
          ...msgs,
          { text: "Please leave your email and phone number for further contact.", isBot: true },
        ]);
        setStage('askContact');
      }, 500);
    }

    // 2nd stage: Get email/phone, send to your inbox
    if (stage === 'askContact') {
      // Parse user input for email & phone
      const email = userMessage.match(emailRegex)?.[0] || '';
      const phone = userMessage.match(phoneRegex)?.[0] || '';

      if (email && phone) {
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

          // Send email via Supabase Edge Function
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              to: COMPANY_EMAIL,
              subject: 'New website chat submission',
              html: `
                <h2>New Chat Submission</h2>
                <p><strong>Message:</strong> ${userChat}</p>
                <p><strong>User Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
              `,
              text: `New Chat Submission\n\nMessage: ${userChat}\nUser Email: ${email}\nPhone: ${phone}`,
            },
          });

          if (error) throw error;

          setLoading(false);
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
            { text: "Please enter a valid email and phone number.", isBot: true },
          ]);
        }, 500);
      }
    }
  };

  return (
    <div className="fixed bottom-32 right-6 z-50 text-sm">
      {open ? (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg w-72 flex flex-col h-80 border border-teal-400/50">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="font-semibold">Chat</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="hover:text-red-500"
            >
              &times;
            </button>
          </div>
          <div className="flex-grow p-2 overflow-y-auto space-y-2">
            {messages.length === 0 && (
              <p className="text-gray-500">How can we help?</p>
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
            <form onSubmit={handleSend} className="p-2 border-t border-gray-200 dark:border-gray-700">
              <input
                type="text"
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none"
                value={input}
                placeholder={
                  stage === "ask"
                    ? "Type a message..."
                    : "Enter email & phone..."
                }
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
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
