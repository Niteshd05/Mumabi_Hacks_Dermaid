'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAncln31mIjjdo-uC-VahyNpbEEcXdEGbM",
  authDomain: "dermaid-b26c4.firebaseapp.com",
  projectId: "dermaid-b26c4",
  storageBucket: "dermaid-b26c4.firebasestorage.app",
  messagingSenderId: "189876641404",
  appId: "1:189876641404:web:febbe5615995a19663f3f9",
  measurementId: "G-BBMG5RJ7PV"
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics only in browser
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export default app;

