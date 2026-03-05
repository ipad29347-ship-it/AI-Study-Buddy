import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCks7H5jHxrr0iTQ_ZG6zix0m58Ffh4KNE",
  authDomain: "ai-study-buddy-8767e.firebaseapp.com",
  projectId: "ai-study-buddy-8767e",
  storageBucket: "ai-study-buddy-8767e.firebasestorage.app",
  messagingSenderId: "476188732850",
  appId: "1:476188732850:web:da132f1cdae441d5cb08ab",
  databaseURL: "https://ai-study-buddy-8767e-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
