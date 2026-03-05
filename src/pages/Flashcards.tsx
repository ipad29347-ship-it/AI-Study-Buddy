import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RotateCcw, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../lib/firebase';
import { ref, get, update } from 'firebase/database';

export default function Flashcards() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studySet, setStudySet] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
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

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % (studySet?.flashcards?.length || 1));
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + (studySet?.flashcards?.length || 1)) % (studySet?.flashcards?.length || 1));
    }, 150);
  };

  const handleMastery = async (known: boolean) => {
    if (!studySet || !id) return;
    
    const updatedCards = [...studySet.flashcards];
    const currentCard = updatedCards[currentIndex];
    
    // Simple spaced repetition logic
    if (known) {
      currentCard.mastery = Math.min((currentCard.mastery || 0) + 25, 100);
    } else {
      currentCard.mastery = Math.max((currentCard.mastery || 0) - 10, 0);
    }

    const totalMastery = updatedCards.reduce((acc, card) => acc + (card.mastery || 0), 0);
    const avgMastery = totalMastery / updatedCards.length;

    const updatedSet = { ...studySet, flashcards: updatedCards, masteryLevel: avgMastery };
    setStudySet(updatedSet);

    // Save to Realtime Database
    if (auth.currentUser && id) {
      const setRef = ref(db, `users/${auth.currentUser.uid}/studySets/${id}`);
      await update(setRef, {
        flashcards: updatedCards,
        masteryLevel: avgMastery
      });
    }

    handleNext();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!studySet || !studySet.flashcards || studySet.flashcards.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No flashcards available</h2>
        <button onClick={() => navigate(`/set/${id}`)} className="mt-4 text-indigo-600 hover:underline">Go back</button>
      </div>
    );
  }

  const currentCard = studySet.flashcards[currentIndex];
  const progress = ((currentIndex + 1) / studySet.flashcards.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(`/set/${id}`)}
          className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Set
        </button>
        <div className="text-sm font-medium text-slate-500">
          {currentIndex + 1} / {studySet.flashcards.length}
        </div>
      </div>

      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="relative h-[400px] w-full perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex + (isFlipped ? '-flipped' : '')}
            initial={{ rotateX: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsFlipped(!isFlipped)}
            className={`absolute inset-0 w-full h-full rounded-3xl shadow-xl cursor-pointer flex items-center justify-center p-12 text-center border-2 ${
              isFlipped 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100' 
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="absolute top-6 right-6 text-xs font-bold uppercase tracking-widest text-slate-400">
              {isFlipped ? 'Answer' : 'Question'}
            </div>
            <h2 className="text-2xl md:text-3xl font-medium leading-relaxed">
              {isFlipped ? currentCard.answer : currentCard.question}
            </h2>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-slate-400 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Click to flip
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-6 mt-8">
        <button 
          onClick={handlePrev}
          className="p-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex gap-4">
          <button 
            onClick={() => handleMastery(false)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/30"
          >
            <X className="w-5 h-5" /> Still Learning
          </button>
          <button 
            onClick={() => handleMastery(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200 dark:border-emerald-800/30"
          >
            <Check className="w-5 h-5" /> Got It
          </button>
        </div>

        <button 
          onClick={handleNext}
          className="p-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors shadow-sm"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
