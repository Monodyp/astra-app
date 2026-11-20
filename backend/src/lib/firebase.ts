import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { env } from '../config/env.js';

function loadServiceAccount() {
  const value = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!value) return null;
  if (value.trim().startsWith('{')) return JSON.parse(value);
  try {
    return JSON.parse(readFileSync(path.resolve(value), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();

  admin.initializeApp({
    projectId: env.FIREBASE_PROJECT_ID,
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
  });
}

export const firebaseAdmin = admin;
