import React, { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles, Maximize2, Layers } from "lucide-react";

/**
 * PopUpReader — pure CSS 3D pop-up-book viewer.
 * - Each panel renders as a 3D card in a perspective scene.
 * - Mouse / touch / device orientation drives the tilt.
 * - Two modes: "spread" (current panel center, prev/next peeking) and "diorama" (all panels float in 3D ring).
 * - No external assets, no API, no cost.
 */
const PopUpReader = ({ comic, onClose }) => {
    const [index, setIndex] = useState(0);
    const [mode, setMode] = useState("spread"); // spread | diorama
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const sceneRef = useRef(null);

    const panels = comic?.panels || [];
    const total = panels.length;

    // Mouse tilt (desktop)
    useEffect(() => {
        const node = sceneRef.current;
        if (!node) return;
        const onMove = (e) => {
            const rect = node.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;  // -1..1
            const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
            setTilt({ x: -x * 12, y: y * 10 });
        };
        const onLeave = () => setTilt({ x: 0, y: 0 });
        node.addEventListener("mousemove", onMove);
        node.addEventListener("mouseleave", onLeave);
        return () => {
            node.removeEventListener("mousemove", onMove);
            node.removeEventListener("mouseleave", onLeave);
        };
    }, []);

    // Device orientation (mobile)
    useEffect(() => {
        const handler = (e) => {
            // gamma = left/right tilt (-90..90), beta = front/back (-180..180)
            const gx = Math.max(-25, Math.min(25, e.gamma || 0));
            const gy = Math.max(-25, Math.min(25, (e.beta || 0) - 30));
            setTilt({ x: gx * 0.6, y: gy * 0.5 });
        };
        // iOS 13+ requires explicit permission — request lazily on first user gesture
        const requestPerm = () => {
            if (typeof DeviceOrientationEvent !== "undefined" &&
                typeof DeviceOrientationEvent.requestPermission === "function") {
                DeviceOrientationEvent.requestPermission().then((state) => {
                    if (state === "granted") window.addEventListener("deviceorientation", handler);
                }).catch(() => { /* ignore */ });
            } else {
                window.addEventListener("deviceorientation", handler);
            }
        };
        requestPerm();
        return () => window.removeEventListener("deviceorientation", handler);
    }, []);

    // Keyboard nav
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
            if (e.key === "ArrowRight") setIndex((i) => Math.min(total - 1, i + 1));
            if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [total, onClose]);

    if (!comic) return null;

    const sceneTransform = `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`;

    return (
        <div className="fixed inset-0 z-[100] bg-ink/95 overflow-hidden" data-testid="popup-reader">
            <PopUpStyles />
            {/* Top bar */}
            <div className="fixed top-0 left-0 right-0 z-[101] bg-paper border-b-2 border-ink px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-display uppercase text-xs font-bold tracking-[0.2em] hidden sm:inline">Pop-Up Book</span>
                    <span className="px-2 py-0.5 border-2 border-ink bg-highlight font-body text-xs font-bold">
                        {mode === "spread" ? `${index + 1} / ${total}` : `Diorama · ${total} panels`}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMode(mode === "spread" ? "diorama" : "spread")}
                        data-testid="popup-toggle-mode"
                        className="btn-ink !py-1.5 !px-2 text-xs inline-flex items-center gap-1"
                        title="Toggle diorama / spread mode"
                    >
                        {mode === "spread" ? <><Layers size={12}/> Diorama</> : <><Maximize2 size={12}/> Spread</>}
                    </button>
                    <button onClick={onClose} className="btn-ink !py-1.5 !px-2" data-testid="popup-exit"><X size={14}/></button>
                </div>
            </div>

            {/* Title */}
            <div className="fixed top-14 left-0 right-0 z-[101] text-center pt-3 pointer-events-none">
                <h1 className="font-heading text-3xl sm:text-4xl text-paper drop-shadow-md">{comic.title}</h1>
            </div>

            {/* 3D Scene */}
            <div
                ref={sceneRef}
                className="absolute inset-0 grid place-items-center"
                style={{ perspective: "1400px" }}
            >
                {mode === "spread" ? (
                    <SpreadScene
                        panels={panels}
                        index={index}
                        sceneTransform={sceneTransform}
                    />
                ) : (
                    <DioramaScene
                        panels={panels}
                        sceneTransform={sceneTransform}
                    />
                )}
            </div>

            {/* Caption box for current panel (spread mode) */}
            {mode === "spread" && panels[index] && (
                <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-[102] max-w-md w-[90%] pointer-events-none">
                    <div className="border-2 border-ink bg-paper shadow-ink px-4 py-3 -rotate-[0.6deg]">
                        {panels[index].dialogue && (
                            <div className="font-hand text-base mb-1 italic">&ldquo;{panels[index].dialogue}&rdquo;</div>
                        )}
                        {panels[index].caption && (
                            <div className="font-hand text-sm text-ink/80">{panels[index].caption}</div>
                        )}
                        {!panels[index].dialogue && !panels[index].caption && (
                            <div className="font-hand text-sm text-ink/40">Panel {index + 1}</div>
                        )}
                    </div>
                </div>
            )}

            {/* Nav controls (spread mode) */}
            {mode === "spread" && (
                <>
                    <button
                        onClick={() => setIndex((i) => Math.max(0, i - 1))}
                        disabled={index === 0}
                        data-testid="popup-prev"
                        className="fixed left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[102] btn-ink !p-3 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5}/>
                    </button>
                    <button
                        onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                        disabled={index === total - 1}
                        data-testid="popup-next"
                        className="fixed right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[102] btn-pink !p-3 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronRight size={20} strokeWidth={2.5}/>
                    </button>
                </>
            )}

            {/* Hint pill */}
            <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[102] pointer-events-none">
                <div className="px-3 py-1.5 border-2 border-paper bg-ink/60 backdrop-blur-sm rounded-sm font-display text-xs text-paper inline-flex items-center gap-1.5">
                    <Sparkles size={12}/> {mode === "spread" ? "Move your mouse / tilt your phone" : "Tilt to look around the diorama"}
                </div>
            </div>
        </div>
    );
};

