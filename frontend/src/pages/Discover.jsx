import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ComicCard from "../components/ComicCard";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Loader2, Sparkles, Flame, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Discover = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState("recent");
    const [events, setEvents] = useState([]);
    const [filterEvent, setFilterEvent] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const params = { sort };
            if (filterEvent) params.event_id = filterEvent;
            const { data } = await api.get("/discover", { params });
            setItems(data.items || []);
        } catch (e) {
            toast.error("Couldn't load discover feed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [sort, filterEvent]); // eslint-disable-line

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/events");
                setEvents(data.items || []);
            } catch (_e) { /* ignore */ }
        })();
    }, []);

    const onLike = async (card) => {
        if (!user) return toast.error("Sign in to like");
        try {
            const { data } = await api.post(`/comics/${card.comic_id}/like`);
            setItems((arr) => arr.map((c) => c.comic_id === card.comic_id
                ? { ...c, is_liked: data.liked, like_count: data.like_count }
                : c));
        } catch (_e) { toast.error("Couldn't like"); }
    };

    const onSave = async (card) => {
        if (!user) return toast.error("Sign in to save");
        try {
            const { data } = await api.post(`/comics/${card.comic_id}/save`);
            setItems((arr) => arr.map((c) => c.comic_id === card.comic_id
                ? { ...c, is_saved: data.saved, save_count: (c.save_count || 0) + (data.saved ? 1 : -1) }
                : c));
            toast.success(data.saved ? "Saved to your collection!" : "Removed from collection");
        } catch (_e) { toast.error("Couldn't save"); }
    };

    return (
        <div className="min-h-screen" data-testid="discover-page">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
                <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
                    <div>
                        <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">Community</div>
                        <h1 className="font-heading text-6xl leading-none mt-1">Discover</h1>
                        <p className="font-body text-sm text-ink/70 mt-2 max-w-lg">Browse comics made by creators across ScribbleComix. Like, save, and steal ideas (in the good way).</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={() => setSort('recent')} data-testid="sort-recent" className={`px-3 py-2 border-2 border-ink font-display font-bold text-xs uppercase tracking-[0.15em] inline-flex items-center gap-1 ${sort==='recent' ? 'bg-highlight shadow-ink-sm' : 'bg-white'}`}>
                            <Clock size={12}/> Recent
                        </button>
                        <button onClick={() => setSort('popular')} data-testid="sort-popular" className={`px-3 py-2 border-2 border-ink font-display font-bold text-xs uppercase tracking-[0.15em] inline-flex items-center gap-1 ${sort==='popular' ? 'bg-hotpink text-white shadow-ink-sm' : 'bg-white'}`}>
                            <Flame size={12}/> Popular
                        </button>
                    </div>
                </div>

                {events.length > 0 && (
                    <div className="mb-6 flex gap-2 flex-wrap items-center" data-testid="event-filter-row">
                        <span className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70 mr-1">Events:</span>
                        <button onClick={() => setFilterEvent(null)} data-testid="event-filter-all" className={`px-3 py-1 border-2 border-ink font-display font-bold text-xs uppercase tracking-wide ${!filterEvent ? 'bg-ink text-paper' : 'bg-white'}`}>All</button>
                        {events.map((e) => (
                            <button
                                key={e.event_id}
                                onClick={() => setFilterEvent(e.event_id)}
                                data-testid={`event-filter-${e.event_id}`}
                                className={`px-3 py-1 border-2 border-ink font-display font-bold text-xs uppercase tracking-wide inline-flex items-center gap-1 ${filterEvent === e.event_id ? 'bg-highlight shadow-ink-sm' : 'bg-white'}`}
                            >
                                <span>{e.emoji || "🎉"}</span> {e.title}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="py-20 text-center font-heading text-3xl flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={28}/> Loading…
                    </div>
                ) : items.length === 0 ? (
                    <div className="ink-card p-10 text-center tape" data-testid="discover-empty">
                        <div className="font-heading text-5xl">Nothing here yet.</div>
                        <p className="mt-3 text-ink/80 font-body">Be the first to publish a public comic!</p>
                        <a href="/create" className="mt-6 inline-flex items-center gap-2 btn-pink"><Sparkles size={16} strokeWidth={2.5}/> Create one</a>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5" data-testid="discover-grid">
                        {items.map((c, i) => (
                            <ComicCard key={c.comic_id} card={c} index={i} onLike={onLike} onSave={onSave} loggedIn={!!user} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Discover;
