import React from "react";

/**
 * Hand-drawn SVG badges in ScribbleComix's ink-sketch aesthetic.
 * All badges use rough ink strokes, yellow/pink/blue accents, and comic-book vibes.
 *
 * Two families:
 *  - RoleBadge:  Founder, Co-Founder, Promoter, Ultimate, Pro, Free
 *  - TierBadge:  bronze, silver, gold, platinum, diamond (level/rank tiers)
 *  - AchievementSeal: vintage comic panel stamps (BOOM!, POW!, ZAP!, etc.)
 */

const TIER_COLORS = {
    bronze:   { fill: "#C87533", stroke: "#111", shine: "#E8A06B" },
    silver:   { fill: "#C8C8D0", stroke: "#111", shine: "#F0F0F6" },
    gold:     { fill: "#FFD700", stroke: "#111", shine: "#FFF5A0" },
    platinum: { fill: "#9FE7E7", stroke: "#111", shine: "#D6FAFA" },
    diamond:  { fill: "#FF7AB6", stroke: "#111", shine: "#FFE0EE" },
};

const ROLE_COLORS = {
    founder:    { fill: "#FFD700", label: "Founder",    accent: "#FF007F" },
    co_founder: { fill: "#0057FF", label: "Co-Founder", accent: "#FFE600" },
    promoter:   { fill: "#FF007F", label: "Promoter",   accent: "#FFE600" },
    ultimate:   { fill: "#FFE600", label: "Ultimate",   accent: "#FF007F" },
    pro:        { fill: "#9FE7E7", label: "Pro",        accent: "#0057FF" },
    free:       { fill: "#FDFBF7", label: "Free",       accent: "#111" },
};

export const RoleBadge = ({ role = "free", size = 48, showLabel = false }) => {
    const c = ROLE_COLORS[role] || ROLE_COLORS.free;
    const isTop = role === "founder" || role === "co_founder" || role === "promoter";
    return (
        <div className="inline-flex items-center gap-2" data-testid={`role-badge-${role}`}>
            <div style={{ width: size, height: size }} className="relative">
                <svg viewBox="0 0 60 60" width={size} height={size}>
                    {/* shield */}
                    <path
                        d="M30 4 L52 12 V28 C52 42 42 54 30 58 C18 54 8 42 8 28 V12 Z"
                        fill={c.fill}
                        stroke="#111"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                    />
                    {/* inner shine ring */}
                    <path
                        d="M30 10 L46 16 V28 C46 38 39 48 30 52 C21 48 14 38 14 28 V16 Z"
                        fill="none"
                        stroke="#111"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                        strokeDasharray="2 2"
                        opacity="0.5"
                    />
                    {/* symbol by role */}
                    {role === "founder" && (
                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {/* crown */}
                            <path d="M18 32 L22 22 L26 30 L30 18 L34 30 L38 22 L42 32 Z" fill={c.accent}/>
                            <line x1="18" y1="38" x2="42" y2="38" />
                            {/* three gem dots */}
                            <circle cx="22" cy="22" r="1.8" fill="#111" stroke="none"/>
                            <circle cx="30" cy="18" r="1.8" fill="#111" stroke="none"/>
                            <circle cx="38" cy="22" r="1.8" fill="#111" stroke="none"/>
                        </g>
                    )}
                    {role === "co_founder" && (
                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {/* medal/ribbon */}
                            <circle cx="30" cy="32" r="9" fill={c.accent}/>
                            <path d="M24 38 L20 48 L26 45 L30 50 L34 45 L40 48 L36 38" fill={c.fill}/>
                            <path d="M26 32 L30 36 L36 28" stroke="#111" strokeWidth="2.5"/>
                        </g>
                    )}
                    {role === "promoter" && (
                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {/* megaphone */}
                            <path d="M18 26 L36 20 V40 L18 34 Z" fill={c.accent}/>
                            <path d="M36 24 L42 22 V38 L36 36" fill={c.fill}/>
                            <path d="M22 42 L26 48" />
                            <circle cx="26" cy="49" r="2" fill="#111" stroke="none"/>
                        </g>
                    )}
                    {role === "ultimate" && (
                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {/* infinity + star */}
                            <path d="M18 32 C18 28 22 28 24 30 L30 34 L36 30 C38 28 42 28 42 32 C42 36 38 36 36 34 L30 30 L24 34 C22 36 18 36 18 32 Z" fill={c.accent}/>
                            <path d="M30 14 L31.5 18 L35.5 18.5 L32.5 21 L33.5 25 L30 23 L26.5 25 L27.5 21 L24.5 18.5 L28.5 18 Z" fill={c.fill}/>
                        </g>
                    )}
                    {role === "pro" && (
                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {/* star */}
                            <path d="M30 16 L33.5 26 L44 26 L35.5 32 L39 42 L30 36 L21 42 L24.5 32 L16 26 L26.5 26 Z" fill={c.accent}/>
                        </g>
                    )}
                    {role === "free" && (
                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {/* pencil */}
                            <path d="M20 40 L38 22 L42 26 L24 44 Z" fill={c.accent}/>
                            <path d="M38 22 L42 26" />
                            <path d="M20 40 L17 47 L24 44" />
                        </g>
                    )}
                </svg>
                {/* tape accent */}
                <div
                    className="absolute -top-1 -right-2 w-5 h-2.5 rotate-12 border-2 border-ink"
                    style={{ background: isTop ? "#FFE600" : "transparent" }}
                />
            </div>
            {showLabel && (
                <span className="font-display font-bold uppercase tracking-[0.15em] text-xs">{c.label}</span>
            )}
        </div>
    );
};

