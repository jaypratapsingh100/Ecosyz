import Link from 'next/link';
import { BarChart3, Mail, LayoutDashboard, Activity } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0c2321] via-[#121f22] to-[#0a1016]">
      <Header />
      <nav className="relative z-20 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-semibold">Admin</span>
            </Link>
            <Link
              href="/admin/analytics"
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Analytics</span>
            </Link>
            <Link
              href="/admin/newsletter"
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>Newsletter</span>
            </Link>
            <Link
              href="/admin/api-usage"
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <Activity className="w-5 h-5" />
              <span>API Usage</span>
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
      <Footer />
    </div>
  );
}
