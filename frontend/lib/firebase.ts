import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDpCS6JCGKiqsveIfEYQ33mIoEqan65TlM",
  authDomain: "civicmind-df45a.firebaseapp.com",
  projectId: "civicmind-df45a",
  storageBucket: "civicmind-df45a.firebasestorage.app",
  messagingSenderId: "845347401404",
  appId: "1:845347401404:web:9e8b24976f37c469bd6ab9",
  measurementId: "G-N1E8NZPGJP",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
