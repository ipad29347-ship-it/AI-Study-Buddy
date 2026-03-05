import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, FileText, PlayCircle, Loader2, Sparkles, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth, db } from '../lib/firebase';
import { ref, get } from 'firebase/database';

export default function StudySet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studySet, setStudySet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSet = async () => {
      if (!id || !auth.currentUser) return;
      const setRef = ref(db, `users/${auth.currentUser.uid}/studySets/${id}`);
      const snapshot = await get(setRef);
      if (snapshot.exists()) {
        setStudySet({ id: snapshot.key, ...snapshot.val() });
      }
      setLoading(false);
    };
    fetchSet();
  }, [id, auth.currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Study set not found</h2>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 hover:underline">Go back to dashboard</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{studySet.title}</h1>
          <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Generated
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Link 
            to={`/set/${id}/flashcards`}
            className="group flex items-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all"
          >
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors mr-4">
              <BrainCircuit className="w-8 h-8 text-indigo-600 group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Flashcards</h3>
              <p className="text-sm text-slate-500">{studySet.flashcards?.length || 0} terms to master</p>
            </div>
          </Link>

          <Link 
            to={`/set/${id}/quiz`}
            className="group flex items-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all"
          >
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors mr-4">
              <GraduationCap className="w-8 h-8 text-emerald-600 group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Practice Quiz</h3>
              <p className="text-sm text-slate-500">{studySet.quizzes?.length || 0} questions</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" /> AI Summary
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">
            {studySet.summary}
          </p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Original Text</h2>
        <div className="h-48 overflow-y-auto pr-4 custom-scrollbar">
          <p className="text-slate-500 dark:text-slate-400 whitespace-pre-wrap text-sm">
            {studySet.originalText}
          </p>
        </div>
      </div>
    </div>
  );
}
