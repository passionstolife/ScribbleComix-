import React from "react";
import { Heart, Bookmark, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { tintByKey } from "../lib/tints";

const PALETTE_TRANSFORMS = ["rotate(-0.8deg)", "rotate(0.6deg)", "rotate(-0.4deg)", "rotate(1deg)", "rotate(-1.1deg)", "rotate(0.3deg)"];

export const ComicCard = ({
    card,
    onLike,
    onSave,
    loggedIn = true,
    onOpen,
    index = 0,
}) => {
    const navigate = useNavigate();
    const tint = tintByKey(card.tint);
    const openComic = () => {
        if (onOpen) onOpen(card);
        else if (card.share_id) navigate(`/read/${card.share_id}`);
    };
    const rot = PALETTE_TRANSFORMS[index % PALETTE_TRANSFORMS.length];
    return (
        <div
            data-testid={`discover-card-${card.comic_id}`}
            className="ink-card p-3 bg-white hover:-translate-y-1 transition-transform break-inside-avoid mb-5 relative"
            style={{ transform: rot, borderColor: tint.hex !== "transparent" ? tint.hex : undefined }}
        >
            {tint.hex !== "transparent" && (
                <div className="absolute -top-2 -right-3 w-10 h-4 rotate-12 border-2 border-ink shadow-ink-sm" style={{ background: tint.hex }} />
            )}
            <button
                onClick={openComic}
                className="block w-full text-left"
                data-testid={`discover-open-${card.comic_id}`}
            >
                <div className="aspect-[4/3] border-2 border-ink bg-paper overflow-hidden grid place-items-center">
                    {card.cover_image ? (
                        <img src={card.cover_image} alt={card.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="font-heading text-5xl text-ink/40">?!</div>
                    )}
                </div>
            </button>
            <div className="mt-3">
                <div className="font-heading text-2xl leading-none line-clamp-1">{card.title}</div>
                <div className="mt-1 font-body text-xs text-ink/60">by {card.author_name || "Anonymous"} · {card.panel_count} panels</div>
                {card.synopsis && <p className="mt-1 font-body text-sm text-ink/70 line-clamp-2">{card.synopsis}</p>}
                <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => loggedIn ? onLike?.(card) : navigate('/')}
                            data-testid={`like-${card.comic_id}`}
                            className={`inline-flex items-center gap-1 px-2 py-1 border-2 border-ink rounded-sm text-xs font-display font-bold shadow-ink-sm hover:-translate-y-0.5 transition-transform ${card.is_liked ? "bg-hotpink text-white" : "bg-white"}`}
                        >
                            <Heart size={12} strokeWidth={2.5} fill={card.is_liked ? "currentColor" : "none"} /> {card.like_count || 0}
                        </button>
                        <button
                            onClick={() => loggedIn ? onSave?.(card) : navigate('/')}
                            data-testid={`save-${card.comic_id}`}
                            className={`inline-flex items-center gap-1 px-2 py-1 border-2 border-ink rounded-sm text-xs font-display font-bold shadow-ink-sm hover:-translate-y-0.5 transition-transform ${card.is_saved ? "bg-highlight text-ink" : "bg-white"}`}
                        >
                            <Bookmark size={12} strokeWidth={2.5} fill={card.is_saved ? "currentColor" : "none"} /> {card.save_count || 0}
                        </button>
                    </div>
                    <button
                        onClick={openComic}
                        className="btn-ink !py-1 !px-2 text-xs inline-flex items-center gap-1"
                    >
                        <BookOpen size={12}/> Read
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComicCard;
