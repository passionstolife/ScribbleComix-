import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, BookOpen, Calendar } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
    const [comics, setComics] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const load = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/comics");
            setComics(data);
        } catch (e) {
            toast.error("Failed to load comics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const onDelete = async (id) => {
        if (!window.confirm("Delete this comic?")) return;
        try {
            await api.delete(`/comics/${id}`);
            toast.success("Comic deleted");
            setComics((c) => c.filter((x) => x.comic_id !== id));
        } catch (e) {
            toast.error("Couldn't delete");
        }
    };

    return (
        <div className="min-h-screen" data-testid="dashboard-page">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
                <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
                    <div>
                        <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">Your shelf</div>
                        <h1 className="font-heading text-6xl leading-none mt-1">My Comics</h1>
                    </div>
                    <button data-testid="dashboard-new-btn" onClick={() => navigate('/create')} className="btn-pink inline-flex items-center gap-2">
                        <Plus size={18} strokeWidth={2.5} /> New Comic
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[0,1,2].map(i => <div key={i} className="h-64 ink-card animate-pulse" />)}
                    </div>
                ) : comics.length === 0 ? (
                    <div className="ink-card p-10 text-center relative tape" data-testid="dashboard-empty">
                        <div className="font-heading text-5xl">The shelf is empty.</div>
                        <p className="mt-3 text-ink/80 font-body">Scribble your first story — it only takes a minute.</p>
                        <button onClick={() => navigate('/create')} className="mt-6 btn-yellow inline-flex items-center gap-2">
                            <Plus size={18} strokeWidth={2.5} /> Create one
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="comics-grid">
                        {comics.map((c, idx) => (
                            <div key={c.comic_id} data-testid={`comic-card-${c.comic_id}`} className="ink-card p-4 hover:-rotate-1 hover:-translate-y-1 transition-all" style={{ transform: `rotate(${idx % 2 ? -0.8 : 0.8}deg)` }}>
                                <div className="aspect-[4/3] border-2 border-ink bg-paper overflow-hidden grid place-items-center">
                                    {c.panels?.[0]?.image_base64 ? (
                                        <img src={c.panels[0].image_base64} alt={c.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="font-heading text-5xl text-ink/40">?!</div>
                                    )}
                                </div>
                                <div className="mt-3">
                                    <div className="font-heading text-3xl leading-none line-clamp-1">{c.title}</div>
                                    <p className="font-body text-sm text-ink/70 mt-1 line-clamp-2">{c.synopsis || "No synopsis yet."}</p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-xs text-ink/60 font-body">
                                            <Calendar size={12} /> {new Date(c.updated_at).toLocaleDateString()}
                                            <span className="ml-2 px-2 py-0.5 border border-ink bg-highlight/80 font-bold">{c.layout}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button data-testid={`open-${c.comic_id}`} onClick={() => navigate(`/comic/${c.comic_id}`)} className="btn-ink !py-1.5 !px-3 text-xs inline-flex items-center gap-1">
                                                <BookOpen size={14}/> Open
                                            </button>
                                            <button data-testid={`delete-${c.comic_id}`} onClick={() => onDelete(c.comic_id)} className="btn-ink !py-1.5 !px-3 text-xs">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
