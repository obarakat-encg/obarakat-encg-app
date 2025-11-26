import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../utils/auth.js";

export const Context = createContext();

export function ContextProvider({children}){
    const [role, setRole] = useState(() => localStorage.getItem('encg_user_role') || null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authState, setAuthState] = useState(0); // Force re-render trigger
    const navigate = useNavigate();

    // Initialize auth service and listen to auth state changes
    useEffect(() => {
        const initAuth = async () => {
            await authService.initialize();
            setIsLoading(false);
        };

        initAuth();

        // Listen to auth state changes
        const unsubscribe = authService.onAuthStateChange((firebaseUser, userRole) => {
            setRole(userRole);
            if (firebaseUser && userRole) {
                const userData = JSON.parse(localStorage.getItem('encg_current_user') || '{}');
                setCurrentUser({
                    ...userData,
                    firebaseUid: firebaseUser.uid,
                    role: userRole,
                    lastActivity: Date.now()
                });
                
                // Update last activity timestamp
                localStorage.setItem('encg_last_activity', Date.now().toString());
            } else {
                setCurrentUser(null);
            }
            // Force re-render
            setAuthState(prev => prev + 1);
        });

        // Activity tracker - throttled to reduce localStorage writes
        let activityTimeout = null;
        const updateActivity = () => {
            if (role && !activityTimeout) {
                activityTimeout = setTimeout(() => {
                    localStorage.setItem('encg_last_activity', Date.now().toString());
                    activityTimeout = null;
                }, 30000); // Update max once per 30 seconds
            }
        };

        // Track user activity
        window.addEventListener('click', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('scroll', updateActivity, { passive: true });

        return () => {
            unsubscribe();
            if (activityTimeout) clearTimeout(activityTimeout);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('scroll', updateActivity);
        };
    }, []);

    // Handle login using the new auth service
    async function handleLogin(username, rawPassword){
        try {
            const result = await authService.loginWithCredentials(username, rawPassword);
            
            if (result.success) {
                // Immediately update local state
                const newRole = result.user.role;
                const loginTime = Date.now();
                const newUser = {
                    uid: result.user.uid,
                    username: username,
                    role: newRole,
                    isActive: result.user.isActive,
                    firebaseUid: result.firebaseUser.uid,
                    loginTime: loginTime,
                    lastActivity: loginTime
                };
                
                // Store login time for session management
                localStorage.setItem('encg_login_time', loginTime.toString());
                localStorage.setItem('encg_last_activity', loginTime.toString());
                
                setRole(newRole);
                setCurrentUser(newUser);
                setAuthState(prev => prev + 1); // Force re-render
                
                // Navigate after ensuring state is updated
                setTimeout(() => {
                    if (newRole === 'admin') {
                        navigate('/dashboard');
                    } else {
                        navigate('/');
                    }
                }, 50); // Reduced delay
                
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async function logout(){
        try {
            await authService.logout();
            navigate('/login');
        } catch (error) {
            // Force navigation even if logout fails
            navigate('/login');
        }
    }

    return(
        <Context.Provider value={{
            role, 
            handleLogin, 
            logout, 
            currentUser,
            isLoading,
            isAuthenticated: !!role,
            isAdmin: role === 'admin'
        }}>
            {children}
        </Context.Provider>
    )
}
