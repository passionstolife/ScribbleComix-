import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { Crown, Sparkles, Zap, Infinity as InfinityIcon, FileDown, PaintBucket, Loader2, Ticket, X, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import WalkingDoodle from "../components/WalkingDoodle";

const perksPro = [
    { icon: PaintBucket, label: "Character consistency across panels" },
    { icon: Zap, label: "Priority generation queue" },
    { icon: Sparkles, label: "300 credits every month" },
];
const perksUltimate = [
    { icon: InfinityIcon, label: "Unlimited sketch generation" },
    { icon: FileDown, label: "PDF export" },
    { icon: PaintBucket, label: "Character consistency" },
    { icon: Zap, label: "Priority + everything in Pro" },
];

const Billing = () => {
    const { user } = useAuth();
    const [packages, setPackages] = useState([]);
    const [me, setMe] = useState(null);
    const [loadingId, setLoadingId] = useState(null);
    const [promo, setPromo] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [subConfig, setSubConfig] = useState({ recurring_enabled: false });
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [pkgs, bill, cfg] = await Promise.all([
                    api.get("/billing/packages"),
                    api.get("/billing/me"),
                    api.get("/billing/subscriptions-config"),
                ]);
                setPackages(pkgs.data.packages);
                setMe(bill.data);
                setSubConfig(cfg.data);
            } catch (e) {
                toast.error("Couldn't load plans");
            }
        })();
    }, []);

    const buy = async (pkg) => {
        setLoadingId(pkg.id);
        try {
            // If true subscription mode is configured and this is a tier package, use recurring subscription endpoint.
            if (pkg.kind === "tier" && subConfig.recurring_enabled) {
                const { data } = await api.post("/billing/subscribe", {
                    tier: pkg.tier,
                    origin_url: window.location.origin,
                });
                window.location.href = data.url;
                return;
            }
            const payload = {
                package_id: pkg.id,
                origin_url: window.location.origin,
            };
            if (appliedPromo) payload.promo_code = appliedPromo;
            const { data } = await api.post("/billing/checkout", payload);
            window.location.href = data.url;
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Checkout failed");
            setLoadingId(null);
        }
    };

    const openPortal = async () => {
        setPortalLoading(true);
        try {
            const { data } = await api.post("/billing/portal", { return_url: window.location.origin + "/billing" });
            window.location.href = data.url;
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Couldn't open portal");
            setPortalLoading(false);
        }
    };

    const applyPromo = () => {
        const code = promo.trim().toUpperCase();
        if (!code) return;
        if (code === "INK50") {
            setAppliedPromo("INK50");
            toast.success("INK50 applied — 50% off first Pro month!");
        } else {
            toast.error("That code isn't valid");
        }
    };

    const credits = me?.credits ?? user?.credits ?? 0;
    const tier = me?.tier || "free";

    const packs = packages.filter(p => p.kind === "credits");
    const subs = packages.filter(p => p.kind === "tier");

    return (
        <div className="min-h-screen relative overflow-x-hidden" data-testid="billing-page">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
                <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">Plans & credits</div>
                        <h1 className="font-heading text-6xl leading-none mt-1">Inkwell refill.</h1>
                        <p className="font-body text-ink/70 mt-3 max-w-xl">Buy credit packs for pay-as-you-go, or subscribe for perks. Every new account gets 20 free credits.</p>
                    </div>
                    <div className="ink-card p-5 min-w-[240px]" data-testid="billing-status-card">
                        <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Your balance</div>
                        <div className="font-heading text-5xl mt-1" data-testid="credits-count">{tier === "ultimate" ? "∞" : credits}</div>
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 border-2 border-ink bg-highlight font-display font-bold text-xs uppercase" data-testid="tier-label">
                            {tier === "ultimate" && <Crown size={12} />}<span>{tier}</span>
                        </div>
                        {me?.tier_expires_at && tier !== "free" && (
                            <div className="mt-2 text-xs font-body text-ink/60">Renews/expires {new Date(me.tier_expires_at).toLocaleDateString()}</div>
                        )}
                        {subConfig.recurring_enabled && tier !== "free" && (
                            <button
                                data-testid="manage-subscription-btn"
                                onClick={openPortal}
                                disabled={portalLoading}
                                className="mt-3 w-full btn-ink !py-1.5 !px-3 text-xs inline-flex items-center justify-center gap-1"
                            >
                                {portalLoading ? <Loader2 className="animate-spin" size={12}/> : <Settings size={12}/>} Manage subscription
                            </button>
                        )}
                    </div>
                </div>

                {/* Subscriptions — with walking doodle towards Ultimate */}
                <div className="relative">
                    <h2 className="font-heading text-4xl mb-4">Subscriptions</h2>
                    <div className="grid md:grid-cols-2 gap-6 mb-4 relative">
                        {subs.map((p) => {
                            const isUltimate = p.tier === "ultimate";
                            return (
                                <div
                                    key={p.id}
                                    data-testid={`sub-${p.id}`}
                                    className={`ink-card p-6 relative ${isUltimate ? "bg-highlight/40 best-plan-card" : ""}`}
                                    style={{ transform: `rotate(${isUltimate ? -0.6 : 0.6}deg)` }}
                                >
                                    {isUltimate && (
                                        <>
                                            <div className="absolute -top-3 -right-3 bg-hotpink text-white border-2 border-ink px-3 py-1 font-heading text-xl -rotate-[6deg] shadow-ink-sm">Best value!</div>
                                            <div className="ultimate-lift-marks" aria-hidden>⬆ ⬆ ⬆</div>
                                        </>
                                    )}
                                    <div className="flex items-center gap-2 mb-1">
                                        {isUltimate ? <Crown size={22} strokeWidth={2.5} /> : <Sparkles size={22} strokeWidth={2.5} />}
                                        <span className="font-display font-bold uppercase tracking-[0.2em] text-xs">{isUltimate ? "Ultimate" : "Pro"}</span>
                                    </div>
                                    <div className="font-heading text-4xl">{p.label}</div>
                                    <div className="mt-2 flex items-baseline gap-2">
                                        {appliedPromo === "INK50" && p.id === "sub_pro" ? (
                                            <>
                                                <span className="font-heading text-6xl text-hotpink">${(p.amount / 2).toFixed(2)}</span>
                                                <span className="font-body text-ink/60 line-through">${p.amount.toFixed(2)}</span>
                                                <span className="font-body text-ink/60">/ 1st month</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-heading text-6xl">${p.amount}</span>
                                                <span className="font-body text-ink/60">/ month</span>
                                            </>
                                        )}
                                    </div>
                                    <ul className="mt-4 space-y-2 font-body">
                                        {(isUltimate ? perksUltimate : perksPro).map((perk, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <perk.icon size={16} strokeWidth={2.5} /> {perk.label}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        data-testid={`buy-${p.id}`}
                                        onClick={() => buy(p)}
                                        disabled={loadingId === p.id}
                                        className={`mt-6 w-full inline-flex items-center justify-center gap-2 ${isUltimate ? "btn-pink" : "btn-blue"}`}
                                    >
                                        {loadingId === p.id ? <><Loader2 className="animate-spin" size={16}/> Redirecting…</> : <>Subscribe to {isUltimate ? "Ultimate" : "Pro"}</>}
                                    </button>
                                    <div className="mt-3 text-xs text-ink/60 font-body">Cheaper than the competition. 30-day access, renew anytime.</div>
                                </div>
                            );
                        })}
                    </div>
                    {/* The walking doodle — absolutely positioned, walks across then raises the trophy */}
                    <WalkingDoodle />
                </div>

                {/* Promo code row */}
                <div className="mt-2 mb-10 flex items-center gap-3 flex-wrap" data-testid="promo-row">
                    <Ticket size={18} strokeWidth={2.5}/>
                    <span className="font-display font-bold text-sm">Got a promo code?</span>
                    {appliedPromo ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 border-2 border-ink bg-highlight font-display font-bold text-sm">
                            {appliedPromo} ✓
                            <button data-testid="promo-remove" onClick={() => { setAppliedPromo(null); setPromo(""); }} className="hover:text-hotpink"><X size={14}/></button>
                        </span>
                    ) : (
                        <>
                            <input
                                data-testid="promo-input"
                                value={promo}
                                onChange={(e) => setPromo(e.target.value)}
                                placeholder="e.g. INK50"
                                className="border-2 border-ink bg-white px-3 py-1 font-display font-bold text-sm uppercase tracking-wider w-40"
                            />
                            <button data-testid="promo-apply" onClick={applyPromo} className="btn-ink !py-1.5 !px-3 text-sm">Apply</button>
                            <span className="font-body text-xs text-ink/60">Try <strong>INK50</strong> for 50% off your first Pro month.</span>
                        </>
                    )}
                </div>

                {/* Credit packs */}
                <h2 className="font-heading text-4xl mb-4">Credit packs <span className="text-ink/50 text-xl font-body">one-time</span></h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {packs.map((p, idx) => (
                        <div key={p.id} data-testid={`pack-${p.id}`} className="ink-card p-6" style={{ transform: `rotate(${[-0.4, 0.4, -0.2][idx] || 0}deg)` }}>
                            <div className="font-display font-bold uppercase tracking-[0.2em] text-xs">{p.label}</div>
                            <div className="font-heading text-5xl mt-2">${p.amount}</div>
                            <div className="mt-1 font-body">{p.credits} credits · ${(p.amount / p.credits).toFixed(3)}/credit</div>
                            <button
                                data-testid={`buy-${p.id}`}
                                onClick={() => buy(p)}
                                disabled={loadingId === p.id}
                                className="btn-yellow w-full mt-5 inline-flex items-center justify-center gap-2"
                            >
                                {loadingId === p.id ? <><Loader2 className="animate-spin" size={16}/> Redirecting…</> : <>Buy {p.credits} credits</>}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-16 ink-card p-6">
                    <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70 mb-2">FAQ</div>
                    <details className="py-2 border-b border-ink/10"><summary className="font-display font-bold cursor-pointer">How do credits work?</summary><p className="mt-2 font-body text-ink/80">Each sketch panel uses 1 credit. Story generation is free. Ultimate subscribers get unlimited sketches.</p></details>
                    <details className="py-2 border-b border-ink/10"><summary className="font-display font-bold cursor-pointer">Do credits expire?</summary><p className="mt-2 font-body text-ink/80">Nope — purchased credits stick around until you use them.</p></details>
                    <details className="py-2"><summary className="font-display font-bold cursor-pointer">Can I cancel a subscription?</summary><p className="mt-2 font-body text-ink/80">Subscriptions give 30 days of access per purchase. If you don't renew, you drop back to Free at the end of the 30-day period — no surprise charges.</p></details>
                </div>
            </main>
        </div>
    );
};

export default Billing;
