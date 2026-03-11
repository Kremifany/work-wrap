import "server-only";

import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { serverEnv } from "@/lib/env.server";

const firebasePrivateKey = serverEnv.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

const firebaseAdminApp: App =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: serverEnv.FIREBASE_PROJECT_ID,
      clientEmail: serverEnv.FIREBASE_CLIENT_EMAIL,
      privateKey: firebasePrivateKey,
    }),
    storageBucket: serverEnv.FIREBASE_STORAGE_BUCKET,
  });

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);
export const adminStorage = getStorage(firebaseAdminApp);
