import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, remove, update } from "firebase/database";
// Firebase Storage removed - using Cloudflare R2 instead
// import { getStorage } from "firebase/storage";
import { setLogLevel } from "firebase/app"; 

// Using environment variables from the .env file (standard practice)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_DB_URL,
  projectId: import.meta.env.VITE_PROJECT_ID,
  // storageBucket: import.meta.env.VITE_STORAGE_BUCKET, // Removed - using R2
  messagingSenderId: import.meta.env.VITE_MSG_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID 
};

// We don't need the conditional check for databaseURL when using VITE_DB_URL
// but we'll include a fallback if VITE_DB_URL isn't explicitly set (optional but safer)
if (!firebaseConfig.databaseURL && firebaseConfig.projectId) {
    firebaseConfig.databaseURL = `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
// Firebase Storage removed - using Cloudflare R2 instead
// export const storage = getStorage(app);

// Export RTDB functions needed by db-utils.js
export { ref, set, get, onValue, push, remove, update };

// Set logging level for production
setLogLevel('error');

export async function initializeAuth() {
    // FIX: We are removing all logic related to __initial_auth_token.
    // In a standard .env setup, we simply ensure Auth is initialized.
    // The user's application logic handles manual login via RTDB.
    return;
}
