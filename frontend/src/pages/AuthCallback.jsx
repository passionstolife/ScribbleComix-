import React, { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const AuthCallback = () => {
    const { setUser } = useAuth();
    const processed = useRef(false);

    useEffect(() => {
        if (processed.current) return;
        processed.current = true;

        const hash = window.location.hash || "";
        const match = hash.match(/session_id=([^&]+)/);
        const sessionId = match ? match[1] : null;

        const go = async () => {
            if (!sessionId) {
                window.location.replace("/");
                return;
            }
            try {
                const { data } = await api.post("/auth/session", { session_id: sessionId });
                if (data?.session_token) {
                    localStorage.setItem("session_token", data.session_token);
                }
                setUser(data.user);
                window.location.replace("/dashboard");
            } catch (e) {
                window.location.replace("/");
            }
        };
        go();
    }, [setUser]);

    return (
        <div className="min-h-screen grid place-items-center">
            <div className="font-heading text-4xl animate-wiggle" data-testid="auth-callback-loading">Inking you in…</div>
        </div>
    );
};

export default AuthCallback;
