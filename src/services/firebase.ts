// Simple Firebase service for web compatibility
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';

let firebaseInstance: any = null;

const firebaseConfig = {
  apiKey: "AIzaSyClWleR1ryIHyj7WFPgmE7hCRMTGbwx7KU",
  authDomain: "dreamworldtcg.firebaseapp.com",
  projectId: "dreamworldtcg",
  storageBucket: "dreamworldtcg.firebasestorage.app",
  messagingSenderId: "323167799316",
  appId: "1:323167799316:web:54a57d9d7ccdfeccfeff01",
  measurementId: "G-CXY6ZZ4YE1"
};

// Initialize Firebase with static imports for better web compatibility
export const initializeFirebase = async () => {
  if (firebaseInstance) {
    console.log('Firebase already initialized, returning existing instance');
    return firebaseInstance;
  }
  
  console.log('Starting Firebase initialization...');
  console.log('Firebase config:', firebaseConfig);
  
  try {
    console.log('Initializing Firebase app...');
    const app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized:', app);
    
    console.log('Getting Auth and Firestore instances...');
    const auth = getAuth(app);
    const db = getFirestore(app);
    console.log('Auth and Firestore initialized');
    
    console.log('Creating Firebase instance object...');
    firebaseInstance = {
      auth,
      db,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      onAuthStateChanged,
      updateProfile,
      signOut,
      doc,
      getDoc,
      setDoc,
      updateDoc,
      deleteDoc,
      collection,
      getDocs,
      query,
      where,
      onSnapshot,
      orderBy,
      serverTimestamp
    };
    
    console.log('Firebase initialization successful!');
    return firebaseInstance;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
};

// Firebase service is ready for use