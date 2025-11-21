// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBSDW159_2qzsa3Nga9W8CTzH7RcVoEz1U",
  authDomain: "membership-management-1b787.firebaseapp.com",
  projectId: "membership-management-1b787",
  storageBucket: "membership-management-1b787.firebasestorage.app",
  messagingSenderId: "163002063066",
  appId: "1:163002063066:web:fcdfa9461031b4190e2de3",
  measurementId: "G-KNVZHNWBRM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);