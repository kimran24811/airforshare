import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyAchF1YX_vzMlQp_tSTBCEACGWEz6R6fMY',
  authDomain: 'kissanbhai-f79fb.firebaseapp.com',
  projectId: 'kissanbhai-f79fb',
  storageBucket: 'kissanbhai-f79fb.firebasestorage.app',
  messagingSenderId: '422152972898',
  appId: '1:422152972898:web:0666cc6fe08fac4a02bf3b',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);
