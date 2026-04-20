import React from "react";

/**
 * PointingDoodle — a small hand-drawn sketch character that walks out from the
 * left edge and points at the low-credits upsell banner next to it.
 * Loops every ~8s. Pure SVG/CSS, no deps.
 */
export const PointingDoodle = () => {
    return (
        <>
            <style>{`
                .point-doodle {
                    position: absolute;
                    left: -60px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 54px;
                    height: 76px;
                    animation: pointWalk 8s ease-in-out infinite;
                    pointer-events: none;
                    z-index: 4;
                }
                @keyframes pointWalk {
                    0%   { left: -60px; opacity: 0; }
                    8%   { opacity: 1; }
                    20%  { left: -12px; opacity: 1; }
                    32%  { left: -12px; transform: translateY(calc(-50% - 4px)); }
                    44%  { left: -12px; transform: translateY(-50%); }
                    58%  { left: -12px; opacity: 1; }
                    70%  { left: -60px; opacity: 0; }
                    100% { left: -60px; opacity: 0; }
                }
                .point-doodle svg { width: 100%; height: 100%; overflow: visible; }
                .pleg-l { transform-origin: 30px 54px; animation: plSw 0.35s linear infinite; }
                .pleg-r { transform-origin: 30px 54px; animation: prSw 0.35s linear infinite; }
                @keyframes plSw { 0%,100% { transform: rotate(-16deg); } 50% { transform: rotate(16deg); } }
                @keyframes prSw { 0%,100% { transform: rotate(16deg); } 50% { transform: rotate(-16deg); } }
                /* arm points right (toward banner) after walk in */
                .parm-point {
                    transform-origin: 30px 34px;
                    animation: pointArm 8s ease-in-out infinite;
                }
                @keyframes pointArm {
                    0%,18%   { transform: rotate(40deg); }    /* walking swing */
                    22%,60%  { transform: rotate(80deg); }    /* extended pointing at banner */
                    65%,100% { transform: rotate(40deg); }    /* drop */
                }
                .parm-left { transform-origin: 30px 34px; animation: plSw 0.35s linear infinite; }

                /* small "!" speech bubble pops when pointing */
                .point-bubble {
                    position: absolute;
                    top: -8px;
                    right: -14px;
                    background: #FFE600;
                    border: 2px solid #111;
                    padding: 0 6px;
                    font-family: 'Caveat Brush', cursive;
                    font-size: 18px;
                    box-shadow: 2px 2px 0 #111;
                    opacity: 0;
                    animation: pointBubble 8s ease-in-out infinite;
                }
                @keyframes pointBubble {
                    0%,20%   { opacity: 0; transform: scale(0.6); }
                    26%,58%  { opacity: 1; transform: scale(1); }
                    64%,100% { opacity: 0; transform: scale(0.6); }
                }
                @media (max-width: 768px) {
                    .point-doodle { display: none; }
                }
            `}</style>
            <div className="point-doodle" aria-hidden>
                <svg viewBox="0 0 60 80">
                    <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {/* head */}
                        <circle cx="30" cy="18" r="10" fill="#FFFFFF"/>
                        <circle cx="27" cy="17" r="1.2" fill="#111"/>
                        <circle cx="33" cy="17" r="1.2" fill="#111"/>
                        <path d="M26 22c2 2 6 2 8 0" />
                        {/* body */}
                        <line x1="30" y1="28" x2="30" y2="54" />
                        {/* arm pointing right */}
                        <line className="parm-point" x1="30" y1="34" x2="48" y2="40" />
                        {/* left arm swinging */}
                        <line className="parm-left" x1="30" y1="34" x2="18" y2="44" />
                        {/* legs */}
                        <line className="pleg-l" x1="30" y1="54" x2="22" y2="72" />
                        <line className="pleg-r" x1="30" y1="54" x2="38" y2="72" />
                    </g>
                </svg>
                <div className="point-bubble">!</div>
            </div>
        </>
    );
};

export default PointingDoodle;
