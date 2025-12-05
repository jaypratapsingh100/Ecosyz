import Header from '../components/Header';
import Footer from '../components/Footer';
import AboutHero from '../components/AboutHero';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <AboutHero />
      </main>
      <Footer />
    </div>
  );
}
