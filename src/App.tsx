import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import StudySet from './pages/StudySet';
import Flashcards from './pages/Flashcards';
import Quiz from './pages/Quiz';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="set/:id" element={<StudySet />} />
          <Route path="set/:id/flashcards" element={<Flashcards />} />
          <Route path="set/:id/quiz" element={<Quiz />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
