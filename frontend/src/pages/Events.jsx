import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ComicCard from "../components/ComicCard";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Calendar, PartyPopper, Plus, Trash2, X, Palette } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { TINTS } from "../lib/tints";
import DoodleBackground from "../components/DoodleBackground";

const BANNER_COLORS = {
    highlight: { bg: "bg-highlight", text: "text-ink" },
    hotpink:   { bg: "bg-hotpink",   text: "text-white" },
    marker:    { bg: "bg-marker",    text: "text-white" },
    paper:     { bg: "bg-paper",     text: "text-ink" },
    gold:      { bg: "bg-[#FFD700]", text: "text-ink" },
    emerald:   { bg: "bg-[#86A873]", text: "text-white" },
};

const bannerClass = (key) => BANNER_COLORS[key] || BANNER_COLORS.highlight;

const EmojiPicks = ["🎉", "🎃", "👻", "😂", "❤️", "🌸", "🐉", "⚔️", "🎨", "🎄", "🦄", "🌊", "🔥", "🏆", "🌟"];

const CreateEventModal = ({ onClose, onCreated }) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [emoji, setEmoji] = useState("🎉");
    const [banner, setBanner] = useState("highlight");
    const [busy, setBusy] = useState(false);

    const create = async () => {
        if (!title.trim()) return toast.error("Give the event a title");
        try {
            setBusy(true);
            const { data } = await api.post("/events", {
                title: title.trim(),
                description: description.trim(),
                emoji,
                banner_color: banner,
            });
            toast.success("Event created!");
            onCreated?.(data);
            onClose?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Couldn't create event");
        } finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-ink/80 grid place-items-center p-4" data-testid="create-event-modal">
            <div className="ink-card max-w-lg w-full p-6 bg-paper max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="font-heading text-4xl leading-none">New Event</h3>
                    <button onClick={onClose} data-testid="create-event-close" className="btn-ink !p-2"><X size={14}/></button>
                </div>
                <label className="block font-display uppercase text-xs tracking-[0.2em] font-bold">Title</label>
                <input data-testid="event-title-input" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full border-2 border-ink px-3 py-2 font-body bg-white shadow-ink-sm" placeholder="Spooky October, Funny Mondays, Hero Stories..." />
                <label className="block font-display uppercase text-xs tracking-[0.2em] font-bold mt-3">Description</label>
                <textarea data-testid="event-desc-input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full border-2 border-ink px-3 py-2 font-body bg-white shadow-ink-sm" placeholder="What's this event about?"/>
                <label className="block font-display uppercase text-xs tracking-[0.2em] font-bold mt-3">Emoji</label>
                <div className="mt-1 flex flex-wrap gap-1">
                    {EmojiPicks.map((em) => (
                        <button key={em} onClick={() => setEmoji(em)} className={`w-10 h-10 border-2 border-ink text-2xl ${emoji===em?'bg-highlight':'bg-white'}`}>{em}</button>
                    ))}
                </div>
                <label className="block font-display uppercase text-xs tracking-[0.2em] font-bold mt-3">Banner color</label>
                <div className="mt-1 flex flex-wrap gap-2">
                    {Object.keys(BANNER_COLORS).map((k) => {
                        const c = bannerClass(k);
                        return (
                            <button key={k} onClick={() => setBanner(k)} className={`px-3 py-1.5 border-2 border-ink font-display font-bold text-xs uppercase ${c.bg} ${c.text} ${banner===k?'shadow-ink ring-2 ring-ink':''}`}>{k}</button>
                        );
                    })}
                </div>
                <div className="mt-5 flex gap-2 flex-wrap">
                    <button onClick={create} disabled={busy} data-testid="event-create-submit" className="btn-pink">{busy ? "Creating…" : "Create Event"}</button>
                    <button onClick={onClose} className="btn-ink">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export const SubmitToEventModal = ({ event, onClose, onSubmitted }) => {
    const [myComics, setMyComics] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [tint, setTint] = useState("none");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/comics");
                setMyComics(data || []);
                if (data && data.length > 0) setSelectedId(data[0].comic_id);
            } catch (_e) { /* ignore */ }
        })();
    }, []);

    const submit = async () => {
        if (!selectedId) return toast.error("Pick a comic to submit");
        try {
            setBusy(true);
            const body = { comic_id: selectedId };
            if (tint && tint !== "none") body.tint = tint;
            await api.post(`/events/${event.event_id}/submit`, body);
            toast.success("Submitted to event!");
            onSubmitted?.();
            onClose?.();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Couldn't submit");
        } finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-ink/80 grid place-items-center p-4" data-testid="submit-event-modal">
            <div className="ink-card max-w-xl w-full p-6 bg-paper max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Submit to event</div>
                        <h3 className="font-heading text-4xl leading-none mt-1">{event.emoji} {event.title}</h3>
                    </div>
                    <button onClick={onClose} data-testid="submit-event-close" className="btn-ink !p-2"><X size={14}/></button>
                </div>
                <p className="font-body text-sm text-ink/70">Submitting will make your comic public and attach it to this event.</p>
                <div className="mt-4">
                    <label className="block font-display uppercase text-xs tracking-[0.2em] font-bold">Pick a comic</label>
                    {myComics.length === 0 ? (
                        <div className="mt-2 border-2 border-dashed border-ink p-4 text-center font-body text-sm">
                            You haven't made any comics yet. <a href="/create" className="text-hotpink font-bold underline">Create one</a>.
                        </div>
                    ) : (
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
                            {myComics.map((c) => (
                                <button
                                    key={c.comic_id}
                                    onClick={() => setSelectedId(c.comic_id)}
                                    data-testid={`event-pick-${c.comic_id}`}
                                    className={`border-2 border-ink p-1.5 text-left ${selectedId === c.comic_id ? 'bg-highlight shadow-ink-sm' : 'bg-white'}`}
                                >
                                    <div className="aspect-[4/3] border border-ink bg-paper overflow-hidden grid place-items-center">
                                        {c.panels?.[0]?.image_base64 ? (
                                            <img src={c.panels[0].image_base64} alt={c.title} className="w-full h-full object-cover" />
                                        ) : <div className="text-xs text-ink/40">(no panel)</div>}
                                    </div>
                                    <div className="mt-1 font-display font-bold text-xs leading-tight line-clamp-2">{c.title}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <label className="block font-display uppercase text-xs tracking-[0.2em] font-bold flex items-center gap-1"><Palette size={12}/> Color palette <span className="text-ink/60 normal-case tracking-normal">(free for everyone)</span></label>
                    <div className="mt-2 grid grid-cols-8 gap-1.5">
                        {TINTS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTint(t.key)}
                                data-testid={`tint-${t.key}`}
                                className={`w-8 h-8 border-2 border-ink ${tint === t.key ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                                title={t.label}
                                style={{ background: t.hex === "transparent" ? "repeating-linear-gradient(45deg, #fff 0 4px, #eee 4px 8px)" : t.hex }}
                            />
                        ))}
                    </div>
                </div>
                <div className="mt-5 flex gap-2 flex-wrap">
                    <button onClick={submit} disabled={busy || !selectedId} data-testid="event-submit-go" className="btn-pink inline-flex items-center gap-1">
                        <PartyPopper size={14}/> {busy ? "Submitting…" : "Submit to Event"}
                    </button>
                    <button onClick={onClose} className="btn-ink">Cancel</button>
                </div>
            </div>
        </div>
    );
};

const EventsList = ({ user, events, onDelete, onOpen, onCreate }) => {
    const isAdmin = user?.role === "founder" || user?.role === "co_founder";
    return (
        <>
            <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
                <div>
                    <div className="font-display uppercase tracking-[0.2em] text-xs font-bold text-ink/70">Community challenges</div>
                    <h1 className="font-heading text-6xl leading-none mt-1 flex items-center gap-3">
                        <Calendar size={44} strokeWidth={2.5}/> Events
                    </h1>
                    <p className="font-body text-sm text-ink/70 mt-2 max-w-lg">Join themed challenges, submit your comics, and show the world what you've got.</p>
                </div>
                {isAdmin && (
                    <button onClick={onCreate} data-testid="events-create-btn" className="btn-pink inline-flex items-center gap-2">
                        <Plus size={16} strokeWidth={2.5}/> New Event
                    </button>
                )}
            </div>
            {events.length === 0 ? (
                <div className="ink-card p-10 text-center tape" data-testid="events-empty">
                    <div className="font-heading text-5xl">No events yet.</div>
                    <p className="mt-3 text-ink/80 font-body">
                        {isAdmin ? "Create the first one!" : "Check back soon — the founders are cooking something up."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="events-grid">
                    {events.map((e, idx) => {
                        const c = bannerClass(e.banner_color);
                        return (
                            <div
                                key={e.event_id}
                                onClick={() => onOpen(e)}
                                data-testid={`event-card-${e.event_id}`}
                                className={`border-2 border-ink shadow-ink ${c.bg} ${c.text} p-5 cursor-pointer hover:-translate-y-1 hover:-rotate-1 transition-transform relative`}
                                style={{ transform: `rotate(${idx % 2 ? -0.5 : 0.5}deg)` }}
                            >
                                <div className="text-5xl">{e.emoji || "🎉"}</div>
                                <h3 className="font-heading text-3xl leading-none mt-2">{e.title}</h3>
                                {e.description && <p className="mt-2 font-body text-sm opacity-90 line-clamp-3">{e.description}</p>}
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <span className="px-2 py-0.5 border-2 border-ink bg-white text-ink font-display font-bold text-xs uppercase tracking-wide">
                                        {e.submission_count || 0} entries
                                    </span>
                                    {isAdmin && (
                                        <button
                                            onClick={(ev) => { ev.stopPropagation(); onDelete(e); }}
                                            data-testid={`event-delete-${e.event_id}`}
                                            className="px-2 py-1 border-2 border-ink bg-white text-ink text-xs font-display font-bold"
                                        >
                                            <Trash2 size={12}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

const EventDetail = ({ eventId, user }) => {
    const navigate = useNavigate();
    const [ev, setEv] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitOpen, setSubmitOpen] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/events/${eventId}`);
            setEv(data.event);
            setItems(data.submissions || []);
        } catch (e) {
            toast.error("Couldn't load event");
            navigate('/events');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [eventId]); // eslint-disable-line

    const onLike = async (card) => {
        try {
            const { data } = await api.post(`/comics/${card.comic_id}/like`);
            setItems((arr) => arr.map((c) => c.comic_id === card.comic_id
                ? { ...c, is_liked: data.liked, like_count: data.like_count } : c));
        } catch (_e) { /* ignore */ }
    };
    const onSave = async (card) => {
        try {
            const { data } = await api.post(`/comics/${card.comic_id}/save`);
            setItems((arr) => arr.map((c) => c.comic_id === card.comic_id
                ? { ...c, is_saved: data.saved, save_count: (c.save_count || 0) + (data.saved ? 1 : -1) } : c));
        } catch (_e) { /* ignore */ }
    };

    if (loading || !ev) return <div className="py-20 text-center font-heading text-3xl">Loading…</div>;

    const c = bannerClass(ev.banner_color);
    return (
        <div data-testid="event-detail">
            <div className={`border-2 border-ink shadow-ink ${c.bg} ${c.text} px-6 py-8 mb-6 relative tape`}>
                <div className="flex items-start gap-4 flex-wrap">
                    <div className="text-7xl">{ev.emoji || "🎉"}</div>
                    <div className="flex-1 min-w-0">
                        <div className="font-display uppercase tracking-[0.2em] text-xs font-bold opacity-80">Event</div>
                        <h1 className="font-heading text-5xl sm:text-6xl leading-none mt-1">{ev.title}</h1>
                        {ev.description && <p className="mt-3 font-body opacity-90 max-w-2xl">{ev.description}</p>}
                        <div className="mt-3 inline-flex items-center gap-2">
                            <span className="px-2 py-1 border-2 border-ink bg-white text-ink font-display font-bold text-xs uppercase tracking-wide">{ev.submission_count || 0} entries</span>
                            {user && (
                                <button onClick={() => setSubmitOpen(true)} data-testid="event-detail-submit-btn" className="inline-flex items-center gap-1 px-3 py-2 border-2 border-ink bg-ink text-paper font-display font-bold uppercase text-xs tracking-[0.15em] hover:-translate-y-0.5 transition-transform">
                                    <PartyPopper size={12}/> Submit your comic
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {items.length === 0 ? (
                <div className="ink-card p-8 text-center"><div className="font-heading text-4xl">No entries yet.</div><p className="mt-2 font-body text-ink/70">Be the first to submit!</p></div>
            ) : (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
                    {items.map((x, i) => (
                        <ComicCard key={x.comic_id} card={x} index={i} onLike={onLike} onSave={onSave} loggedIn={!!user} />
                    ))}
                </div>
            )}
            {submitOpen && <SubmitToEventModal event={ev} onClose={() => setSubmitOpen(false)} onSubmitted={load} />}
        </div>
    );
};

const Events = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { eventId } = useParams();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/events");
            setEvents(data.items || []);
        } catch (e) { toast.error("Couldn't load events"); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadEvents(); }, []);

    const onDelete = async (e) => {
        if (!window.confirm(`Delete event "${e.title}"?`)) return;
        try {
            await api.delete(`/events/${e.event_id}`);
            toast.success("Event deleted");
            loadEvents();
        } catch (_e) { toast.error("Couldn't delete"); }
    };

    return (
        <div className="min-h-screen relative" data-testid="events-page">
            <DoodleBackground variant="events" density="medium" />
            <Navbar />
            <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-10">
                {eventId ? (
                    <EventDetail eventId={eventId} user={user} />
                ) : loading ? (
                    <div className="py-20 text-center font-heading text-3xl">Loading…</div>
                ) : (
                    <EventsList
                        user={user}
                        events={events}
                        onDelete={onDelete}
                        onOpen={(e) => navigate(`/events/${e.event_id}`)}
                        onCreate={() => setCreateOpen(true)}
                    />
                )}
            </main>
            {createOpen && <CreateEventModal onClose={() => setCreateOpen(false)} onCreated={loadEvents} />}
        </div>
    );
};

export default Events;
