import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC57jYTSrEkqsKYKIkLMYYIV5Y6IYcntd0",
  authDomain: "formalchat.firebaseapp.com",
  projectId: "formalchat",
  storageBucket: "formalchat.firebasestorage.app",
  messagingSenderId: "206785547448",
  appId: "1:206785547448:web:822d8499beaf9d854bb84d",
};

export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
