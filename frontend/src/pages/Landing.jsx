import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Sparkles, Wand2, Layers, Download, ArrowRight } from "lucide-react";
import Navbar from "../components/Navbar";
import DoodleBackground from "../components/DoodleBackground";

const features = [
    { icon: Wand2, title: "AI story + sketches", body: "Type a prompt. Get a hand-drawn comic story in panels, ready to tweak." },
    { icon: Layers, title: "Grid or Webtoon", body: "Classic 4-6 panel page or scrolly webtoon — flip the layout anytime." },
    { icon: Download, title: "Export to share", body: "Download your comic as a printable page or share the live reader link." },
];

const Landing = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    return (
        <div className="min-h-screen relative">
            <DoodleBackground variant="default" density="medium" />
            <Navbar />
            {/* HERO */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-halftone opacity-[0.08] pointer-events-none" />
                <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-14 lg:pt-20 pb-24 grid lg:grid-cols-12 gap-10 items-center">
                    <div className="lg:col-span-7">
                        <div className="inline-flex items-center gap-2 bg-white border-2 border-ink rounded-sm px-3 py-1 shadow-ink-sm mb-6" data-testid="hero-badge">
                            <Sparkles size={14} strokeWidth={2.5} />
                            <span className="font-display font-semibold text-xs tracking-wider uppercase">Sketch-style AI comics</span>
                        </div>
                        <h1 className="font-heading text-6xl sm:text-7xl lg:text-8xl leading-[0.95] tracking-tight" data-testid="hero-title">
                            Doodle a <span className="sketchy-under">whole</span>
                            <br />
                            comic book.
                            <span className="inline-block ml-3 animate-wiggle">✎</span>
                        </h1>
                        <p className="mt-6 max-w-xl text-lg text-ink/80 font-body" data-testid="hero-sub">
                            ScribbleComix turns a one-line idea into a playful black-and-white sketch comic — panels,
                            dialogue, and all. Edit anything. Flip between grid and webtoon. Ship it.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            {user ? (
                                <button data-testid="hero-cta-primary" onClick={() => navigate('/create')} className="btn-pink text-lg inline-flex items-center gap-2">
                                    Start scribbling <ArrowRight size={18} strokeWidth={2.5} />
                                </button>
                            ) : (
                                <button data-testid="hero-cta-primary" onClick={login} className="btn-pink text-lg inline-flex items-center gap-2">
                                    Sign in with Google <ArrowRight size={18} strokeWidth={2.5} />
                                </button>
                            )}
                            <button data-testid="hero-cta-secondary" onClick={() => document.getElementById('how')?.scrollIntoView({behavior:'smooth'})} className="btn-yellow text-lg">
                                How it works
                            </button>
                        </div>
                        <div className="mt-10 flex items-center gap-3 text-sm text-ink/70 font-body">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-highlight border-2 border-ink" />
                                <div className="w-8 h-8 rounded-full bg-hotpink border-2 border-ink" />
                                <div className="w-8 h-8 rounded-full bg-marker border-2 border-ink" />
                            </div>
                            Loved by daydreamers, doodlers & story nerds.
                        </div>
                    </div>
                    <div className="lg:col-span-5 relative">
                        <div className="relative h-[440px]">
                            {/* Polaroid sketch panels */}
                            <div className="absolute top-0 left-4 w-60 h-72 panel-frame p-3 rotate-[-5deg] animate-floaty">
                                <div className="w-full h-full border-2 border-dashed border-ink/40 grid place-items-center overflow-hidden">
                                    <svg viewBox="0 0 200 240" className="scribble w-full h-full">
                                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="100" cy="90" r="34" />
                                            <path d="M82 85c3-4 9-4 12 0M106 85c3-4 9-4 12 0" />
                                            <path d="M86 102c6 8 22 8 28 0" />
                                            <path d="M70 140c20-10 40-10 60 0l5 60H65z" />
                                            <path d="M100 124v18" />
                                        </g>
                                    </svg>
                                </div>
                                <div className="font-hand text-sm mt-2">"hello world!"</div>
                            </div>
                            <div className="absolute top-10 right-0 w-56 h-64 panel-frame p-3 rotate-[6deg]">
                                <div className="w-full h-full bg-halftone/60 grid place-items-center">
                                    <svg viewBox="0 0 200 200" className="w-full h-full">
                                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round">
                                            <path d="M30 160c40-80 100-80 140 0" />
                                            <path d="M60 130l20-20 15 15 20-30 25 35" />
                                            <circle cx="150" cy="40" r="10" />
                                            <path d="M150 50v25" />
                                            <path d="M50 40c5 0 10 5 10 10" />
                                        </g>
                                    </svg>
                                </div>
                                <div className="font-hand text-sm mt-2">BOOM!</div>
                            </div>
                            <div className="absolute bottom-0 left-16 w-64 h-56 panel-frame p-3 rotate-[-2deg]">
                                <div className="w-full h-full grid place-items-center">
                                    <svg viewBox="0 0 220 180" className="w-full h-full">
                                        <g fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round">
                                            <rect x="30" y="50" width="160" height="90" rx="6" />
                                            <path d="M30 90h160" />
                                            <path d="M110 50v90" />
                                            <path d="M60 70l10 10" />
                                            <path d="M140 70l10 10" />
                                            <path d="M65 115c12 10 28 10 40 0" />
                                        </g>
                                    </svg>
                                </div>
                                <div className="font-hand text-sm mt-2">to be continued...</div>
                            </div>
                            {/* decorations */}
                            <div className="absolute -top-6 -right-4 bg-highlight border-2 border-ink px-3 py-1 font-heading text-xl rotate-[10deg] shadow-ink-sm">POW!</div>
                            <div className="absolute bottom-6 -left-6 bg-hotpink text-white border-2 border-ink px-3 py-1 font-heading text-xl -rotate-[8deg] shadow-ink-sm">ZIP!</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how" className="relative py-20 bg-white border-y-2 border-ink">
                <div className="max-w-7xl mx-auto px-6 lg:px-10">
                    <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
                        <div>
                            <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">3 quick steps</div>
                            <h2 className="font-heading text-5xl sm:text-6xl mt-2">From idea to comic in a minute.</h2>
                        </div>
                        <div className="font-hand text-ink/70 max-w-sm">
                            No drawing skills required. Seriously. Our sketch engine handles the pen.
                        </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((f, i) => (
                            <div key={i} data-testid={`feature-card-${i}`} className="ink-card p-6 hover:-rotate-1 transition-transform">
                                <div className="w-12 h-12 bg-highlight border-2 border-ink grid place-items-center mb-4 shadow-ink-sm">
                                    <f.icon size={22} strokeWidth={2.5} />
                                </div>
                                <div className="font-heading text-3xl">{f.title}</div>
                                <p className="mt-2 text-ink/80 font-body">{f.body}</p>
                                <div className="mt-4 font-display font-bold text-sm">Step {i + 1} →</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" className="relative py-20 bg-paper border-t-2 border-ink">
                <div className="max-w-7xl mx-auto px-6 lg:px-10">
                    <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
                        <div>
                            <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">Honest pricing</div>
                            <h2 className="font-heading text-5xl sm:text-6xl mt-2">Cheaper than the others.</h2>
                        </div>
                        <p className="font-body text-ink/70 max-w-md">20 free credits on signup. Every sketch = 1 credit. Story generation is always free.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="ink-card p-6" data-testid="tier-free">
                            <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Free</div>
                            <div className="font-heading text-5xl mt-2">$0</div>
                            <ul className="mt-3 font-body space-y-1 text-sm">
                                <li>✎ 20 sketch credits</li>
                                <li>✎ Unlimited story generation</li>
                                <li>✎ Grid & Webtoon layouts</li>
                            </ul>
                        </div>
                        <div className="ink-card p-6 bg-highlight/40" data-testid="tier-pro">
                            <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Pro</div>
                            <div className="font-heading text-5xl mt-2">$7.99<span className="text-xl font-body text-ink/60">/mo</span></div>
                            <ul className="mt-3 font-body space-y-1 text-sm">
                                <li>✎ 300 credits every month</li>
                                <li>✎ Character consistency</li>
                                <li>✎ Priority generation</li>
                            </ul>
                        </div>
                        <div className="ink-card p-6 bg-hotpink/10 relative" data-testid="tier-ultimate">
                            <div className="absolute -top-3 -right-3 bg-hotpink text-white border-2 border-ink px-3 py-1 font-heading text-xl -rotate-[6deg] shadow-ink-sm">Best</div>
                            <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Ultimate</div>
                            <div className="font-heading text-5xl mt-2">$15.99<span className="text-xl font-body text-ink/60">/mo</span></div>
                            <ul className="mt-3 font-body space-y-1 text-sm">
                                <li>✎ Unlimited sketches</li>
                                <li>✎ PDF export</li>
                                <li>✎ Everything in Pro + priority</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-6 text-sm font-body text-ink/60">Credit packs also available: $3.99 / $8.99 / $17.99.</div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h3 className="font-heading text-5xl sm:text-6xl">Ready to <span className="sketchy-under">scribble</span>?</h3>
                    <p className="mt-4 text-lg font-body text-ink/80">Sign in with Google. Your comics save automatically.</p>
                    {user ? (
                        <button data-testid="cta-start" onClick={() => navigate('/create')} className="mt-8 btn-pink text-lg inline-flex items-center gap-2">
                            New Comic <ArrowRight size={18} strokeWidth={2.5} />
                        </button>
                    ) : (
                        <button data-testid="cta-start" onClick={login} className="mt-8 btn-pink text-lg">Sign in & start</button>
                    )}
                </div>
            </section>

            <footer className="border-t-2 border-ink py-8 text-center font-body text-ink/70">
                <div className="font-heading text-2xl text-ink">ScribbleComix</div>
                <div className="text-sm">Made with ink & good vibes.</div>
            </footer>
        </div>
    );
};

export default Landing;
