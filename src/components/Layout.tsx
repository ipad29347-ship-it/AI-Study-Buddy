import { Outlet, Link, useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { BookOpen, LogOut, User, Home, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Layout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) navigate('/auth');
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans">
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">AI Study Buddy</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1">
                <Home className="w-4 h-4" /> Dashboard
              </Link>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
              <button
                onClick={handleSignOut}
                className="text-sm font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
