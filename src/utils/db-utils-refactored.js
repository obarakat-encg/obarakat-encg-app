import { database } from "../firebase.js";
import { ref, push, set, update, remove, get, onValue } from "firebase/database";

// --- Hashing and Sanitization (Using Web Crypto API for SHA-256) ---
/**
 * Asynchronously hashes the password using SHA-256 (a cryptographic hash).
 */
async function hashPassword(password) {
    if (!password) return '';

    // Convert string to ArrayBuffer
    const msgUint8 = new TextEncoder().encode(password);
    // Hash the message
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}

/**
 * Enhanced input sanitizer with security checks.
 */
function sanitizeInput(input) {
    if (!input) return '';

    // Enhanced sanitization for usernames
    return input
        .replace(/[^a-zA-Z0-9_-]/g, '') // Only allow alphanumeric, underscore, hyphen
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .trim()
        .substring(0, 20); // Limit length
}
// --- End Hashing and Sanitization ---

/**
 * Searches RTDB for a user matching the provided username and password.
 * NEW SCHEMA: Reads from /users/[user_id] with hashed_pwd field
 */
async function findUserForLogin(username, rawPassword) {
    const usersRef = ref(database, 'users');

    const hashedPassword = await hashPassword(rawPassword);
    const sanitizedUsername = sanitizeInput(username);

    // Get all users
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) {
        return null;
    }

    const usersData = snapshot.val();
    let foundUserId = null;

    // Iterate to find matching username and password
    for (const userId in usersData) {
        const user = usersData[userId];

        // Check username, hashed_pwd, and isActive status
        if (user.username === sanitizedUsername &&
            user.hashed_pwd === hashedPassword &&
            user.isActive !== false) {

            foundUserId = userId;
            break;
        }
    }

    // If credentials match, return user object
    if (foundUserId) {
        const foundUser = usersData[foundUserId];

        return {
            uid: foundUserId,
            role: foundUser.role,
            isActive: foundUser.isActive,
            username: foundUser.username,
            year: foundUser.year || ''
        };
    }

    return null;
}

// --- Admin CRUD Operations ---

/**
 * Attaches a real-time listener to the /users node for all user records.
 * NEW SCHEMA: Uses push keys as user IDs
 * @param {function} callback - Function to execute with the user list when data changes.
 * @returns {function} An unsubscribe function to detach the listener.
 */
function onUsersChange(callback, errorCallback) {
    const usersRef = ref(database, 'users');

    // The onValue listener keeps the data synced in real-time
    const unsubscribe = onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val();
        const userList = [];

        if (usersData) {
            // Convert the object of users into an array for React state management
            // Assign push key as 'uid' field
            for (const userId in usersData) {
                userList.push({
                    uid: userId, // Firebase push key as user ID
                    ...usersData[userId]
                });
            }
        }
        // Call the callback with the new list of users
        callback(userList);
    }, (error) => {
        if (errorCallback) {
            errorCallback(error);
        }
    });

    return unsubscribe;
}

/**
 * Adds a new user record to the RTDB.
 * NEW SCHEMA: Stores at /users/[PUSH_KEY] with hashed_pwd field
 */
async function addUser(userData) {
    const { rawPassword, ...rest } = userData;
    const usersRef = ref(database, 'users');
    // Using push to generate a unique key
    const newUserId = push(usersRef).key;

    const hashedPassword = await hashPassword(rawPassword);
    const date_created = new Date().toISOString();

    // NEW SCHEMA: Use hashed_pwd instead of hashed_password
    const newUser = {
        ...rest,
        hashed_pwd: hashedPassword, // MANDATORY NEW FIELD
        username: sanitizeInput(userData.username),
        created_at: date_created,
        isActive: true
    };

    // Set the user at /users/[PUSH_KEY]
    const userRef = ref(database, `users/${newUserId}`);
    await set(userRef, newUser);

    return newUserId;
}

/**
 * Updates an existing user record in the RTDB.
 * NEW SCHEMA: Updates at /users/[user_id] with hashed_pwd field
 */
async function updateUser(uid, userData) {
    const { rawPassword, ...rest } = userData;

    // Filter out undefined values to prevent Firebase errors
    const cleanedData = {};
    Object.keys(rest).forEach(key => {
        if (rest[key] !== undefined) {
            cleanedData[key] = rest[key];
        }
    });

    const updates = {
        ...cleanedData,
        username: sanitizeInput(userData.username),
    };

    // NEW SCHEMA: Use hashed_pwd instead of hashed_password
    if (rawPassword) {
        updates.hashed_pwd = await hashPassword(rawPassword);
    }

    // Update the /users/[user_id] node
    const userRef = ref(database, `users/${uid}`);
    await update(userRef, updates);
}

/**
 * Deletes a user record from the RTDB.
 * NEW SCHEMA: Removes from /users/[user_id]
 */
async function deleteUser(uid) {
    const userRef = ref(database, `users/${uid}`);
    await remove(userRef);
}

/**
 * Toggles user active status
 * NEW SCHEMA: Updates at /users/[user_id]
 */
async function toggleUserStatus(uid, isActive) {
    const userRef = ref(database, `users/${uid}`);
    await update(userRef, { isActive: isActive });
}

export const dbUtils = {
    hashPassword,
    sanitizeInput,
    findUserForLogin,
    onUsersChange,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus
};