export const TierBadge = ({ tier = "bronze", rank = "Novice", size = 56 }) => {
    const c = TIER_COLORS[tier] || TIER_COLORS.bronze;
    return (
        <div className="inline-flex flex-col items-center gap-1" data-testid={`tier-badge-${tier}`}>
            <svg viewBox="0 0 80 80" width={size} height={size}>
                {/* laurel left */}
                <g fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round">
                    <path d="M14 36 Q10 24 18 14 Q22 22 20 30" />
                    <path d="M12 44 Q6 40 6 30" />
                    <path d="M14 52 Q8 52 6 44" />
                    <path d="M18 60 Q12 62 10 54" />
                </g>
                {/* laurel right (mirror) */}
                <g fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round">
                    <path d="M66 36 Q70 24 62 14 Q58 22 60 30" />
                    <path d="M68 44 Q74 40 74 30" />
                    <path d="M66 52 Q72 52 74 44" />
                    <path d="M62 60 Q68 62 70 54" />
                </g>
                {/* medallion disc */}
                <circle cx="40" cy="40" r="20" fill={c.fill} stroke="#111" strokeWidth="2.5" />
                <circle cx="40" cy="40" r="14" fill="none" stroke="#111" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                {/* shine */}
                <path d="M30 34 Q40 26 50 34" stroke={c.shine} strokeWidth="3" fill="none" opacity="0.9" />
                {/* star center */}
                <path
                    d="M40 30 L42.5 37 L50 37 L44 41.5 L46.5 49 L40 44.5 L33.5 49 L36 41.5 L30 37 L37.5 37 Z"
                    fill="#111"
                />
                {/* ribbon banner */}
                <path d="M22 58 L40 64 L58 58 L54 74 L40 70 L26 74 Z" fill="#FFE600" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
                <text x="40" y="71" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize="7" fontWeight="700" fill="#111">
                    {rank.toUpperCase().slice(0, 14)}
                </text>
            </svg>
        </div>
    );
};

const SEAL_COLORS = {
    highlight: "#FFE600",
    hotpink:   "#FF007F",
    marker:    "#0057FF",
    gold:      "#FFD700",
};

const SEAL_TEXTS = {
    seal_boom:    "BOOM!",
    seal_zap:     "ZAP!",
    seal_pow:     "POW!",
    seal_amazing: "WOW!",
    seal_heart:   "LOVE",
    seal_star:    "★",
    seal_crown:   "♛",
    seal_wow:     "WOW!",
    seal_whoa:    "WHOA!",
    seal_moon:    "☾",
};

export const AchievementSeal = ({ icon = "seal_boom", color = "highlight", size = 80, locked = false }) => {
    const fill = locked ? "#FDFBF7" : (SEAL_COLORS[color] || SEAL_COLORS.highlight);
    const text = SEAL_TEXTS[icon] || "WOW!";
    return (
        <div style={{ width: size, height: size }} className={`relative ${locked ? 'opacity-40 grayscale' : ''}`}>
            <svg viewBox="0 0 100 100" width={size} height={size}>
                {/* star-burst seal shape (12-point) */}
                <g>
                    <polygon
                        points="50,5 55,20 70,12 66,28 82,30 72,42 86,52 72,60 82,72 66,74 70,90 55,82 50,95 45,82 30,90 34,74 18,72 28,60 14,52 28,42 18,30 34,28 30,12 45,20"
                        fill={fill}
                        stroke="#111"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                    />
                    {/* halftone pattern inside */}
                    <defs>
                        <pattern id={`dots-${icon}`} width="6" height="6" patternUnits="userSpaceOnUse">
                            <circle cx="1.5" cy="1.5" r="1" fill="#111" opacity="0.15" />
                        </pattern>
                    </defs>
                    <circle cx="50" cy="50" r="26" fill={`url(#dots-${icon})`} />
                    <circle cx="50" cy="50" r="26" fill="none" stroke="#111" strokeWidth="1.5" strokeDasharray="2 2" />
                </g>
                <text
                    x="50"
                    y="56"
                    textAnchor="middle"
                    fontFamily="'Caveat Brush', cursive"
                    fontSize={text.length > 3 ? 18 : 26}
                    fill="#111"
                    style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 1 }}
                >
                    {text}
                </text>
            </svg>
        </div>
    );
};

export default RoleBadge;
