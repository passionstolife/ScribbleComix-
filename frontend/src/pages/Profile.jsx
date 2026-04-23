import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { RoleBadge, TierBadge, AchievementSeal } from "../components/Badges";
import { Sparkles, Crown, Calendar, Trophy, Lock } from "lucide-react";
import { toast } from "sonner";

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

    return (
        <div className="min-h-screen" data-testid="profile-page">
            <Navbar />
            <main className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
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
                                <span className="px-2 py-1 border-2 border-ink bg-white" data-testid="stat-comics">Comics: <strong>{data.stats?.comics ?? data.stats?.public_comics ?? 0}</strong></span>
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
                                {!isUnlocked && (
                                    <div className="mt-2 flex items-center justify-center gap-1 text-xs font-display font-bold text-ink/50">
                                        <Lock size={10}/> Locked
                                    </div>
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