// ---- Spread mode: current panel centered, prev/next peeking on either side ----
const SpreadScene = ({ panels, index, sceneTransform }) => {
    return (
        <div
            className="relative"
            style={{
                width: "min(76vmin, 700px)",
                height: "min(58vmin, 540px)",
                transformStyle: "preserve-3d",
                transform: sceneTransform,
                transition: "transform 80ms ease-out",
            }}
        >
            {panels.map((p, i) => {
                const offset = i - index;
                const visible = Math.abs(offset) <= 2;
                if (!visible) return null;
                const x = offset * 70;          // % horizontal offset
                const z = -Math.abs(offset) * 220; // depth
                const rotY = offset === 0 ? 0 : (offset < 0 ? 22 : -22);
                const opacity = offset === 0 ? 1 : 0.45;
                const scale = offset === 0 ? 1 : 0.8;
                return (
                    <PopUpPanel
                        key={p.id || i}
                        panel={p}
                        active={offset === 0}
                        style={{
                            transform: `translate3d(${x}%, 0, ${z}px) rotateY(${rotY}deg) scale(${scale})`,
                            opacity,
                            zIndex: 10 - Math.abs(offset),
                        }}
                        index={i}
                    />
                );
            })}
        </div>
    );
};

// ---- Diorama mode: all panels arranged in a 3D ring/grid floating in space ----
const DioramaScene = ({ panels, sceneTransform }) => {
    const total = panels.length;
    return (
        <div
            className="relative"
            style={{
                width: "min(80vmin, 800px)",
                height: "min(80vmin, 800px)",
                transformStyle: "preserve-3d",
                transform: sceneTransform,
                transition: "transform 100ms ease-out",
            }}
        >
            {panels.map((p, i) => {
                const angle = (i / Math.max(total, 1)) * Math.PI * 2;
                const radius = 280;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                const y = (i % 2 ? -30 : 30);
                const rotY = -((angle * 180) / Math.PI) - 90;
                return (
                    <PopUpPanel
                        key={p.id || i}
                        panel={p}
                        active
                        small
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            transform: `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), ${z}px) rotateY(${rotY}deg)`,
                        }}
                        index={i}
                    />
                );
            })}
            {/* Center sparkle */}
            <div
                className="absolute left-1/2 top-1/2 w-3 h-3 bg-highlight rounded-full pointer-events-none"
                style={{ transform: "translate3d(-50%, -50%, 0)", boxShadow: "0 0 40px 8px rgba(255,230,0,0.6)" }}
            />
        </div>
    );
};

// ---- Single 3D panel card with multi-layer parallax pop-out ----
const PopUpPanel = ({ panel, style, active, small, index }) => {
    const w = small ? 220 : "100%";
    const h = small ? 175 : "100%";
    const rotation = (index % 2 ? -1.2 : 1.2);
    return (
        <div
            className={`popup-panel border-2 border-ink bg-white shadow-[10px_10px_0_0_#111] transition-all duration-300 ${active ? "" : "pointer-events-none"}`}
            style={{
                width: w,
                height: h,
                transformStyle: "preserve-3d",
                ...style,
            }}
            data-testid={`popup-panel-${index}`}
        >
            <div
                className="absolute inset-0 overflow-hidden"
                style={{ transform: `rotate(${rotation}deg)` }}
            >
                {/* Background paper layer (recedes) */}
                <div
                    className="absolute inset-0 bg-paper"
                    style={{ transform: "translateZ(-30px)" }}
                />
                {/* Image layer (mid depth) */}
                {panel.image_base64 ? (
                    <img
                        src={panel.image_base64}
                        alt={`Panel ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ transform: "translateZ(0)" }}
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center font-heading text-5xl text-ink/30">?!</div>
                )}
                {/* Foreground dialogue bubble — pops out toward viewer */}
                {panel.dialogue && (
                    <div
                        className="absolute top-2 left-2 max-w-[70%] bg-white border-2 border-ink px-2 py-1 font-hand text-sm shadow-ink-sm"
                        style={{ transform: "translateZ(40px)" }}
                    >
                        {panel.dialogue}
                    </div>
                )}
                {/* Decorative corner sparkle for active panel */}
                {active && !small && (
                    <div
                        className="absolute -top-3 -right-3 w-12 h-12 bg-highlight border-2 border-ink rotate-12 grid place-items-center font-heading text-sm"
                        style={{ transform: "translateZ(50px) rotate(12deg)" }}
                    >
                        POP!
                    </div>
                )}
            </div>
            {/* Edge shadow for paper depth */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    boxShadow: "inset 0 0 60px rgba(0,0,0,0.15)",
                    transform: "translateZ(1px)",
                }}
            />
        </div>
    );
};

const PopUpStyles = () => (
    <style>{`
        .popup-panel {
            transform-origin: center;
            backface-visibility: hidden;
        }
        @keyframes popup-float {
            0%, 100% { transform: translateY(0); }
            50%      { transform: translateY(-6px); }
        }
    `}</style>
);

export default PopUpReader;
