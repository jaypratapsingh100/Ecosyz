import Header from './components/Header';
import Hero from './components/Hero';
import Footer from './components/Footer';
import ChatBot from './components/ChatBot';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
}
