import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [billing, setBilling] = useState(null); // {credits, tier, tier_expires_at}
    const [loading, setLoading] = useState(true);

    const fetchBilling = useCallback(async () => {
        try {
            const { data } = await api.get("/billing/me");
            setBilling(data);
        } catch (e) { /* ignore */ }
    }, []);

    const checkAuth = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
            try {
                const bill = await api.get("/billing/me");
                setBilling(bill.data);
            } catch (e) { /* ignore */ }
        } catch (e) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // CRITICAL: If returning from OAuth callback, skip the /me check.
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        if (window.location.hash?.includes("session_id=")) {
            setLoading(false);
            return;
        }
        checkAuth();
    }, [checkAuth]);

    const login = () => {
        // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
        const redirectUrl = window.location.origin + "/dashboard";
        window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (e) { /* ignore */ }
        localStorage.removeItem("session_token");
        setUser(null);
        setBilling(null);
        window.location.href = "/";
    };

    return (
        <AuthContext.Provider value={{ user, setUser, billing, fetchBilling, loading, login, logout, refresh: checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
