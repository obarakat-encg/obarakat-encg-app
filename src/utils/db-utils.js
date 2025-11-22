import { database } from "../firebase.js";
import { ref, push, set, update, remove, get, onValue } from "firebase/database";

// SHA-256 hashing
async function hashPassword(password) {
    if (!password) return '';
    const encoded = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return [...new Uint8Array(hashBuffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function sanitizeInput(input) {
    return input
        ?.replace(/[^a-zA-Z0-9_-]/g, "")
        .trim()
        .substring(0, 20) || "";
}

async function findUserForLogin(username, rawPassword) {
    const usersRef = ref(database, "users");

    const hashedPassword = await hashPassword(rawPassword);
    const sanitizedUsername = sanitizeInput(username);

    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return null;

    const usersData = snapshot.val();

    for (const uid in usersData) {
        const user = usersData[uid];

        if (
            user.username === sanitizedUsername &&
            user.hashed_pwd === hashedPassword &&
            user.isActive !== false
        ) {
            return {
                uid,
                role: user.role,
                username: user.username,
                isActive: user.isActive,
                year: user.year || ""
            };
        }
    }

    return null;
}

async function addUser(userData) {
    const { rawPassword, ...rest } = userData;
    const usersRef = ref(database, "users");
    const newUid = push(usersRef).key;

    const hashedPassword = await hashPassword(rawPassword);

    await set(ref(database, `users/${newUid}`), {
        ...rest,
        username: sanitizeInput(rest.username),
        hashed_pwd: hashedPassword,
        isActive: true,
        created_at: new Date().toISOString()
    });

    return newUid;
}

async function updateUser(uid, userData) {
    const { rawPassword, ...rest } = userData;
    const updates = {
        ...rest,
        username: sanitizeInput(rest.username)
    };

    if (rawPassword) {
        updates.hashed_pwd = await hashPassword(rawPassword);
    }

    await update(ref(database, `users/${uid}`), updates);
}

async function deleteUser(uid) {
    await remove(ref(database, `users/${uid}`));
}

async function toggleUserStatus(uid, isActive) {
    await update(ref(database, `users/${uid}`), { isActive });
}

function onUsersChange(callback, errorCallback) {
    const usersRef = ref(database, "users");
    
    const unsubscribe = onValue(
        usersRef,
        (snapshot) => {
            if (!snapshot.exists()) {
                callback([]);
                return;
            }

            const usersData = snapshot.val();
            const usersArray = Object.keys(usersData).map(uid => ({
                uid,
                ...usersData[uid]
            }));

            callback(usersArray);
        },
        (error) => {
            if (errorCallback) {
                errorCallback(error);
            }
        }
    );

    return unsubscribe;
}

export const dbUtils = {
    hashPassword,
    sanitizeInput,
    findUserForLogin,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    onUsersChange
};
