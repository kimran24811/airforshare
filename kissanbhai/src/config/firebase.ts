// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAchF1YX_vzMlQp_tSTBCEACGWEz6R6fMY",
  authDomain: "kissanbhai-f79fb.firebaseapp.com",
  projectId: "kissanbhai-f79fb",
  storageBucket: "kissanbhai-f79fb.firebasestorage.app",
  messagingSenderId: "422152972898",
  appId: "1:422152972898:web:0666cc6fe08fac4a02bf3b",
  measurementId: "G-0R0TEMCNB6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
