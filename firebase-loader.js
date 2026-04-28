/* firebase-loader.js
   Loaded as type="module" by every page.
   Initializes Firebase and exposes auth helpers on window. */

import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
         getRedirectResult, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const app  = initializeApp(window.KT_FIREBASE_CONFIG || {
  apiKey:            "AIzaSyCrCg11nB8I2f-3rQwN8NkwzSQrnQ9c8Rs",
  authDomain:        "kidtracker-3e5d9.firebaseapp.com",
  databaseURL:       "https://kidtracker-3e5d9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "kidtracker-3e5d9",
  storageBucket:     "kidtracker-3e5d9.firebasestorage.app",
  messagingSenderId: "206740291278",
  appId:             "1:206740291278:web:b48194ff4da011534b1a9f",
  measurementId:     "G-ZZ0XNLBN56"
});

const db   = getDatabase(app);
const auth = getAuth(app);
const prov = new GoogleAuthProvider();
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

window._fbSet = (p, v) => set(ref(db, p), v);
window._fbOn  = (p, cb) => onValue(ref(db, p), s => cb(s.val()));
window._signOut = () => signOut(auth);
window.KT = window.KT || {};
window.KT.db   = db;
window.KT.auth = auth;

window._signIn = async () => {
  const errEl = document.getElementById("login-error");
  const loadEl = document.getElementById("login-loading");
  if (errEl) errEl.style.display = "none";
  if (loadEl) loadEl.style.display = "block";
  try {
    if (isMobile) await signInWithRedirect(auth, prov);
    else          await signInWithPopup(auth, prov);
  } catch(e) {
    if (loadEl) loadEl.style.display = "none";
    if (errEl) { errEl.textContent = e.message; errEl.style.display = "block"; }
  }
};

// Handle redirect result
getRedirectResult(auth).catch(e => console.warn("Redirect:", e.message));

// Auth state changes
onAuthStateChanged(auth, user => {
  window.KT.currentUser = user || null;
  document.dispatchEvent(new CustomEvent("auth-change", { detail: user }));
});
