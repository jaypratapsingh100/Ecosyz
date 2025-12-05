'use client';

import Header from '../components/Header';
import ChatSearch from '../components/ChatSearch';

export default function ChatPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <ChatSearch />
      </main>
    </div>
  );
}

