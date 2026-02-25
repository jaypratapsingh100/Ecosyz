'use client';

import { useEffect, useState } from 'react';

interface InboxConversation {
  id: string;
  gig?: { id: string; title: string | null };
  barterAsk?: { id: string; title: string };
  participants: { id: string; name: string | null; avatarUrl: string | null }[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string | null; avatarUrl: string | null };
  } | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface InboxMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string | null; avatarUrl: string | null };
}

export default function Inbox() {
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Load inbox list
  useEffect(() => {
    const load = async () => {
      setLoadingConversations(true);
      try {
        const res = await fetch('/api/conversations', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        setConversations(data.conversations || []);
        if (!selectedConversationId && data.conversations?.length > 0) {
          setSelectedConversationId(data.conversations[0].id);
        }
      } catch (error) {
        console.error('Failed to load conversations', error);
      } finally {
        setLoadingConversations(false);
      }
    };
    load();
  }, [selectedConversationId]);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        setMessages(
          (data.messages || []).map((m: any) => ({
            ...m,
            createdAt: m.createdAt,
          })),
        );
      } catch (error) {
        console.error('Failed to load messages', error);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [selectedConversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversationId || !newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (!res.ok) return;
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setNewMessage('');
      // Optimistically bump last message info in conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId
            ? {
              ...c,
              lastMessage: {
                id: msg.id,
                content: msg.content,
                createdAt: msg.createdAt,
                sender: msg.sender,
              },
              lastMessageAt: msg.createdAt,
              unreadCount: 0,
            }
            : c,
        ),
      );
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setSending(false);
    }
  };

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  return (
    <div className="flex h-full bg-[#050505] border border-white/10 rounded-2xl overflow-hidden">
      {/* Conversation list */}
      <div className="w-72 border-r border-white/10 flex flex-col">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Inbox</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              Loading conversations…
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-gray-500 px-4 text-center">
              No conversations yet. Start by messaging someone from a gig or barter.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {conversations.map((conv) => {
                const contextLabel = conv.gig
                  ? `Gig · ${conv.gig.title ?? 'Untitled'}`
                  : conv.barterAsk
                    ? `Barter · ${conv.barterAsk.title}`
                    : 'Direct';

                const otherParticipants = conv.participants;
                const title =
                  otherParticipants.map((p) => p.name || 'Unnamed').join(', ') || 'Conversation';

                const isActive = conv.id === selectedConversationId;

                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={`w-full text-left px-3 py-3 flex flex-col gap-1 hover:bg-white/5 ${
                        isActive ? 'bg-white/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-white truncate">{title}</p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-300">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate">{contextLabel}</p>
                      {conv.lastMessage && (
                        <p className="text-[11px] text-gray-500 truncate">
                          <span className="font-medium">
                            {conv.lastMessage.sender.name || 'Someone'}:{' '}
                          </span>
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Conversation thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedConversation.participants.map((p) => p.name || 'Unnamed').join(', ')}
                </p>
                <p className="text-[11px] text-gray-400">
                  {selectedConversation.gig
                    ? `Gig · ${selectedConversation.gig.title ?? 'Untitled'}`
                    : selectedConversation.barterAsk
                      ? `Barter · ${selectedConversation.barterAsk.title}`
                      : 'Direct'}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">
                  Loading messages…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-500">
                  No messages yet. Say hi!
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white">
                        {m.sender.name || 'Unnamed'}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="inline-block max-w-[80%] rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-gray-100">
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSend} className="border-t border-white/10 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 bg-[#111111] border border-white/15 rounded-full px-4 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
                  placeholder="Type a message…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-xs font-medium text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
            Select a conversation from the left to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}

