import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, login as apiLogin, loginWithGoogle as apiLoginWithGoogle, logout as apiLogout, updateUserProfile as apiUpdateUserProfile } from '../api/client';
import { clearSession, getStoredTokens, getStoredUser, saveSession } from '../storage/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const restoreSession = useCallback(async () => {
        const tokens = await getStoredTokens();
        if (!tokens) {
            setUser(null);
            return null;
        }

        const storedUser = await getStoredUser();
        setUser(storedUser);

        try {
            const profile = await fetchCurrentUser();
            setUser(profile.user);
            const latestTokens = await getStoredTokens();
            if (latestTokens) {
                await saveSession({ ...latestTokens, user: profile.user });
            }
            return profile.user;
        } catch (err) {
            await clearSession();
            setUser(null);
            return null;
        }
    }, []);

    useEffect(() => {
        restoreSession().finally(() => setIsLoading(false));
    }, [restoreSession]);

    const login = useCallback(async (username, password) => {
        const result = await apiLogin(username, password);
        setUser(result.user);
        return result;
    }, []);

    const loginWithGoogle = useCallback(async (payload) => {
        const result = await apiLoginWithGoogle(payload);
        setUser(result.user);
        return result;
    }, []);

    const logout = useCallback(async () => {
        await apiLogout();
        setUser(null);
    }, []);

    const updateProfile = useCallback(async (data) => {
        if (!user?.id) {
            throw new Error('Not signed in');
        }
        const result = await apiUpdateUserProfile(user.id, data);
        setUser(result.user);
        const tokens = await getStoredTokens();
        if (tokens) {
            await saveSession({ ...tokens, user: result.user });
        }
        return result.user;
    }, [user?.id]);

    const value = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        refreshUser: restoreSession,
    }), [user, isLoading, login, loginWithGoogle, logout, updateProfile, restoreSession]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
