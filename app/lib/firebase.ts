// Import the functions you need from the SDKs you need
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVgNakWOIt6KVTaZ6PMh3XwAxOHG5uE-U",
  authDomain: "studylab-krenova.firebaseapp.com",
  projectId: "studylab-krenova",
  storageBucket: "studylab-krenova.firebasestorage.app",
  messagingSenderId: "1061389914326",
  appId: "1:1061389914326:web:a983c9f94a82136f08f977",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
