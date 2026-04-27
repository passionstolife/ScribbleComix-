import React, { useEffect, useState } from "react";
import { Crown, Sparkles, X, ArrowUp } from "lucide-react";
import { cannonConfetti, burstConfetti } from "../lib/confetti";

/**
 * LevelUpPopup — global listener for "scribblecomix:levelup" events.
 * Fires confetti + shows celebration overlay whenever the user's level increases.
 */
const LevelUpPopup = () => {
    const [data, setData] = useState(null); // { from, to, rank }

    useEffect(() => {
        const handler = (e) => {
            const detail = e.detail || {};
            setData(detail);
            // Multi-stage confetti: cannons + sparkle burst
            cannonConfetti("celebration");
            setTimeout(() => burstConfetti({ theme: "stars", count: 80, power: 14 }), 400);
        };
        window.addEventListener("scribblecomix:levelup", handler);
        return () => window.removeEventListener("scribblecomix:levelup", handler);
    }, []);

    if (!data) return null;

    return (
        <div className="fixed inset-0 z-[9998] grid place-items-center pointer-events-none" data-testid="level-up-popup">
            <style>{`
                @keyframes lvlup-pop {
                    0%   { transform: scale(0.4) rotate(-12deg); opacity: 0; }
                    55%  { transform: scale(1.12) rotate(2deg); opacity: 1; }
                    80%  { transform: scale(0.96) rotate(-1deg); }
                    100% { transform: scale(1) rotate(-1.5deg); }
                }
                @keyframes lvlup-shine {
                    0%   { transform: translateX(-200%); }
                    100% { transform: translateX(200%); }
                }
                @keyframes lvlup-bounce {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-6px); }
                }
            `}</style>
            <div
                className="relative pointer-events-auto bg-paper border-[3px] border-ink shadow-[12px_12px_0_0_#111] px-8 py-7 max-w-md w-[92%] tape overflow-hidden"
                style={{ animation: "lvlup-pop 0.6s cubic-bezier(.2,.9,.3,1.3) forwards" }}
            >
                {/* shine sweep */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: "linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.7) 50%, transparent 75%)",
                        animation: "lvlup-shine 1.6s ease-out 0.4s forwards",
                    }}
                />
                <button
                    onClick={() => setData(null)}
                    data-testid="lvlup-close"
                    className="absolute top-2 right-2 btn-ink !p-1.5 z-10"
                >
                    <X size={12}/>
                </button>
                <div className="text-center relative z-10">
                    <div className="font-display uppercase tracking-[0.3em] text-xs font-bold text-ink/60">Level up!</div>
                    <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 border-2 border-ink bg-hotpink text-white font-display font-bold uppercase tracking-[0.15em] text-xs">
                        <ArrowUp size={12} strokeWidth={3}/> Lvl {data.from} → {data.to}
                    </div>
                    <h2 className="font-heading text-6xl leading-none mt-3" style={{ animation: "lvlup-bounce 1.2s ease-in-out infinite" }}>
                        Level {data.to}!
                    </h2>
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 border-2 border-ink bg-highlight font-display font-bold text-sm">
                        <Crown size={14} strokeWidth={2.5}/>
                        <span>Now ranked: <span className="uppercase tracking-wide">{data.rank || "Sketcher"}</span></span>
                    </div>
                    <p className="mt-3 font-body text-sm text-ink/70">Keep doodling — more achievements await on your bookshelf.</p>
                    <button
                        onClick={() => setData(null)}
                        data-testid="lvlup-continue"
                        className="mt-4 btn-pink inline-flex items-center gap-2"
                    >
                        <Sparkles size={14} strokeWidth={2.5}/> Keep going
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LevelUpPopup;
