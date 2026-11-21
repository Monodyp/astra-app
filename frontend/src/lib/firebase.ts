// Initializes the Firebase client app lazily from environment variables only.
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function hasFirebaseConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey?.trim() &&
      firebaseConfig.authDomain?.trim() &&
      firebaseConfig.projectId?.trim()
  );
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  if (!hasFirebaseConfig()) {
    throw new Error(
      'Firebase client configuration is missing (VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID).'
    );
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
