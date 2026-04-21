// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAo5prervP5haCZDIvdauUdADcAwxVLZ-0",
  authDomain: "burger-8b99a.firebaseapp.com",
  projectId: "burger-8b99a",
  storageBucket: "burger-8b99a.firebasestorage.app",
  messagingSenderId: "428184631459",
  appId: "1:428184631459:web:9eefc8d7385769ae51e716",
  measurementId: "G-7Y4BT8M7MG"
};

const app = initializeApp(firebaseConfig);

// ✅ correct export
export const db = getFirestore(app);    
export const auth = getAuth(app); 