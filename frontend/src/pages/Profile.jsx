import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { RoleBadge, TierBadge, AchievementSeal, MilestoneBadge, MILESTONES } from "../components/Badges";
import { Sparkles, Crown, Calendar, Trophy, Lock, Shield, Download } from "lucide-react";
import { toast } from "sonner";
import { downloadCertificate } from "../lib/certificate";
import DoodleBackground from "../components/DoodleBackground";

const Profile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const isPublic = !!userId;

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const url = isPublic ? `/profile/public/${userId}` : "/profile/me";
                const { data } = await api.get(url);
                setData(data);
            } catch (e) {
                toast.error(e?.response?.data?.detail || "Could not load profile");
                if (isPublic) navigate("/");
            } finally {
                setLoading(false);
            }
        })();
    }, [userId, isPublic, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="max-w-5xl mx-auto px-6 py-16 text-center">
                    <div className="font-heading text-4xl animate-wiggle">Loading profile…</div>
                </div>
            </div>
        );
    }
    if (!data) return null;

    const xpPct = data.xp_next_threshold && data.xp_next_threshold > data.xp_current_threshold
        ? Math.min(100, Math.round(((data.xp - data.xp_current_threshold) / (data.xp_next_threshold - data.xp_current_threshold)) * 100))
        : 100;

    const allAch = data.achievements_catalog || {};
    const unlocked = new Set(data.achievements || []);
    const comicsCount = data.stats?.comics ?? data.stats?.public_comics ?? 0;
    const nextMilestone = MILESTONES.find((m) => comicsCount < m.min);
    const roleLabel = {
        founder: "FOUNDER",
        co_founder: "CO-FOUNDER",
        promoter: "PROMOTER",
        ultimate: "ULTIMATE",
        pro: "PRO",
        free: "CREATOR",
    }[data.role || "free"] || "CREATOR";
    const titleBannerColor = {
        founder: "bg-hotpink text-white",
        co_founder: "bg-marker text-white",
        promoter: "bg-highlight text-ink",
        ultimate: "bg-highlight text-ink",
        pro: "bg-paper text-ink",
        free: "bg-white text-ink",
    }[data.role || "free"] || "bg-white text-ink";

    return (
        <div className="min-h-screen relative" data-testid="profile-page">
            <DoodleBackground variant="profile" density="medium" />
            <Navbar />
            <main className="relative z-10 max-w-6xl mx-auto px-6 lg:px-10 py-10">
                {/* BIG TITLE BANNER */}
                <div className={`border-2 border-ink shadow-ink-sm ${titleBannerColor} px-6 py-3 mb-2 flex items-center justify-between gap-4 -rotate-[0.4deg]`} data-testid="profile-title-banner">
                    <div className="flex items-center gap-3">
                        <RoleBadge role={data.role || "free"} size={34} />
                        <div className="font-display font-bold uppercase tracking-[0.25em] text-sm sm:text-base">
                            {roleLabel} <span className="opacity-60">·</span> {data.rank_title?.toUpperCase() || "SKETCH NOVICE"} <span className="opacity-60">·</span> LVL {data.level}
                        </div>
                    </div>
                    {!isPublic && (data.role === "founder" || data.role === "co_founder") && (
                        <button onClick={() => navigate('/admin')} data-testid="banner-admin-btn" className="hidden sm:inline-flex items-center gap-1 px-3 py-1 border-2 border-ink bg-white text-ink rounded-sm font-display font-bold text-xs uppercase tracking-[0.15em] hover:-translate-y-0.5 transition-transform">
                            <Shield size={12} strokeWidth={2.5}/> Admin
                        </button>
                    )}
                </div>
                <div className="squiggle-divider mb-4" aria-hidden="true" />

                {/* Hero card */}
                <div className="ink-card p-8 relative tape">
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        {data.picture ? (
                            <img src={data.picture} alt={data.name} className="w-28 h-28 rounded-full border-2 border-ink shadow-ink" />
                        ) : (
                            <div className="w-28 h-28 rounded-full bg-highlight border-2 border-ink shadow-ink grid place-items-center font-heading text-6xl">
                                {data.name?.[0] || "?"}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="font-heading text-5xl leading-none" data-testid="profile-name">{data.name}</h1>
                                <RoleBadge role={data.role || "free"} size={40} showLabel />
                            </div>
                            {!isPublic && data.email && <div className="font-body text-ink/60 text-sm mt-1">{data.email}</div>}
                            {/* Rank + XP bar */}
                            <div className="mt-4 flex items-center gap-4 flex-wrap">
                                <TierBadge tier={data.tier_color} rank={data.rank_title} size={72} />
                                <div className="flex-1 min-w-[200px]">
                                    <div className="font-display font-bold text-sm uppercase tracking-[0.15em] text-ink/70">Level {data.level} · {data.rank_title}</div>
                                    <div className="mt-2 h-4 border-2 border-ink bg-white relative overflow-hidden shadow-ink-sm">
                                        <div className="h-full bg-highlight" style={{ width: `${xpPct}%` }} data-testid="xp-progress" />
                                    </div>
                                    <div className="font-body text-xs text-ink/60 mt-1">
                                        {data.xp} XP · {data.xp_next_threshold > data.xp_current_threshold ? `${data.xp_next_threshold - data.xp} XP to next level` : "Max level — legend status unlocked!"}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex gap-2 flex-wrap text-sm font-body">
                                <span className="px-2 py-1 border-2 border-ink bg-white" data-testid="stat-comics">Comics: <strong>{comicsCount}</strong></span>
                                <span className="px-2 py-1 border-2 border-ink bg-white">Public: <strong>{data.stats?.public_comics ?? 0}</strong></span>
                                {!isPublic && (
                                    <span className="px-2 py-1 border-2 border-ink bg-highlight">Credits: <strong>{data.unlimited || data.tier === "ultimate" ? "∞" : data.credits}</strong></span>
                                )}
                                {data.unlimited && (
                                    <span className="px-2 py-1 border-2 border-ink bg-hotpink text-white font-bold inline-flex items-center gap-1" data-testid="unlimited-chip"><Crown size={14}/> Unlimited</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* TROPHY BOOKSHELF — progressive milestones */}
                <h2 className="font-heading text-4xl mt-10 mb-2 flex items-center gap-2 flex-wrap">
                    <Trophy size={28}/> Trophy Bookshelf
                    <span className="font-body text-base text-ink/60">
                        ({MILESTONES.filter((m) => comicsCount >= m.min).length}/{MILESTONES.length} unlocked)
                    </span>
                </h2>
                {nextMilestone && (
                    <div className="font-body text-sm text-ink/70 mb-4" data-testid="milestone-progress-text">
                        {nextMilestone.min - comicsCount} more comic{nextMilestone.min - comicsCount === 1 ? "" : "s"} to unlock <strong>{nextMilestone.title}</strong>.
                    </div>
                )}
                <div
                    className="relative border-2 border-ink bg-paper shadow-ink-sm p-6 pt-8 overflow-hidden"
                    data-testid="trophy-bookshelf"
                    style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 38px)" }}
                >
                    {/* shelf plank */}
                    <div className="absolute left-0 right-0 bottom-14 h-3 bg-[#C87533] border-y-2 border-ink" />
                    <div className="absolute left-0 right-0 bottom-11 h-1.5 bg-[#8B4513]/60" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 relative">
                        {MILESTONES.map((m) => {
                            const isUnlocked = comicsCount >= m.min;
                            return (
                                <div
                                    key={m.key}
                                    data-testid={`milestone-tile-${m.key}`}
                                    className={`flex flex-col items-center transition-transform ${isUnlocked ? "hover:-rotate-2 hover:-translate-y-1" : ""}`}
                                    style={{ transform: `rotate(${(m.min % 2 ? -1.2 : 1.2)}deg)` }}
                                >
                                    <MilestoneBadge milestone={m} size={96} unlocked={isUnlocked} />
                                    {isUnlocked && !isPublic ? (
                                        <button
                                            onClick={() => downloadCertificate({
                                                kind: "milestone",
                                                title: m.title,
                                                subtitle: `Awarded for creating ${m.min} or more comics on ScribbleComix.`,
                                                recipient: data.name,
                                                color: "highlight",
                                                level: data.level,
                                            })}
                                            data-testid={`milestone-cert-${m.key}`}
                                            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 border-2 border-ink bg-white text-xs font-display font-bold uppercase tracking-wide hover:-translate-y-0.5 transition-transform"
                                            title="Download printable certificate"
                                        >
                                            <Download size={10}/> Cert
                                        </button>
                                    ) : !isUnlocked ? (
                                        <div className="mt-1 inline-flex items-center gap-1 text-xs font-display font-bold text-ink/50">
                                            <Lock size={10}/> Locked
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Achievements */}
                <h2 className="font-heading text-4xl mt-10 mb-4 flex items-center gap-2"><Trophy size={28}/> Achievements <span className="font-body text-base text-ink/60">({unlocked.size}/{Object.keys(allAch).length})</span></h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" data-testid="achievements-grid">
                    {Object.entries(allAch).map(([key, a]) => {
                        const isUnlocked = unlocked.has(key);
                        return (
                            <div
                                key={key}
                                data-testid={`achievement-${key}`}
                                className={`ink-card p-4 text-center transition-all ${isUnlocked ? "hover:-rotate-2 hover:-translate-y-1" : ""}`}
                            >
                                <div className="flex justify-center">
                                    <AchievementSeal icon={a.icon} color={a.color} size={70} locked={!isUnlocked} />
                                </div>
                                <div className="mt-3 font-heading text-xl leading-none">{a.title}</div>
                                <div className="mt-1 font-body text-xs text-ink/70 min-h-[32px]">{a.desc}</div>
                                {!isUnlocked ? (
                                    <div className="mt-2 flex items-center justify-center gap-1 text-xs font-display font-bold text-ink/50">
                                        <Lock size={10}/> Locked
                                    </div>
                                ) : !isPublic && (
                                    <button
                                        onClick={() => downloadCertificate({
                                            kind: "achievement",
                                            title: a.title,
                                            subtitle: a.desc,
                                            recipient: data.name,
                                            color: a.color || "highlight",
                                            level: data.level,
                                        })}
                                        data-testid={`achievement-cert-${key}`}
                                        className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 border-2 border-ink bg-white text-xs font-display font-bold uppercase tracking-wide hover:-translate-y-0.5 transition-transform"
                                    >
                                        <Download size={10}/> Cert
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {!isPublic && (
                    <div className="mt-10 ink-card p-6">
                        <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">How to earn XP</div>
                        <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-y-1 font-body text-sm">
                            <li>✎ Sign up — <strong>10 XP</strong></li>
                            <li>✎ Create your first comic — <strong>50 XP</strong></li>
                            <li>✎ Create each subsequent comic — <strong>20 XP</strong></li>
                            <li>✎ Sketch a panel — <strong>2 XP</strong></li>
                            <li>✎ Make a comic public — <strong>10 XP</strong></li>
                            <li>✎ Buy a credit pack — <strong>50 XP</strong></li>
                            <li>✎ Subscribe to Pro — <strong>100 XP</strong></li>
                            <li>✎ Subscribe to Ultimate — <strong>250 XP</strong></li>
                        </ul>
                    </div>
                )}

                {/* Admin shortcut for founders */}
                {!isPublic && (data.role === "founder" || data.role === "co_founder") && (
                    <div className="mt-6">
                        <button data-testid="admin-link" onClick={() => navigate('/admin')} className="btn-pink inline-flex items-center gap-2">
                            <Sparkles size={16} strokeWidth={2.5}/> Open admin dashboard
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Profile;
