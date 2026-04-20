import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpenCheck, LogOut, PenLine, Sparkles, Crown, Coins } from "lucide-react";

export const Navbar = () => {
    const { user, billing, login, logout } = useAuth();
    const navigate = useNavigate();

    const tier = billing?.tier || "free";
    const credits = billing?.credits ?? 0;

    return (
        <header className="relative z-10 border-b-2 border-ink bg-paper" data-testid="app-navbar">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between gap-3">
                <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
                    <div className="w-10 h-10 bg-highlight border-2 border-ink rounded-sm grid place-items-center shadow-ink-sm group-hover:-rotate-6 transition-transform">
                        <BookOpenCheck size={20} strokeWidth={2.5} />
                    </div>
                    <span className="font-heading text-3xl leading-none pt-1">Scribble<span className="text-hotpink">Comix</span></span>
                </Link>
                <nav className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                    {user ? (
                        <>
                            <Link to="/dashboard" data-testid="nav-my-comics" className="hidden sm:inline-flex btn-ink !py-2 !px-4 text-sm">My Comics</Link>
                            <button data-testid="nav-new-comic" onClick={() => navigate('/create')} className="btn-pink !py-2 !px-4 text-sm inline-flex items-center gap-2">
                                <PenLine size={16} strokeWidth={2.5}/> New
                            </button>
                            <button
                                data-testid="nav-credits-chip"
                                onClick={() => navigate('/billing')}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-ink bg-highlight text-ink rounded-sm font-display font-bold text-sm shadow-ink-sm hover:-translate-y-0.5 transition-transform"
                                title="View plans & credits"
                            >
                                {tier === "ultimate" ? <Crown size={14} strokeWidth={2.5}/> : <Coins size={14} strokeWidth={2.5}/>}
                                {tier === "ultimate" ? "Ultimate" : (tier === "pro" ? `Pro · ${credits}` : credits)}
                            </button>
                            <div className="hidden md:flex items-center gap-2 px-2 py-1 border-2 border-ink bg-white rounded-sm shadow-ink-sm" data-testid="nav-user-chip">
                                {user.picture ? (
                                    <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full border border-ink" />
                                ) : (
                                    <div className="w-7 h-7 rounded-full bg-highlight border border-ink grid place-items-center font-bold text-xs">{user.name?.[0] || "U"}</div>
                                )}
                                <span className="font-display font-semibold text-sm max-w-[120px] truncate">{user.name}</span>
                            </div>
                            <button data-testid="nav-logout" onClick={logout} className="btn-ink !py-2 !px-3 text-sm inline-flex items-center gap-1" title="Log out">
                                <LogOut size={16} strokeWidth={2.5}/>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/#pricing" data-testid="nav-pricing" className="hidden sm:inline font-display font-bold text-sm hover:underline">Pricing</Link>
                            <button data-testid="nav-login-btn" onClick={login} className="btn-yellow inline-flex items-center gap-2">
                                <Sparkles size={16} strokeWidth={2.5} /> Sign in
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
