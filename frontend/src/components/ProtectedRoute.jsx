import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="font-heading text-4xl animate-wiggle">Loading…</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/" replace />;
    return children;
};

export default ProtectedRoute;
