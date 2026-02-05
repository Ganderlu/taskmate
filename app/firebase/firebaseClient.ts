import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";



const firebaseConfig = {
 apiKey: "AIzaSyBZsHz95thIzmOF8s56RvuCjEaJqkCJEao",
  authDomain: "taskmate-ai-f88bd.firebaseapp.com",
  projectId: "taskmate-ai-f88bd",
  storageBucket: "taskmate-ai-f88bd.firebasestorage.app",
  messagingSenderId: "153443889790",
  appId: "1:153443889790:web:f9d81c146e86d022c21e2f",
  measurementId: "G-FSHSWBL2Q2"
}


const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");