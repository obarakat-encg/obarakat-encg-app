import { auth } from "../firebase.js";
import { signInAnonymously, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { dbUtils } from "./db-utils.js";
import { ref, set } from "firebase/database";
import { database } from "../firebase.js";

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userRole = localStorage.getItem("encg_user_role") || null;
    this.listeners = [];

    onAuthStateChanged(auth, (u) => this._handle(u));
  }

  _handle(firebaseUser) {
    this.currentUser = firebaseUser;
    this.userRole = localStorage.getItem("encg_user_role") || null;

    this.listeners.forEach((fn) => fn(firebaseUser, this.userRole));
  }

  async loginWithCredentials(username, password) {
    try {
      // Step 0: Set persistence to LOCAL (browser storage)
      await setPersistence(auth, browserLocalPersistence);

      // Step 1: verify username + password (allowed by rules)
      const userCredential = await dbUtils.findUserForLogin(username, password);
      if (!userCredential) throw new Error("Invalid credentials");

      // Step 2: Sign in anonymously
      const authResult = await signInAnonymously(auth);
      const firebaseUser = authResult.user;

      // Step 3: Assign role in DB
      await set(ref(database, `user_roles/${firebaseUser.uid}`), {
        role: userCredential.role,
        username,
        updated_at: new Date().toISOString()
      });

      // Step 4: Save locally
      this.userRole = userCredential.role;
      this.currentUser = firebaseUser;

      localStorage.setItem("encg_user_role", userCredential.role);
      localStorage.setItem("encg_current_user", JSON.stringify({
        ...userCredential,
        firebaseUid: firebaseUser.uid
      }));

      this.listeners.forEach((fn) =>
        fn(firebaseUser, userCredential.role)
      );

      return { 
        success: true, 
        user: userCredential,
        firebaseUser: firebaseUser
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async logout() {
    localStorage.clear();
    await signOut(auth);
    this.currentUser = null;
    this.userRole = null;
    this.listeners.forEach((fn) => fn(null, null));
  }

  onAuthStateChange(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }

  async initialize() {
    // Set persistence to LOCAL (browser storage) to keep users logged in
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (error) {
      console.error("Failed to set auth persistence:", error);
    }

    // Wait for initial auth state
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  isAdmin() {
    return this.userRole === "admin";
  }
}

export const authService = new AuthService();
