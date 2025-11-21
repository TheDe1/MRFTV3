// Firebase SDK initialization and setup
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSDW159_2qzsa3Nga9W8CTzH7RcVoEz1U",
  authDomain: "membership-management-1b787.firebaseapp.com",
  projectId: "membership-management-1b787",
  storageBucket: "membership-management-1b787.firebasestorage.app",
  messagingSenderId: "163002063066",
  appId: "1:163002063066:web:fcdfa9461031b4190e2de3",
  measurementId: "G-KNVZHNWBRM",
  databaseURL: "https://membership-management-1b787-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
const database = getDatabase(app);

// Initialize Cloud Storage
const storage = firebase.storage();

// Create database references
const dbRefs = {
  users: database.ref('users'),
  registrations: database.ref('registrations'),
  students: database.ref('students'),
  deletedControlNumbers: database.ref('deletedControlNumbers')
};

// Make globally available
window.dbRefs = dbRefs;
window.database = database;
window.storage = storage;

console.log('Firebase initialized successfully!');