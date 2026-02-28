import { useState } from 'react';
import { LogOut, User, Menu, X, Trophy } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav initial={{ y: -20 }} animate={{ y: 0 }} className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white font-black text-2xl">W</div>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter">WoordMeester</h1>
            <p className="text-xs text-emerald-400 -mt-1">Leer. Onthoud. Groei.</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm">
          <a href="/" className="hover:text-violet-400 transition">Dashboard</a>
          <a href="/profile" className="hover:text-violet-400 transition">Profiel</a>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-2xl">
            <Trophy className="text-amber-400" size={18} />
            <span className="font-medium">Streak: 7 dagen</span>
          </div>
          <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-red-500/10 hover:text-red-400 rounded-2xl transition-all">
            <LogOut size={18} /> Uitloggen
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {mobileOpen && <Sidebar mobile />}
    </motion.nav>
  );
}