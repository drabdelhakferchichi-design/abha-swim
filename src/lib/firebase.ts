import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyCjzb3O-BnkUu36aPlDbnmQ7nRLGbajM9I",
  authDomain: "abha-swim-hub.firebaseapp.com",
  projectId: "abha-swim-hub",
  storageBucket: "abha-swim-hub.firebasestorage.app",
  messagingSenderId: "1017041927648",
  appId: "1:1017041927648:web:96873898fbf80b07eaff85"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;