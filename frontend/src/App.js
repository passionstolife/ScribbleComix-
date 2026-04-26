import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Creator from "./pages/Creator";
import Reader from "./pages/Reader";
import Billing from "./pages/Billing";
import BillingSuccess from "./pages/BillingSuccess";
import PublicReader from "./pages/PublicReader";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Discover from "./pages/Discover";
import Collection from "./pages/Collection";
import Events from "./pages/Events";
import ProtectedRoute from "./components/ProtectedRoute";
import MobileTabBar from "./components/MobileTabBar";

const AppRouter = () => {
    const location = useLocation();
    // Handle session_id from OAuth redirect before any normal routing.
    if (location.hash?.includes("session_id=")) {
        return <AuthCallback />;
    }
    return (
        <>
            <div className="has-mobile-tabbar">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/create" element={<ProtectedRoute><Creator /></ProtectedRoute>} />
                    <Route path="/create/:id" element={<ProtectedRoute><Creator /></ProtectedRoute>} />
                    <Route path="/comic/:id" element={<ProtectedRoute><Reader /></ProtectedRoute>} />
                    <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                    <Route path="/billing/success" element={<ProtectedRoute><BillingSuccess /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/profile/:userId" element={<Profile />} />
                    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                    <Route path="/discover" element={<Discover />} />
                    <Route path="/collection" element={<ProtectedRoute><Collection /></ProtectedRoute>} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/events/:eventId" element={<Events />} />
                    <Route path="/read/:shareId" element={<PublicReader />} />
                    <Route path="*" element={<Landing />} />
                </Routes>
            </div>
            <MobileTabBar />
        </>
    );
};

function App() {
    return (
        <div className="App">
            <AuthProvider>
                <BrowserRouter>
                    <AppRouter />
                    <Toaster position="top-center" richColors closeButton />
                </BrowserRouter>
            </AuthProvider>
        </div>
    );
}

export default App;
