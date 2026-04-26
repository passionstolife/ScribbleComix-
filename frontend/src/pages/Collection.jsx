import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ComicCard from "../components/ComicCard";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Bookmark, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Collection = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/collection/me");
            setItems(data.items || []);
        } catch (e) {
            toast.error("Couldn't load your collection");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const onLike = async (card) => {
        try {
            const { data } = await api.post(`/comics/${card.comic_id}/like`);
            setItems((arr) => arr.map((c) => c.comic_id === card.comic_id
                ? { ...c, is_liked: data.liked, like_count: data.like_count } : c));
        } catch (_e) { toast.error("Couldn't like"); }
    };

    const onSave = async (card) => {
        // unsave removes from collection
        try {
            const { data } = await api.post(`/comics/${card.comic_id}/save`);
            if (!data.saved) {
                setItems((arr) => arr.filter((c) => c.comic_id !== card.comic_id));
                toast.success("Removed from collection");
            }
        } catch (_e) { toast.error("Couldn't update"); }
    };

    return (
        <div className="min-h-screen" data-testid="collection-page">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
                <div className="mb-6">
                    <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">Pinned</div>
                    <h1 className="font-heading text-6xl leading-none mt-1 flex items-center gap-3">
                        <Bookmark size={44} strokeWidth={2.5}/> My Collection
                    </h1>
                    <p className="font-body text-sm text-ink/70 mt-2 max-w-lg">Your personal board of favorites. Saved comics from other creators — your inspiration library.</p>
                </div>
                {loading ? (
                    <div className="py-20 text-center font-heading text-3xl flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={28}/> Loading…
                    </div>
                ) : items.length === 0 ? (
                    <div className="ink-card p-10 text-center tape" data-testid="collection-empty">
                        <div className="font-heading text-5xl">Your board is empty.</div>
                        <p className="mt-3 text-ink/80 font-body">Head to Discover and tap the bookmark on comics you love.</p>
                        <a href="/discover" className="mt-6 inline-flex items-center gap-2 btn-yellow">Go to Discover</a>
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5" data-testid="collection-grid">
                        {items.map((c, i) => (
                            <ComicCard key={c.comic_id} card={c} index={i} onLike={onLike} onSave={onSave} loggedIn={!!user} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Collection;
