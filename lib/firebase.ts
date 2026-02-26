import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVgNakWOIt6KVTaZ6PMh3XwAxOHG5uE-U",
  authDomain: "studylab-krenova.firebaseapp.com",
  projectId: "studylab-krenova",
  storageBucket: "studylab-krenova.firebasestorage.app",
  messagingSenderId: "1061389914326",
  appId: "1:1061389914326:web:a983c9f94a82136f08f977",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
