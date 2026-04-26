import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Compass, Calendar, Bookmark, User as UserIcon, PenLine } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * MobileTabBar — fixed bottom navigation for mobile (md:hidden).
 * Shows when authenticated. Pinterest/Instagram pattern.
 */

const TABS_AUTH = [
    { to: "/dashboard", label: "Home",    icon: Home },
    { to: "/discover",  label: "Discover", icon: Compass },
    { to: "/create",    label: "Create",   icon: PenLine, primary: true },
    { to: "/events",    label: "Events",   icon: Calendar },
    { to: "/profile",   label: "Profile",  icon: UserIcon },
];

const TABS_PUBLIC = [
    { to: "/",         label: "Home",     icon: Home },
    { to: "/discover", label: "Discover", icon: Compass },
];

const MobileTabBar = () => {
    const { user } = useAuth();
    const location = useLocation();
    // Hide on the OAuth callback hash and on the public reader (immersive)
    if (location.hash?.includes("session_id=")) return null;
    if (location.pathname.startsWith("/read/")) return null;

    const tabs = user ? TABS_AUTH : TABS_PUBLIC;
    const isActive = (to) => {
        if (to === "/") return location.pathname === "/";
        return location.pathname === to || location.pathname.startsWith(to + "/");
    };

    return (
        <nav
            data-testid="mobile-tabbar"
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper border-t-2 border-ink shadow-[0_-4px_0_0_#11111120]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                {tabs.map((t) => {
                    const Icon = t.icon;
                    const active = isActive(t.to);
                    return (
                        <li key={t.to}>
                            <NavLink
                                to={t.to}
                                data-testid={`tabbar-${t.label.toLowerCase()}`}
                                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-transform active:scale-95 ${t.primary ? "" : ""}`}
                            >
                                {t.primary ? (
                                    <span className={`-mt-5 w-12 h-12 grid place-items-center border-2 border-ink rounded-full shadow-ink-sm ${active ? "bg-ink text-paper" : "bg-hotpink text-white"}`}>
                                        <Icon size={20} strokeWidth={2.5}/>
                                    </span>
                                ) : (
                                    <span className={`grid place-items-center w-9 h-9 rounded-sm border-2 ${active ? "border-ink bg-highlight text-ink" : "border-transparent text-ink/70"}`}>
                                        <Icon size={18} strokeWidth={2.5}/>
                                    </span>
                                )}
                                <span className={`font-display font-bold text-[10px] uppercase tracking-wide ${active ? "text-ink" : "text-ink/60"} ${t.primary ? "-mt-0.5" : ""}`}>
                                    {t.label}
                                </span>
                            </NavLink>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default MobileTabBar;
