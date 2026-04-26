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
            <svg viewBox="0 0 80 80" width={size} height={size} data-testid={`tier-badge-svg-${tier}`}>
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

/**
 * MilestoneBadge — progressive trophy-bookshelf badges for # of comics created.
 * Tiers: 1 → bronze quill, 3 → copper pen, 7 → silver scroll, 12 → gold book,
 *        20 → platinum trophy, 50 → rainbow legend crown.
 * Each badge is a unique hand-drawn SVG with cute personality.
 */
export const MILESTONES = [
    { min: 1,  key: "sketch_starter",   title: "Sketch Starter",     color: "#C87533", shine: "#E8A06B", icon: "quill" },
    { min: 3,  key: "budding_author",   title: "Budding Author",     color: "#B87333", shine: "#E0A872", icon: "pencils" },
    { min: 7,  key: "story_weaver",     title: "Story Weaver",       color: "#C8C8D0", shine: "#F0F0F6", icon: "scroll" },
    { min: 12, key: "panel_master",     title: "Panel Master",       color: "#FFD700", shine: "#FFF5A0", icon: "book" },
    { min: 20, key: "ink_virtuoso",     title: "Ink Virtuoso",       color: "#9FE7E7", shine: "#D6FAFA", icon: "trophy" },
    { min: 50, key: "legendary_creator", title: "Legendary Creator", color: "#FF7AB6", shine: "#FFE0EE", icon: "crown_star" },
];

const MilestoneIcon = ({ icon, accent = "#111" }) => {
    if (icon === "quill") return (
        <g fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 44 Q28 30 44 18 Q46 24 42 32 Q34 40 26 46 Z" fill="#FDFBF7" />
            <path d="M20 44 L16 50" />
            <path d="M30 30 L34 34" />
        </g>
    );
    if (icon === "pencils") return (
        <g fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 46 L36 28 L40 32 L22 50 Z" fill="#FFE600" />
            <path d="M36 28 L40 32" />
            <path d="M22 38 L38 22 L42 26 L26 42 Z" fill="#FF7AB6" />
            <path d="M18 46 L15 52 L22 50" />
        </g>
    );
    if (icon === "scroll") return (
        <g fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="16" y="18" width="28" height="24" rx="3" fill="#FDFBF7" />
            <line x1="22" y1="26" x2="38" y2="26" />
            <line x1="22" y1="32" x2="38" y2="32" />
            <line x1="22" y1="38" x2="32" y2="38" />
            <circle cx="16" cy="18" r="3" fill={accent} />
            <circle cx="44" cy="42" r="3" fill={accent} />
        </g>
    );
    if (icon === "book") return (
        <g fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 18 Q14 16 16 16 L28 16 Q30 18 30 20 L30 46 Q28 44 26 44 L16 44 Q14 44 14 46 Z" fill="#FDFBF7" />
            <path d="M30 20 Q30 18 32 16 L44 16 Q46 16 46 18 L46 46 Q46 44 44 44 L34 44 Q32 44 30 46 Z" fill="#FDFBF7" />
            <line x1="18" y1="24" x2="26" y2="24" />
            <line x1="18" y1="30" x2="26" y2="30" />
            <line x1="34" y1="24" x2="42" y2="24" />
            <line x1="34" y1="30" x2="42" y2="30" />
            <path d="M30 16 L30 46" />
        </g>
    );
    if (icon === "trophy") return (
        <g fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 14 L38 14 L38 26 Q38 34 30 36 Q22 34 22 26 Z" fill="#FFD700" />
            <path d="M22 18 Q14 18 14 24 Q14 28 20 30" />
            <path d="M38 18 Q46 18 46 24 Q46 28 40 30" />
            <line x1="30" y1="36" x2="30" y2="44" />
            <path d="M24 44 L36 44 L34 48 L26 48 Z" fill="#FDFBF7" />
            <path d="M27 22 L30 26 L33 22" />
        </g>
    );
    if (icon === "crown_star") return (
        <g fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 36 L20 20 L26 30 L30 14 L34 30 L40 20 L44 36 Z" fill="#FFE600" />
            <line x1="16" y1="42" x2="44" y2="42" />
            <circle cx="20" cy="20" r="2" fill="#FF007F" stroke="none" />
            <circle cx="30" cy="14" r="2.5" fill="#0057FF" stroke="none" />
            <circle cx="40" cy="20" r="2" fill="#FF007F" stroke="none" />
            <path d="M30 48 L31 51 L34 51 L31.5 53 L32.5 56 L30 54 L27.5 56 L28.5 53 L26 51 L29 51 Z" fill="#111" />
        </g>
    );
    return null;
};

export const MilestoneBadge = ({ milestone, size = 96, unlocked = true }) => {
    const m = typeof milestone === "object" ? milestone : MILESTONES.find((x) => x.key === milestone);
    if (!m) return null;
    return (
        <div
            style={{ width: size }}
            className={`inline-flex flex-col items-center gap-1.5 ${unlocked ? "" : "opacity-35 grayscale"}`}
            data-testid={`milestone-${m.key}`}
            title={`${m.title} — ${m.min}+ comics`}
        >
            <svg viewBox="0 0 72 72" width={size} height={size}>
                {/* outer ribbon-star scalloped frame */}
                <path
                    d="M36 4 L42 10 L50 8 L52 16 L60 20 L58 28 L64 36 L58 44 L60 52 L52 56 L50 64 L42 62 L36 68 L30 62 L22 64 L20 56 L12 52 L14 44 L8 36 L14 28 L12 20 L20 16 L22 8 L30 10 Z"
                    fill={unlocked ? m.color : "#FDFBF7"}
                    stroke="#111"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                />
                {/* inner halftone disc */}
                <defs>
                    <pattern id={`ms-dots-${m.key}`} width="5" height="5" patternUnits="userSpaceOnUse">
                        <circle cx="1.2" cy="1.2" r="0.8" fill="#111" opacity="0.12" />
                    </pattern>
                </defs>
                <circle cx="36" cy="36" r="22" fill="#FDFBF7" stroke="#111" strokeWidth="2" />
                <circle cx="36" cy="36" r="22" fill={`url(#ms-dots-${m.key})`} />
                {/* shine arc */}
                <path d="M22 28 Q36 18 50 28" stroke={m.shine} strokeWidth="2.5" fill="none" opacity="0.9" />
                {/* icon centered in 64x64 viewBox, offset to 72 */}
                <g transform="translate(4,4)">
                    <MilestoneIcon icon={m.icon} />
                </g>
            </svg>
            <div className="text-center">
                <div className="font-heading text-lg leading-none">{m.title}</div>
                <div className="font-body text-xs text-ink/60 font-bold">{m.min}+ comics</div>
            </div>
        </div>
    );
};
