import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB7rJ7g-9M07aY6ERwrC8_gk2VCvzrbVAs",
  authDomain: "datquiz-88e31.firebaseapp.com",
  projectId: "datquiz-88e31",
  storageBucket: "datquiz-88e31.firebasestorage.app",
  messagingSenderId: "1012621876063",
  appId: "1:1012621876063:web:e5cae71d7d26f787bfb4ea",
  measurementId: "G-QD4XF810KK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, analytics, firebaseConfig };
