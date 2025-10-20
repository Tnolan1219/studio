'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigValid } from './config';

/**
 * Initializes Firebase. It's safe to call this multiple times.
 * If Firebase is already initialized, it will return the existing instance.
 */
export function initializeFirebase() {
  // Check if all required keys are present before initializing.
  // This check uses the imported, build-time resolved config.
  if (!isFirebaseConfigValid()) {
    console.error("Firebase config is missing required fields. App could not be initialized.");
    // Return a dummy object to prevent further crashes down the line.
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
    };
  }

  // If no apps are initialized, initialize the main app.
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
  }

  // Get the initialized app and return the SDKs.
  const app = getApp();
  return getSdks(app);
}

/**
 * A helper function to get the SDK instances from a FirebaseApp instance.
 * @param firebaseApp The initialized Firebase app.
 * @returns An object containing the Auth and Firestore instances.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
