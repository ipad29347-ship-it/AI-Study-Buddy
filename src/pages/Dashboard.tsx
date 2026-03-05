import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { ref, push, set, onValue, remove } from 'firebase/database';
import { UploadCloud, FileText, Plus, Loader2, BookOpen, BrainCircuit, CheckCircle2, Trash2, FileUp, TrendingUp, Award, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';

export default function Dashboard() {
  const [studySets, setStudySets] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{task: string, progress?: number} | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTextInput(event.target?.result as string);
        setShowInput(true);
      };
      reader.readAsText(file);
    } else {
      alert('Please drop a .txt file');
    }
  };

  const totalMastery = studySets.length > 0 
    ? Math.round(studySets.reduce((acc, set) => acc + (set.masteryLevel || 0), 0) / studySets.length)
    : 0;

  const totalTerms = studySets.reduce((acc, set) => acc + (set.flashcards?.length || 0), 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
            Welcome back, <span className="text-indigo-600">{auth.currentUser?.displayName?.split(' ')[0] || 'Student'}</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl">
            You've mastered {totalMastery}% of your study material across {studySets.length} sets.
          </p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowInput(!showInput)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-2 text-lg"
        >
          <Plus className="w-6 h-6" /> New Study Set
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Overall Mastery', value: `${totalMastery}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total Terms', value: totalTerms, icon: Award, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'Study Sets', value: studySets.length, icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5"
          >
            <div className={`${stat.bg} p-4 rounded-2xl ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {(showInput || isDragging) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-4 border-dashed transition-all shadow-2xl overflow-hidden ${isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800'}`}
          >
            <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-indigo-100 dark:bg-indigo-900/40 p-5 rounded-3xl mb-4">
                <FileUp className={`w-10 h-10 ${isDragging ? 'animate-bounce text-indigo-600' : 'text-indigo-500'}`} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Drop your study material</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Drag and drop a .txt file or paste your notes below.</p>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste your NCERT chapter, lecture notes, or textbook text here..."
              className="w-full h-64 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-4 focus:ring-indigo-500/20 outline-none resize-none transition-all mb-6 text-lg leading-relaxed"
              disabled={isUploading}
            />
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowInput(false)}
                className="px-8 py-3 rounded-2xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isUploading || !textInput.trim()}
                className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    AI is thinking...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-6 h-6" />
                    Generate Study Set
                  </>
                )}
              </button>
            </div>

            {isUploading && uploadProgress && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-6"
              >
                <div className="bg-indigo-100 dark:bg-indigo-800 p-3 rounded-2xl">
                  <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <p className="font-bold text-indigo-900 dark:text-indigo-200">{uploadProgress.task}</p>
                    <span className="text-sm font-bold text-indigo-600">{uploadProgress.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-indigo-200 dark:bg-indigo-800/50 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress.progress || 0}%` }}
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    ></motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {studySets.length === 0 && !showInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-32 flex flex-col items-center justify-center text-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]"
          >
            <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
              <BookOpen className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Your library is empty</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 text-lg">Upload your first chapter to see the magic of AI Study Buddy. We'll turn your notes into interactive tools.</p>
            <button
              onClick={() => setShowInput(true)}
              className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/30 hover:bg-indigo-700"
            >
              Get Started
            </button>
          </motion.div>
        )}

        {studySets.map((set, i) => (
          <motion.div
            key={set.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={() => navigate(`/set/${set.id}`)}
            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-indigo-300 dark:hover:border-indigo-900/50 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <FileText className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => deleteSet(e, set.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {set.title}
            </h3>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between text-sm font-bold">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>{Math.round(set.masteryLevel || 0)}% Mastery</span>
                </div>
                <span className="text-slate-400">{set.flashcards?.length || 0} terms</span>
              </div>
              
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${set.masteryLevel || 0}%` }}
                  className="bg-emerald-500 h-full rounded-full"
                ></motion.div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-indigo-100 text-indigo-600' : i === 1 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {i === 0 ? 'FC' : i === 1 ? 'QZ' : 'SM'}
                    </div>
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ready to study</span>
              </div>
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Clock className="w-3 h-3" />
              <span>Created {new Date(set.createdAt).toLocaleDateString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
