import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpenCheck, LogOut, PenLine, Sparkles, Crown, Coins, User as UserIcon, Shield, Compass, Bookmark, Calendar } from "lucide-react";
import { RoleBadge } from "./Badges";

export const Navbar = () => {
    const { user, billing, login, logout } = useAuth();
    const navigate = useNavigate();

    const tier = billing?.tier || "free";
    const credits = billing?.credits ?? 0;
    const role = user?.role;
    const unlimited = user?.unlimited;
    const isAdmin = role === "founder" || role === "co_founder";

    return (
        <header className="relative z-10 border-b-2 border-ink bg-paper" data-testid="app-navbar">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center justify-between gap-2">
                <Link to="/" className="flex items-center gap-2 group shrink-0" data-testid="nav-logo">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-highlight border-2 border-ink rounded-sm grid place-items-center shadow-ink-sm group-hover:-rotate-6 transition-transform">
                        <BookOpenCheck size={18} strokeWidth={2.5} />
                    </div>
                    <span className="hidden sm:inline font-heading text-3xl leading-none pt-1">Scribble<span className="text-hotpink">Comix</span></span>
                </Link>
                <nav className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto no-scrollbar justify-end">
                    {user ? (
                        <>
                            <Link to="/dashboard" data-testid="nav-my-comics" className="shrink-0 btn-ink !py-1.5 !px-3 sm:!py-2 sm:!px-4 text-xs sm:text-sm">My Comics</Link>
                            <Link to="/discover" data-testid="nav-discover" className="shrink-0 btn-ink !py-1.5 !px-2 sm:!py-2 sm:!px-3 text-xs sm:text-sm inline-flex items-center gap-1" title="Discover community comics">
                                <Compass size={14} strokeWidth={2.5}/> <span className="hidden md:inline">Discover</span>
                            </Link>
                            <Link to="/events" data-testid="nav-events" className="shrink-0 btn-ink !py-1.5 !px-2 sm:!py-2 sm:!px-3 text-xs sm:text-sm inline-flex items-center gap-1" title="Events & challenges">
                                <Calendar size={14} strokeWidth={2.5}/> <span className="hidden md:inline">Events</span>
                            </Link>
                            <Link to="/collection" data-testid="nav-collection" className="shrink-0 btn-ink !py-1.5 !px-2 sm:!py-2 sm:!px-3 text-xs sm:text-sm inline-flex items-center gap-1" title="My saved comics">
                                <Bookmark size={14} strokeWidth={2.5}/>
                            </Link>
                            <button data-testid="nav-new-comic" onClick={() => navigate('/create')} className="shrink-0 btn-pink !py-1.5 !px-3 sm:!py-2 sm:!px-4 text-xs sm:text-sm inline-flex items-center gap-1.5">
                                <PenLine size={14} strokeWidth={2.5}/> New
                            </button>
                            <button
                                data-testid="nav-credits-chip"
                                onClick={() => navigate('/billing')}
                                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 border-2 border-ink bg-highlight text-ink rounded-sm font-display font-bold text-xs sm:text-sm shadow-ink-sm hover:-translate-y-0.5 transition-transform"
                                title="View plans & credits"
                            >
                                {unlimited ? <Crown size={13} strokeWidth={2.5}/> : (tier === "ultimate" ? <Crown size={13} strokeWidth={2.5}/> : <Coins size={13} strokeWidth={2.5}/>)}
                                {unlimited ? "∞" : (tier === "ultimate" ? "Ultimate" : (tier === "pro" ? `Pro · ${credits}` : credits))}
                            </button>
                            {isAdmin && (
                                <button
                                    data-testid="nav-admin"
                                    onClick={() => navigate('/admin')}
                                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 border-2 border-ink bg-hotpink text-white rounded-sm font-display font-bold uppercase text-xs tracking-[0.15em] shadow-ink-sm hover:-translate-y-0.5 hover:-rotate-1 transition-transform"
                                    title="Admin dashboard"
                                >
                                    <Shield size={13} strokeWidth={2.5}/> <span className="hidden sm:inline">Admin</span>
                                </button>
                            )}
                            <button
                                data-testid="nav-profile"
                                onClick={() => navigate('/profile')}
                                className="shrink-0 flex items-center gap-1.5 px-1.5 py-1 sm:px-2 sm:py-1 border-2 border-ink bg-white rounded-sm shadow-ink-sm hover:-translate-y-0.5 transition-transform"
                                title="Your profile"
                            >
                                {user.picture ? (
                                    <img src={user.picture} alt={user.name} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-ink" />
                                ) : (
                                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-highlight border border-ink grid place-items-center font-bold text-xs">{user.name?.[0] || "U"}</div>
                                )}
                                <span className="hidden lg:inline font-display font-semibold text-sm max-w-[120px] truncate">{user.name}</span>
                                {role && role !== "free" && <RoleBadge role={role} size={20} />}
                            </button>
                            <button data-testid="nav-logout" onClick={logout} className="shrink-0 btn-ink !py-1.5 !px-2 sm:!py-2 sm:!px-3 text-xs sm:text-sm inline-flex items-center gap-1" title="Log out">
                                <LogOut size={14} strokeWidth={2.5}/>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/discover" data-testid="nav-discover-public" className="shrink-0 inline-flex items-center gap-1 font-display font-bold text-sm hover:underline">
                                <Compass size={14} strokeWidth={2.5}/> <span className="hidden md:inline">Discover</span>
                            </Link>
                            <Link to="/#pricing" data-testid="nav-pricing" className="shrink-0 hidden sm:inline font-display font-bold text-sm hover:underline">Pricing</Link>
                            <button data-testid="nav-login-btn" onClick={login} className="shrink-0 btn-yellow !py-1.5 !px-3 sm:!py-2 sm:!px-4 text-xs sm:text-sm inline-flex items-center gap-1.5">
                                <Sparkles size={14} strokeWidth={2.5} /> Sign in
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
};

export default Navbar;
