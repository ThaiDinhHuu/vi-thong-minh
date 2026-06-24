// Khai báo Firebase SDK (gom một chỗ, các module khác import lại từ đây)
export { firebaseConfig } from '../firebase-config.js';
export { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
export { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
export { initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot,
  addDoc, deleteDoc, updateDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
