import React from "react";

/**
 * WalkingDoodle
 * Hand-drawn stick figure that walks across the billing screen toward the Ultimate tier card
 * and raises it up like a trophy. Pure SVG + CSS animations, no external libs.
 */
export const WalkingDoodle = () => {
    return (
        <>
            <style>{`
                .doodle-walker {
                    position: absolute;
                    bottom: -50px;
                    left: -90px;
                    width: 90px;
                    height: 120px;
                    z-index: 5;
                    animation: doodleWalk 9s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    pointer-events: none;
                }
                .doodle-walker svg { width: 100%; height: 100%; overflow: visible; }

                /* walk from off-screen left to under the Ultimate (right) card, pause, hop up, settle */
                @keyframes doodleWalk {
                    0%   { left: -90px; transform: translateY(0); }
                    55%  { left: calc(78% - 45px); transform: translateY(0); }
                    65%  { left: calc(78% - 45px); transform: translateY(-14px); }
                    72%  { left: calc(78% - 45px); transform: translateY(0); }
                    100% { left: calc(78% - 45px); transform: translateY(0); }
                }

                /* leg swings */
                .leg-l { transform-origin: 50px 78px; animation: swingL 0.45s linear infinite; }
                .leg-r { transform-origin: 50px 78px; animation: swingR 0.45s linear infinite; }
                @keyframes swingL { 0%,100% { transform: rotate(-22deg); } 50% { transform: rotate(22deg); } }
                @keyframes swingR { 0%,100% { transform: rotate(22deg); } 50% { transform: rotate(-22deg); } }

                /* arm swings (opposite of legs) */
                .arm-l { transform-origin: 50px 50px; animation: swingR 0.45s linear infinite; }
                .arm-r { transform-origin: 50px 50px; animation: swingL 0.45s linear infinite; }

                /* freeze limbs when doodle arrived (after 55% of 9s ≈ 5s) */
                .doodle-walker .leg-l,
                .doodle-walker .leg-r,
                .doodle-walker .arm-l,
                .doodle-walker .arm-r {
                    animation-fill-mode: forwards;
                }
                .doodle-walker .arm-l { animation: swingR 0.45s linear infinite, armsUpL 0.5s ease 5.4s forwards; }
                .doodle-walker .arm-r { animation: swingL 0.45s linear infinite, armsUpR 0.5s ease 5.4s forwards; }
                .doodle-walker .leg-l { animation: swingL 0.45s linear infinite, freezeL 0.01s ease 5.4s forwards; }
                .doodle-walker .leg-r { animation: swingR 0.45s linear infinite, freezeR 0.01s ease 5.4s forwards; }
                @keyframes armsUpL { to { transform: rotate(-155deg); } }
                @keyframes armsUpR { to { transform: rotate(155deg); } }
                @keyframes freezeL { to { transform: rotate(-12deg); } }
                @keyframes freezeR { to { transform: rotate(12deg); } }

                /* speech bubble */
                .doodle-speech {
                    position: absolute;
                    top: -18px;
                    left: -20px;
                    background: #FFFFFF;
                    border: 2px solid #111;
                    padding: 4px 8px;
                    font-family: 'Caveat Brush', cursive;
                    font-size: 18px;
                    white-space: nowrap;
                    transform: rotate(-4deg);
                    box-shadow: 3px 3px 0 #111;
                    opacity: 0;
                    animation: speechShow 0.6s ease 5.8s forwards;
                }
                @keyframes speechShow { from { opacity: 0; transform: rotate(-4deg) translateY(6px); } to { opacity: 1; transform: rotate(-4deg) translateY(0); } }

                /* mini trophy bouncing above the stick figure's hands */
                .mini-trophy {
                    position: absolute;
                    top: -10px;
                    left: 27px;
                    opacity: 0;
                    animation: trophyPop 0.5s cubic-bezier(0.25, 1.5, 0.5, 1) 5.5s forwards;
                }
                @keyframes trophyPop { from { opacity: 0; transform: scale(0.2) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }

                /* confetti sparkle */
                .sparkle {
                    position: absolute;
                    font-family: 'Caveat Brush', cursive;
                    font-size: 22px;
                    color: #111;
                    opacity: 0;
                    animation: sparkleUp 1s ease 5.9s forwards;
                }
                .sparkle.s1 { top: -34px; left: 8px; color: #FF007F; }
                .sparkle.s2 { top: -26px; left: 72px; animation-delay: 6.15s; color: #0057FF; }
                .sparkle.s3 { top: -12px; left: -6px; animation-delay: 6.3s; color: #FFE600; -webkit-text-stroke: 1.5px #111; }
                @keyframes sparkleUp { 0% { opacity: 0; transform: translateY(0) scale(0.6); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(-30px) scale(1.2); } }

                /* lift marks above best-plan-card */
                .ultimate-lift-marks {
                    position: absolute;
                    top: -46px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-family: 'Caveat Brush', cursive;
                    font-size: 30px;
                    opacity: 0;
                    letter-spacing: 0.15em;
                    animation: liftMarks 1s ease 5.8s forwards;
                    pointer-events: none;
                    color: #FF007F;
                    -webkit-text-stroke: 1.5px #111;
                }
                @keyframes liftMarks { 0% { opacity: 0; transform: translateX(-50%) translateY(10px); } 100% { opacity: 1; transform: translateX(-50%) translateY(0); } }

                /* Ultimate card actually lifts when doodle arrives */
                .best-plan-card {
                    animation: cardLift 0.9s cubic-bezier(0.25, 1.4, 0.5, 1) 5.6s forwards;
                }
                @keyframes cardLift {
                    0%   { transform: rotate(-0.6deg) translateY(0); box-shadow: 6px 6px 0 0 #111; }
                    60%  { transform: rotate(-3deg) translateY(-18px) scale(1.03); box-shadow: 10px 14px 0 0 #111; }
                    100% { transform: rotate(-2deg) translateY(-10px) scale(1.02); box-shadow: 8px 12px 0 0 #111; }
                }

                @media (max-width: 768px) {
                    .doodle-walker { display: none; }
                    .best-plan-card { animation: none !important; }
                    .ultimate-lift-marks { display: none; }
                }
            `}</style>
            <div className="doodle-walker trophy-container" id="doodle-walker">
                <svg viewBox="0 0 100 120">
                    <g fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        {/* head */}
                        <circle cx="50" cy="30" r="14" fill="#FFFFFF"/>
                        {/* eyes */}
                        <circle cx="45" cy="29" r="1.5" fill="#111"/>
                        <circle cx="55" cy="29" r="1.5" fill="#111"/>
                        {/* smile */}
                        <path d="M44 35c3 3 9 3 12 0" />
                        {/* hair tuft */}
                        <path d="M44 18c2-4 6-5 8-3M52 16c2-3 5-3 7-1" />
                        {/* body */}
                        <line x1="50" y1="44" x2="50" y2="78" />
                        {/* arms */}
                        <line className="arm-l" x1="50" y1="50" x2="34" y2="64" />
                        <line className="arm-r" x1="50" y1="50" x2="66" y2="64" />
                        {/* legs */}
                        <line className="leg-l" x1="50" y1="78" x2="38" y2="100" />
                        <line className="leg-r" x1="50" y1="78" x2="62" y2="100" />
                    </g>
                </svg>
                <div className="mini-trophy" aria-hidden>
                    <svg width="36" height="42" viewBox="0 0 36 42">
                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
                            <path d="M8 4h20v10a10 10 0 0 1-20 0V4z" fill="#FFE600"/>
                            <path d="M8 6H3v4a5 5 0 0 0 5 5" />
                            <path d="M28 6h5v4a5 5 0 0 1-5 5" />
                            <path d="M14 24h8v6h-8z" fill="#FFFFFF"/>
                            <path d="M10 30h16v4H10z" fill="#FF007F"/>
                        </g>
                    </svg>
                </div>
                <span className="sparkle s1">✦</span>
                <span className="sparkle s2">✺</span>
                <span className="sparkle s3">✦</span>
                <div className="doodle-speech">This one! ✎</div>
            </div>
        </>
    );
};

export default WalkingDoodle;
