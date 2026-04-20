import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { BookOpenCheck, Sparkles, LayoutGrid, AlignJustify } from "lucide-react";

const PublicReader = () => {
    const { shareId } = useParams();
    const [comic, setComic] = useState(null);
    const [err, setErr] = useState(null);
    const [layoutOverride, setLayoutOverride] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get(`/public/comics/${shareId}`);
                setComic(data);
                document.title = `${data.title} — ScribbleComix`;
            } catch (e) {
                setErr(e?.response?.status === 404 ? "This comic isn't public (or doesn't exist)." : "Couldn't load this comic.");
            }
        })();
    }, [shareId]);

    const layout = layoutOverride || comic?.layout || "grid";

    return (
        <div className="min-h-screen" data-testid="public-reader-page">
            {/* Minimal public navbar */}
            <header className="relative z-10 border-b-2 border-ink bg-paper">
                <div className="max-w-5xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between gap-3">
                    <Link to="/" className="flex items-center gap-2" data-testid="public-logo">
                        <div className="w-10 h-10 bg-highlight border-2 border-ink grid place-items-center shadow-ink-sm">
                            <BookOpenCheck size={20} strokeWidth={2.5} />
                        </div>
                        <span className="font-heading text-3xl leading-none pt-1">Scribble<span className="text-hotpink">Comix</span></span>
                    </Link>
                    <Link to="/" data-testid="public-make-your-own" className="btn-pink !py-2 !px-4 text-sm inline-flex items-center gap-2">
                        <Sparkles size={14} strokeWidth={2.5}/> Make your own
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
                {err ? (
                    <div className="ink-card p-10 text-center" data-testid="public-error">
                        <h1 className="font-heading text-5xl">Oof.</h1>
                        <p className="mt-2 font-body text-ink/80">{err}</p>
                        <Link to="/" className="mt-6 inline-block btn-yellow">Go home</Link>
                    </div>
                ) : !comic ? (
                    <div className="font-heading text-4xl">Opening…</div>
                ) : (
                    <>
                        <div className="flex items-center justify-end mb-4">
                            <div className="flex border-2 border-ink">
                                <button data-testid="public-layout-grid" onClick={() => setLayoutOverride('grid')} className={`px-3 py-1.5 font-display font-bold text-sm inline-flex items-center gap-1 ${layout==='grid'?'bg-highlight':'bg-white'}`}>
                                    <LayoutGrid size={14}/> Grid
                                </button>
                                <button data-testid="public-layout-webtoon" onClick={() => setLayoutOverride('webtoon')} className={`px-3 py-1.5 font-display font-bold text-sm inline-flex items-center gap-1 ${layout==='webtoon'?'bg-highlight':'bg-white'}`}>
                                    <AlignJustify size={14}/> Webtoon
                                </button>
                            </div>
                        </div>
                        <div className="ink-card p-6 lg:p-10 relative tape">
                            <h1 className="font-heading text-5xl sm:text-6xl leading-none" data-testid="public-title">{comic.title}</h1>
                            {comic.author_name && (
                                <div className="mt-2 font-hand text-ink/70">by {comic.author_name}</div>
                            )}
                            {comic.synopsis && <p className="mt-3 font-body text-ink/80 max-w-2xl">{comic.synopsis}</p>}
                            <div className={`mt-8 ${layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-6 max-w-xl mx-auto'}`}>
                                {comic.panels.map((p, i) => (
                                    <div key={p.id || i} className="panel-frame p-3" data-testid={`public-panel-${i}`} style={{ transform: `rotate(${i%2?-0.6:0.6}deg)` }}>
                                        <div className="aspect-[4/3] border-2 border-ink bg-paper overflow-hidden relative grid place-items-center">
                                            {p.image_base64 ? (
                                                <img src={p.image_base64} alt={`Panel ${i+1}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="font-hand text-ink/40">(no sketch)</div>
                                            )}
                                            {p.dialogue && (
                                                <div className="absolute top-2 left-2 max-w-[70%] bg-white border-2 border-ink px-2 py-1 font-hand text-sm shadow-ink-sm">{p.dialogue}</div>
                                            )}
                                        </div>
                                        {p.caption && <div className="mt-2 font-hand text-sm">{p.caption}</div>}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-10 text-center border-t-2 border-dashed border-ink/20 pt-6">
                                <div className="font-hand text-ink/60 text-sm">Made with</div>
                                <Link to="/" className="font-heading text-4xl hover:text-hotpink transition-colors">
                                    Scribble<span className="text-hotpink">Comix</span>
                                </Link>
                                <div className="mt-3">
                                    <Link to="/" className="btn-yellow inline-flex items-center gap-2 text-sm !py-2 !px-4" data-testid="public-cta-make">
                                        <Sparkles size={14} strokeWidth={2.5}/> Doodle your own comic
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default PublicReader;
