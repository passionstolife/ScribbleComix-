import React from "react";

/**
 * DoodleBackground — abstract hand-drawn SVG decorations scattered behind page content.
 * Pure CSS animations, no JS, no external assets. Pointer-events disabled.
 *
 * Variants:
 *  - "default" : full ink-sketch chaos — squiggles, stars, spirals, scribbles
 *  - "minimal" : just 3-4 corner doodles
 *  - "events"  : confetti + ribbon scribbles
 *  - "discover": hearts, eyes, sparkles
 *  - "profile" : laurels, ribbons, stars
 *  - "creator" : pencils, ink drops, brackets
 */

const DOODLES = {
    squiggle: (
        <path d="M0 20 Q10 0 20 20 T40 20 T60 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    ),
    spiral: (
        <path d="M30 30 Q30 15 45 15 Q60 15 60 30 Q60 50 40 50 Q15 50 15 25 Q15 0 45 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    ),
    star: (
        <path d="M30 5 L34 22 L52 22 L37 32 L42 50 L30 39 L18 50 L23 32 L8 22 L26 22 Z" fill="currentColor" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
    ),
    burst: (
        <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="20" y1="20" x2="40" y2="40" />
            <line x1="40" y1="20" x2="20" y2="40" />
            <line x1="30" y1="10" x2="30" y2="50" />
            <line x1="10" y1="30" x2="50" y2="30" />
            <circle cx="30" cy="30" r="4" fill="currentColor" stroke="none"/>
        </g>
    ),
    scribble: (
        <path d="M5 30 Q10 15 20 30 Q30 45 40 30 Q50 15 60 30 Q70 45 80 30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    ),
    heart: (
        <path d="M30 50 C30 50 8 36 8 22 C8 14 14 8 22 8 C26 8 30 12 30 16 C30 12 34 8 38 8 C46 8 52 14 52 22 C52 36 30 50 30 50 Z" fill="currentColor" stroke="#111" strokeWidth="2" strokeLinejoin="round"/>
    ),
    eye: (
        <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M5 25 Q25 5 45 25 Q25 45 5 25 Z" fill="#fff"/>
            <circle cx="25" cy="25" r="6" fill="currentColor" stroke="none"/>
            <circle cx="27" cy="22" r="2" fill="#fff" stroke="none"/>
        </g>
    ),
    sparkle: (
        <g stroke="currentColor" fill="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 5 L22 18 L35 20 L22 22 L20 35 L18 22 L5 20 L18 18 Z" />
        </g>
    ),
    pencil: (
        <g fill="currentColor" stroke="#111" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
            <path d="M5 45 L40 10 L48 18 L13 53 Z" />
            <path d="M40 10 L48 18" />
            <path d="M5 45 L0 56 L13 53" fill="none"/>
        </g>
    ),
    ribbon: (
        <g fill="currentColor" stroke="#111" strokeWidth="2" strokeLinejoin="round">
            <path d="M5 15 L30 8 L55 15 L48 22 L30 18 L12 22 Z"/>
            <path d="M5 15 L0 30 L10 24" fill="currentColor"/>
            <path d="M55 15 L60 30 L50 24" fill="currentColor"/>
        </g>
    ),
    cloud: (
        <path d="M10 40 Q10 25 25 25 Q28 12 45 18 Q60 15 60 30 Q70 32 65 45 Q40 50 10 40 Z" fill="#fff" stroke="currentColor" strokeWidth="2.4"/>
    ),
    bolt: (
        <path d="M25 5 L10 30 L22 30 L18 55 L40 25 L28 25 L32 5 Z" fill="currentColor" stroke="#111" strokeWidth="2" strokeLinejoin="round"/>
    ),
    bracket: (
        <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <path d="M20 10 L8 10 L8 50 L20 50" />
            <path d="M40 10 L52 10 L52 50 L40 50" />
        </g>
    ),
    inkdrop: (
        <path d="M30 5 Q15 25 15 38 Q15 50 30 50 Q45 50 45 38 Q45 25 30 5 Z" fill="currentColor" stroke="#111" strokeWidth="2"/>
    ),
};

const PALETTE = {
    default:  ["text-highlight", "text-hotpink", "text-marker", "text-ink/15"],
    minimal:  ["text-highlight", "text-ink/15"],
    events:   ["text-hotpink", "text-highlight", "text-marker", "text-[#86A873]", "text-[#FF7AB6]"],
    discover: ["text-hotpink", "text-highlight", "text-marker"],
    profile:  ["text-[#FFD700]", "text-highlight", "text-marker", "text-hotpink"],
    creator:  ["text-marker", "text-hotpink", "text-highlight", "text-ink/15"],
};

const SHAPES_BY_VARIANT = {
    default:  ["squiggle", "spiral", "star", "burst", "scribble", "sparkle"],
    minimal:  ["squiggle", "scribble"],
    events:   ["star", "burst", "ribbon", "sparkle", "bolt", "heart"],
    discover: ["heart", "eye", "sparkle", "star", "burst"],
    profile:  ["star", "ribbon", "sparkle", "burst"],
    creator:  ["pencil", "bracket", "inkdrop", "scribble", "sparkle"],
};

// Deterministic seeded positions so rerenders stay stable
const POSITIONS = [
    { top: "8%",  left: "4%",   size: 64,  rot: -12, delay: "0s",   duration: "9s",  variant: "wiggle" },
    { top: "14%", right: "6%",  size: 72,  rot: 8,   delay: "1.2s", duration: "11s", variant: "drift" },
    { top: "32%", left: "8%",   size: 50,  rot: 22,  delay: "0.7s", duration: "8s",  variant: "wiggle" },
    { top: "44%", right: "10%", size: 60,  rot: -18, delay: "2s",   duration: "12s", variant: "drift" },
    { top: "62%", left: "5%",   size: 56,  rot: 10,  delay: "1.8s", duration: "10s", variant: "wiggle" },
    { top: "72%", right: "4%",  size: 80,  rot: -6,  delay: "0.4s", duration: "13s", variant: "drift" },
    { top: "20%", left: "48%",  size: 44,  rot: 14,  delay: "2.5s", duration: "9s",  variant: "wiggle" },
    { top: "82%", left: "40%",  size: 52,  rot: -22, delay: "1s",   duration: "10s", variant: "drift" },
    { top: "52%", left: "55%",  size: 38,  rot: 30,  delay: "3s",   duration: "11s", variant: "wiggle" },
];

const DoodleSVG = ({ name, size, color, rot, anim, delay, duration }) => {
    const def = DOODLES[name];
    const style = {
        width: size,
        height: size,
        transform: `rotate(${rot}deg)`,
        animationDelay: delay,
        animationDuration: duration,
    };
    return (
        <svg
            viewBox="0 0 60 60"
            className={`absolute pointer-events-none ${color} doodle-${anim}`}
            style={style}
            aria-hidden="true"
        >
            {def}
        </svg>
    );
};

export const DoodleBackground = ({ variant = "default", density = "medium", className = "" }) => {
    const palette = PALETTE[variant] || PALETTE.default;
    const shapes = SHAPES_BY_VARIANT[variant] || SHAPES_BY_VARIANT.default;
    const cap = density === "low" ? 4 : density === "high" ? 9 : 6;
    const used = POSITIONS.slice(0, cap);

    return (
        <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`} aria-hidden="true" data-testid="doodle-bg">
            {used.map((p, i) => {
                const name = shapes[i % shapes.length];
                const color = palette[i % palette.length];
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            top: p.top,
                            left: p.left,
                            right: p.right,
                            opacity: 0.55,
                        }}
                    >
                        <DoodleSVG
                            name={name}
                            size={p.size}
                            color={color}
                            rot={p.rot}
                            anim={p.variant}
                            delay={p.delay}
                            duration={p.duration}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default DoodleBackground;
