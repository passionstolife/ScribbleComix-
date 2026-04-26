import React, { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, SkipForward, Volume2, VolumeX, X, Crown, Sparkles, Music, Wand2 } from "lucide-react";
import { MOODS, createAmbientEngine } from "../lib/ambientMusic";

// Tier -> free seconds of cinematic preview
const TIER_LIMITS = {
    free: 5,       // 5-second experimental preview
    pro: 30,       // 30 seconds
    ultimate: Infinity,
};

const EFFECTS = [
    { key: "ken_burns", label: "Ken Burns", emoji: "🎞️" },
    { key: "zoom_punch", label: "Zoom Punch", emoji: "💥" },
    { key: "shake", label: "Shake", emoji: "🫨" },
    { key: "ink_reveal", label: "Ink Reveal", emoji: "✍️" },
    { key: "drift", label: "Drift", emoji: "🪁" },
    { key: "fade", label: "Fade", emoji: "🌫️" },
];

// CSS-only effect classes (defined at bottom of this file via injected <style>)
const effectClass = (key) => `cinematic-fx-${key}`;

const CinematicReader = ({ comic, tier = "free", unlimited = false, onClose, onUpsell }) => {
    const limit = unlimited ? Infinity : (TIER_LIMITS[tier] ?? TIER_LIMITS.free);
    const [step, setStep] = useState(-1); // -1 = setup, 0..n-1 = panel index, n = done
    const [mood, setMood] = useState("adventure");
    const [effect, setEffect] = useState("ken_burns");
    const [voiceIdx, setVoiceIdx] = useState(0);
    const [muted, setMuted] = useState(false);
    const [paused, setPaused] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [showUpsell, setShowUpsell] = useState(false);
    const engineRef = useRef(null);
    const startTsRef = useRef(0);
    const tickTimerRef = useRef(null);
    const utterRef = useRef(null);
    const advanceTimerRef = useRef(null);
    const panelRefs = useRef([]);

    const voices = useMemo(() => {
        if (typeof window === "undefined" || !window.speechSynthesis) return [];
        return window.speechSynthesis.getVoices?.() || [];
    }, []);
    // Browsers load voices async; re-read after 500ms
    const [voicesReady, setVoicesReady] = useState(voices.length > 0);
    useEffect(() => {
        if (voicesReady) return;
        const handler = () => setVoicesReady(true);
        window.speechSynthesis?.addEventListener?.("voiceschanged", handler);
        const t = setTimeout(() => setVoicesReady(true), 800);
        return () => {
            clearTimeout(t);
            window.speechSynthesis?.removeEventListener?.("voiceschanged", handler);
        };
    }, [voicesReady]);
    const availableVoices = voicesReady && window.speechSynthesis
        ? (window.speechSynthesis.getVoices().filter((v) => v.lang?.startsWith("en")) || [])
        : [];

    const cleanup = () => {
        if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null; }
        if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
        try { window.speechSynthesis?.cancel(); } catch (_e) { /* ignore */ }
        if (engineRef.current) { engineRef.current.stop(); engineRef.current = null; }
    };

    useEffect(() => () => cleanup(), []);

    const speak = (text, onEnd) => {
        if (!text || !window.speechSynthesis) { onEnd?.(); return; }
        try {
            const u = new SpeechSynthesisUtterance(text);
            const v = availableVoices[voiceIdx];
            if (v) u.voice = v;
            u.rate = 1.0; u.pitch = 1.0;
            u.onend = () => onEnd?.();
            u.onerror = () => onEnd?.();
            utterRef.current = u;
            window.speechSynthesis.speak(u);
        } catch (_e) { onEnd?.(); }
    };

    const advanceToPanel = (idx) => {
        if (!comic || idx >= comic.panels.length) {
            setStep(comic?.panels?.length || 0);
            cleanup();
            return;
        }
        setStep(idx);
        // scroll panel into view
        setTimeout(() => {
            const el = panelRefs.current[idx];
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
        const p = comic.panels[idx];
        const text = [p.caption, p.dialogue].filter(Boolean).join(". ");
        if (text) {
            speak(text, () => {
                advanceTimerRef.current = setTimeout(() => advanceToPanel(idx + 1), 900);
            });
        } else {
            advanceTimerRef.current = setTimeout(() => advanceToPanel(idx + 1), 2800);
        }
    };

    const startCinematic = async () => {
        // mood engine
        engineRef.current = createAmbientEngine(mood);
        engineRef.current.setVolume(muted ? 0 : 0.18);
        await engineRef.current.start();
        startTsRef.current = Date.now();
        setElapsed(0);
        tickTimerRef.current = setInterval(() => {
            const e = (Date.now() - startTsRef.current) / 1000;
            setElapsed(e);
            if (e >= limit && limit !== Infinity) {
                // paywall
                cleanup();
                setShowUpsell(true);
            }
        }, 250);
        advanceToPanel(0);
    };

    const togglePause = () => {
        if (!paused) {
            try { window.speechSynthesis?.pause(); } catch (_e) { /* ignore */ }
            engineRef.current?.setVolume(0);
            if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
        } else {
            try { window.speechSynthesis?.resume(); } catch (_e) { /* ignore */ }
            engineRef.current?.setVolume(muted ? 0 : 0.18);
        }
        setPaused((p) => !p);
    };

    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        engineRef.current?.setVolume(next ? 0 : 0.18);
    };

    const close = () => {
        cleanup();
        onClose?.();
    };

    // Setup screen
    if (step === -1) {
        return (
            <div className="fixed inset-0 z-[100] bg-ink/85 backdrop-blur-sm grid place-items-center p-4" data-testid="cinematic-setup">
                <CinematicStyles />
                <div className="ink-card max-w-2xl w-full p-6 sm:p-8 bg-paper max-h-[90vh] overflow-y-auto">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">New feature</div>
                            <h2 className="font-heading text-4xl sm:text-5xl leading-none">Cinematic Read Mode</h2>
                            <p className="font-body text-ink/70 mt-2 text-sm">Narrator + mood music + panel animations. Scrolls automatically.</p>
                        </div>
                        <button onClick={close} className="btn-ink !p-2 !py-2" data-testid="cinematic-close"><X size={16}/></button>
                    </div>
                    <div className="mb-4">
                        <div className="font-display uppercase text-xs tracking-[0.2em] font-bold flex items-center gap-1.5"><Music size={14}/> Background Mood</div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {MOODS.map((m) => (
                                <button
                                    key={m.key}
                                    onClick={() => setMood(m.key)}
                                    data-testid={`mood-${m.key}`}
                                    className={`border-2 border-ink px-2 py-2 font-display font-bold text-xs uppercase tracking-wide flex flex-col items-center gap-0.5 ${mood === m.key ? "bg-highlight shadow-ink-sm" : "bg-white hover:-translate-y-0.5"} transition-transform`}
                                >
                                    <span className="text-xl leading-none">{m.emoji}</span>
                                    <span>{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="mb-4">
                        <div className="font-display uppercase text-xs tracking-[0.2em] font-bold flex items-center gap-1.5"><Wand2 size={14}/> Panel Effect</div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {EFFECTS.map((e) => (
                                <button
                                    key={e.key}
                                    onClick={() => setEffect(e.key)}
                                    data-testid={`effect-${e.key}`}
                                    className={`border-2 border-ink px-2 py-2 font-display font-bold text-xs uppercase tracking-wide flex flex-col items-center gap-0.5 ${effect === e.key ? "bg-hotpink text-white shadow-ink-sm" : "bg-white hover:-translate-y-0.5"} transition-transform`}
                                >
                                    <span className="text-xl leading-none">{e.emoji}</span>
                                    <span>{e.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    {availableVoices.length > 0 && (
                        <div className="mb-4">
                            <div className="font-display uppercase text-xs tracking-[0.2em] font-bold flex items-center gap-1.5"><Sparkles size={14}/> Narrator Voice</div>
                            <select
                                value={voiceIdx}
                                onChange={(e) => setVoiceIdx(parseInt(e.target.value, 10))}
                                data-testid="voice-select"
                                className="mt-2 w-full border-2 border-ink px-3 py-2 font-body bg-white shadow-ink-sm"
                            >
                                {availableVoices.map((v, i) => (
                                    <option key={i} value={i}>{v.name} ({v.lang})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {!unlimited && tier !== "ultimate" && (
                        <div className="border-2 border-ink bg-highlight px-3 py-2 mb-4 text-sm font-body" data-testid="tier-gate-notice">
                            <strong>{tier === "pro" ? "Pro tier" : "Free tier"}:</strong> {limit}-second preview. Upgrade to Ultimate for unlimited cinematic reads.
                        </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={startCinematic}
                            data-testid="cinematic-start"
                            className="btn-pink inline-flex items-center gap-2"
                        >
                            <Play size={16} strokeWidth={2.5}/> Start cinematic read
                        </button>
                        <button onClick={close} className="btn-ink" data-testid="cinematic-cancel">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    // Playback view
    const remaining = limit === Infinity ? "∞" : Math.max(0, Math.ceil(limit - elapsed));
    const isActive = (i) => i === step;

    return (
        <div className="fixed inset-0 z-[100] bg-ink/95" data-testid="cinematic-playing">
            <CinematicStyles />
            {/* Top bar */}
            <div className="fixed top-0 left-0 right-0 z-[101] bg-paper border-b-2 border-ink px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-display uppercase text-xs font-bold tracking-[0.2em] hidden sm:inline">Cinematic</span>
                    <span className="px-2 py-0.5 border-2 border-ink bg-highlight font-body text-xs font-bold">Panel {Math.min(step + 1, comic.panels.length)}/{comic.panels.length}</span>
                    {limit !== Infinity && (
                        <span className="px-2 py-0.5 border-2 border-ink bg-white font-body text-xs" data-testid="cinematic-timer">{remaining}s left</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="btn-ink !py-1.5 !px-2" data-testid="cinematic-mute" title={muted ? "Unmute" : "Mute"}>
                        {muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
                    </button>
                    <button onClick={togglePause} className="btn-ink !py-1.5 !px-2" data-testid="cinematic-pause">
                        {paused ? <Play size={14}/> : <Pause size={14}/>}
                    </button>
                    <button onClick={() => advanceToPanel(step + 1)} className="btn-ink !py-1.5 !px-2" data-testid="cinematic-next">
                        <SkipForward size={14}/>
                    </button>
                    <button onClick={close} className="btn-ink !py-1.5 !px-2" data-testid="cinematic-exit"><X size={14}/></button>
                </div>
            </div>

            <div className="pt-16 pb-20 px-4 sm:px-8 overflow-y-auto h-full">
                <div className="max-w-3xl mx-auto space-y-10">
                    <div className="text-center text-paper">
                        <h1 className="font-heading text-5xl sm:text-6xl">{comic.title}</h1>
                        {comic.synopsis && <p className="font-body text-paper/70 mt-2 max-w-xl mx-auto">{comic.synopsis}</p>}
                    </div>
                    {comic.panels.map((p, i) => (
                        <div
                            key={p.id || i}
                            ref={(el) => (panelRefs.current[i] = el)}
                            data-testid={`cinematic-panel-${i}`}
                            className={`border-2 border-paper bg-paper overflow-hidden shadow-[8px_8px_0_0_#FDFBF7] transition-all duration-700 ${isActive(i) ? effectClass(effect) + " ring-4 ring-highlight" : "opacity-40 scale-95"}`}
                        >
                            <div className="aspect-[4/3] overflow-hidden relative grid place-items-center bg-white">
                                {p.image_base64 ? (
                                    <img src={p.image_base64} alt={`Panel ${i+1}`} className="w-full h-full object-cover cinematic-img" />
                                ) : (
                                    <div className="font-hand text-ink/40">(no sketch)</div>
                                )}
                                {p.dialogue && (
                                    <div className="absolute top-3 left-3 max-w-[70%] bg-white border-2 border-ink px-3 py-1.5 font-hand text-base shadow-ink-sm">{p.dialogue}</div>
                                )}
                            </div>
                            {p.caption && <div className="px-4 py-3 font-hand text-base border-t-2 border-ink bg-highlight">{p.caption}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {showUpsell && (
                <div className="fixed inset-0 z-[110] bg-ink/80 grid place-items-center p-4" data-testid="cinematic-upsell">
                    <div className="ink-card max-w-md w-full p-6 bg-paper">
                        <div className="flex items-center gap-2 mb-2"><Crown size={20} className="text-hotpink"/><span className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Preview ended</span></div>
                        <h3 className="font-heading text-4xl leading-none">Go Ultimate for the full ride.</h3>
                        <p className="font-body text-ink/70 mt-2 text-sm">Free gets a {TIER_LIMITS.free}s taste. Pro unlocks {TIER_LIMITS.pro}s. Ultimate = unlimited cinematic reads, narration, music, and effects across every comic.</p>
                        <div className="mt-4 flex gap-2 flex-wrap">
                            <button onClick={() => { onUpsell?.(); close(); }} data-testid="cinematic-upgrade" className="btn-pink inline-flex items-center gap-2"><Crown size={14}/> Upgrade</button>
                            <button onClick={close} data-testid="cinematic-upsell-close" className="btn-ink">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Style block — all cinematic effects as CSS keyframes.
const CinematicStyles = () => (
    <style>{`
        @keyframes cinematic-fx-ken-burns-kf {
            0% { transform: scale(1.0) translate(0,0); }
            100% { transform: scale(1.12) translate(-2%, -2%); }
        }
        .cinematic-fx-ken_burns .cinematic-img {
            animation: cinematic-fx-ken-burns-kf 6s ease-out forwards;
        }
        @keyframes cinematic-fx-zoom-punch-kf {
            0% { transform: scale(0.6); opacity: 0; }
            40% { transform: scale(1.18); opacity: 1; }
            70% { transform: scale(0.97); }
            100% { transform: scale(1); }
        }
        .cinematic-fx-zoom_punch .cinematic-img {
            animation: cinematic-fx-zoom-punch-kf 1s cubic-bezier(.2,.9,.3,1.3) forwards;
        }
        @keyframes cinematic-fx-shake-kf {
            0%, 100% { transform: translate(0,0) rotate(0); }
            15% { transform: translate(-4px, 3px) rotate(-1deg); }
            30% { transform: translate(5px, -2px) rotate(1deg); }
            45% { transform: translate(-3px, 4px) rotate(-0.5deg); }
            60% { transform: translate(4px, -3px) rotate(0.5deg); }
            80% { transform: translate(-2px, 1px); }
        }
        .cinematic-fx-shake .cinematic-img {
            animation: cinematic-fx-shake-kf 1.2s ease-out forwards;
        }
        @keyframes cinematic-fx-ink-reveal-kf {
            0% { clip-path: inset(0 100% 0 0); filter: grayscale(1) contrast(1.4); }
            70% { filter: grayscale(0.3) contrast(1.1); }
            100% { clip-path: inset(0 0 0 0); filter: none; }
        }
        .cinematic-fx-ink_reveal .cinematic-img {
            animation: cinematic-fx-ink-reveal-kf 2.2s ease-out forwards;
        }
        @keyframes cinematic-fx-drift-kf {
            0% { transform: translate(-3%, 0) scale(1.05); }
            100% { transform: translate(3%, 0) scale(1.05); }
        }
        .cinematic-fx-drift .cinematic-img {
            animation: cinematic-fx-drift-kf 8s linear infinite alternate;
        }
        @keyframes cinematic-fx-fade-kf {
            0% { opacity: 0; transform: scale(1.05); }
            100% { opacity: 1; transform: scale(1); }
        }
        .cinematic-fx-fade .cinematic-img {
            animation: cinematic-fx-fade-kf 1.4s ease-out forwards;
        }
    `}</style>
);

export default CinematicReader;
