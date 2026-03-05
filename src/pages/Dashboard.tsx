import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { UploadCloud, FileText, Plus, Loader2, BookOpen, BrainCircuit, CheckCircle2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

export default function Dashboard() {
  const [studySets, setStudySets] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{task: string, progress?: number} | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const navigate = useNavigate();
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const setsRef = ref(db, `users/${auth.currentUser.uid}/studySets`);
    const unsubscribe = onValue(setsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sets = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setStudySets(sets.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setStudySets([]);
      }
    });

    workerRef.current = new Worker(new URL('../lib/worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = async (e) => {
      const { status, task, data, result, error } = e.data;
      
      if (status === 'progress') {
        setUploadProgress({ task, progress: data?.progress || 0 });
      } else if (status === 'complete') {
        await saveStudySet(result);
      } else if (status === 'error') {
        console.error('Worker error:', error);
        alert('Error processing text: ' + error);
        setIsUploading(false);
        setUploadProgress(null);
      }
    };

    return () => {
      unsubscribe();
      workerRef.current?.terminate();
    };
  }, []);

  const handleGenerate = async () => {
    if (!textInput.trim()) return;
    setIsUploading(true);
    setUploadProgress({ task: 'Initializing AI Models...' });
    
    workerRef.current?.postMessage({
      type: 'generate',
      text: textInput,
      id: uuidv4()
    });
  };

  const saveStudySet = async (result: any) => {
    if (!auth.currentUser) return;
    try {
      const title = textInput.split('\n')[0].substring(0, 50) + '...';
      const setsRef = ref(db, `users/${auth.currentUser.uid}/studySets`);
      const newSetRef = push(setsRef);
      
      await set(newSetRef, {
        title,
        originalText: textInput,
        summary: result.summary,
        flashcards: result.flashcards,
        quizzes: result.quizzes,
        createdAt: Date.now(),
        masteryLevel: 0
      });
      
      setIsUploading(false);
      setUploadProgress(null);
      setShowInput(false);
      setTextInput('');
      navigate(`/set/${newSetRef.key}`);
    } catch (error) {
      console.error("Error saving document: ", error);
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const deleteSet = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    if (confirm('Are you sure you want to delete this study set?')) {
      const setRef = ref(db, `users/${auth.currentUser.uid}/studySets/${id}`);
      await remove(setRef);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">My Study Sets</h1>
          <p className="text-slate-500 dark:text-slate-400">Upload notes to generate AI summaries, flashcards, and quizzes.</p>
        </div>
        <button
          onClick={() => setShowInput(!showInput)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> New Study Set
        </button>
      </div>

      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-indigo-500" /> Paste your notes
            </h2>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste your NCERT chapter, lecture notes, or textbook text here..."
              className="w-full h-48 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all mb-4"
              disabled={isUploading}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowInput(false)}
                className="px-6 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isUploading || !textInput.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-all flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-5 h-5" />
                    Generate AI Study Set
                  </>
                )}
              </button>
            </div>

            {isUploading && uploadProgress && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-4"
              >
                <div className="bg-indigo-100 dark:bg-indigo-800 p-2 rounded-full">
                  <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{uploadProgress.task}</p>
                  {uploadProgress.progress !== undefined && uploadProgress.progress > 0 && (
                    <div className="w-full bg-indigo-200 dark:bg-indigo-800/50 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studySets.length === 0 && !showInput && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No study sets yet</h3>
            <p className="text-slate-500 max-w-sm mb-6">Create your first study set by pasting your notes. Our AI will automatically generate flashcards and quizzes for you.</p>
            <button
              onClick={() => setShowInput(true)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 px-6 py-2.5 rounded-xl font-medium transition-all shadow-sm"
            >
              Create Study Set
            </button>
          </div>
        )}

        {studySets.map((set) => (
          <motion.div
            key={set.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => navigate(`/set/${set.id}`)}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                  {set.flashcards?.length || 0} terms
                </span>
                <button 
                  onClick={(e) => deleteSet(e, set.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">{set.title}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{Math.round(set.masteryLevel || 0)}% Mastery</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-2">
              <div 
                className="bg-emerald-500 h-1 rounded-full"
                style={{ width: `${set.masteryLevel || 0}%` }}
              ></div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
