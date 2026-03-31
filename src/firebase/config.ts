import { initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase 콘솔에서 프로젝트 설정 > 일반 > 내 앱 에서 값을 가져오세요
// https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: "AIzaSyBAyoOSRImBFVYr_Kk8O0614lnwKJqj9mc",
  authDomain: "challenge-checker-a36c8.firebaseapp.com",
  projectId: "challenge-checker-a36c8",
  storageBucket: "challenge-checker-a36c8.firebasestorage.app",
  messagingSenderId: "453967683775",
  appId: "1:453967683775:web:37ddf8b89f0a2adede660a",
  measurementId: "G-YKTFHR422D"
};

const app = initializeApp(firebaseConfig);

// React Native 번들에는 getReactNativePersistence가 있으나, firebase/auth 공개 typings에는 없습니다.
// React Native에서는 Firebase가 권장하는 AsyncStorage persistence를 씁니다.
let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  const { getReactNativePersistence } = require('firebase/auth') as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  };
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
