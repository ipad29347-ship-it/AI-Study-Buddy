import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, RefreshCw, Loader2, Trophy, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../lib/firebase';
import { ref, get, update } from 'firebase/database';

export default function Quiz() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studySet, setStudySet] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
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

  const handleAnswer = (option: string) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(option);
    const correct = option === studySet.quizzes[currentIndex].correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(score + 1);
  };

  const handleNext = async () => {
    if (currentIndex < studySet.quizzes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
    } else {
      setShowResults(true);
      // Update mastery level based on quiz score
      if (studySet && id && auth.currentUser) {
        const newMastery = Math.min(100, Math.round((score / studySet.quizzes.length) * 100));
        const setRef = ref(db, `users/${auth.currentUser.uid}/studySets/${id}`);
        await update(setRef, {
          masteryLevel: newMastery
        });
      }
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setScore(0);
    setShowResults(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!studySet || !studySet.quizzes || studySet.quizzes.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No quiz available</h2>
        <button onClick={() => navigate(`/set/${id}`)} className="mt-4 text-indigo-600 hover:underline">Go back</button>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / studySet.quizzes.length) * 100);
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 shadow-xl"
        >
          <div className="bg-indigo-100 dark:bg-indigo-900/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Quiz Complete!</h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            You scored {score} out of {studySet.quizzes.length} ({percentage}%)
          </p>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={restartQuiz}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" /> Try Again
            </button>
            <button 
              onClick={() => navigate(`/set/${id}`)}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-medium transition-colors"
            >
              Back to Study Set
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const currentQuiz = studySet.quizzes[currentIndex];
  const progress = ((currentIndex + 1) / studySet.quizzes.length) * 100;

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
          Question {currentIndex + 1} of {studySet.quizzes.length}
        </div>
      </div>

      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div 
          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white mb-8 leading-relaxed">
          {currentQuiz.question}
        </h2>

        <div className="space-y-4">
          {currentQuiz.options.map((option: string, index: number) => {
            const isSelected = selectedAnswer === option;
            const isCorrectAnswer = option === currentQuiz.correctAnswer;
            
            let buttonClass = "w-full text-left p-6 rounded-2xl border-2 transition-all flex items-center justify-between ";
            
            if (selectedAnswer === null) {
              buttonClass += "border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-700 dark:text-slate-300";
            } else if (isCorrectAnswer) {
              buttonClass += "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300";
            } else if (isSelected && !isCorrectAnswer) {
              buttonClass += "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
            } else {
              buttonClass += "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-50";
            }

            return (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                disabled={selectedAnswer !== null}
                className={buttonClass}
              >
                <span className="text-lg font-medium">{option}</span>
                {selectedAnswer !== null && isCorrectAnswer && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                )}
                {isSelected && !isCorrectAnswer && (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedAnswer !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800"
            >
              <div className={`p-4 rounded-xl mb-6 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'}`}>
                <p className="font-medium mb-1">{isCorrect ? 'Correct!' : 'Incorrect.'}</p>
                <p className="text-sm opacity-90">{currentQuiz.explanation}</p>
              </div>
              
              <button
                onClick={handleNext}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors text-lg"
              >
                {currentIndex < studySet.quizzes.length - 1 ? 'Next Question' : 'See Results'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
