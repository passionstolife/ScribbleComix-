import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Pencil, LayoutGrid, AlignJustify, FileDown, Crown, Share2, Loader2, Film } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import CinematicReader from "../components/CinematicReader";

const Reader = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { billing, user } = useAuth();
    const isUltimate = billing?.tier === "ultimate";
    const [comic, setComic] = useState(null);
    const [layoutOverride, setLayoutOverride] = useState(null);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [cinematicOpen, setCinematicOpen] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get(`/comics/${id}`);
                setComic(data);
            } catch (e) {
                toast.error("Couldn't load comic");
                navigate('/dashboard');
            }
        })();
    }, [id, navigate]);

    if (!comic) {
        return <div className="min-h-screen grid place-items-center font-heading text-4xl">Opening the book…</div>;
    }

    const layout = layoutOverride || comic.layout;

    const downloadPDF = async () => {
        if (!isUltimate) {
            toast.error("PDF export is an Ultimate perk.", { action: { label: "Upgrade", onClick: () => navigate('/billing') } });
            return;
        }
        setExportingPdf(true);
        try {
            // Dynamic import: jsPDF is loaded only when Ultimate user triggers PDF export.
            const { jsPDF } = await import("jspdf");
            const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 36;

            // Title page
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(32);
            pdf.text(comic.title, margin, margin + 32);
            if (comic.synopsis) {
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(12);
                const lines = pdf.splitTextToSize(comic.synopsis, pageW - margin * 2);
                pdf.text(lines, margin, margin + 64);
            }

            // Grid layout: 2 cols x 3 rows per page
            const cols = 2, rows = 3;
            const gap = 16;
            const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
            const cellH = (pageH - margin * 2 - gap * (rows - 1)) / rows - 20; // leave room for caption
            let idx = 0;
            pdf.addPage();
            for (const p of comic.panels) {
                const posInPage = idx % (cols * rows);
                if (posInPage === 0 && idx !== 0) pdf.addPage();
                const col = posInPage % cols;
                const row = Math.floor(posInPage / cols);
                const x = margin + col * (cellW + gap);
                const y = margin + row * (cellH + gap + 20);
                // Border
                pdf.setLineWidth(2);
                pdf.rect(x, y, cellW, cellH);
                if (p.image_base64) {
                    try {
                        pdf.addImage(p.image_base64, "PNG", x + 2, y + 2, cellW - 4, cellH - 4, undefined, "FAST");
                    } catch (_e) { /* ignore */ }
                }
                // Caption
                pdf.setFont("helvetica", "italic");
                pdf.setFontSize(10);
                const capLines = pdf.splitTextToSize(p.caption || "", cellW);
                pdf.text(capLines.slice(0, 2), x, y + cellH + 12);
                idx += 1;
            }
            pdf.save(`${comic.title.replace(/[^a-z0-9-_]/gi, '_')}.pdf`);
            toast.success("PDF downloaded!");
        } catch (e) {
            toast.error("PDF export failed");
        } finally {
            setExportingPdf(false);
        }
    };

    const downloadHTML = () => {
        const html = `<!doctype html><html><head><meta charset='utf-8'><title>${comic.title}</title>
        <style>body{font-family:sans-serif;background:#FDFBF7;padding:24px;}h1{font-family:cursive;font-size:48px;}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;}
        .panel{border:2px solid #111;background:#fff;padding:8px;box-shadow:5px 5px 0 #111;}
        .panel img{width:100%;display:block;border:2px solid #111;}
        .cap{margin-top:6px;font-family:cursive;font-size:14px;}
        .dia{display:inline-block;background:#fff;border:2px solid #111;padding:2px 6px;font-style:italic;}
        </style></head><body>
        <h1>${escapeHtml(comic.title)}</h1>
        <p>${escapeHtml(comic.synopsis || '')}</p>
        <div class='${layout === 'grid' ? 'grid' : ''}'>
        ${comic.panels.map((p, i) => `<div class='panel'>
            ${p.image_base64 ? `<img src='${p.image_base64}' alt='Panel ${i+1}'/>` : `<div style='height:200px;border:2px dashed #999'></div>`}
            ${p.dialogue ? `<div class='dia'>${escapeHtml(p.dialogue)}</div>` : ''}
            <div class='cap'>${escapeHtml(p.caption || '')}</div>
        </div>`).join('')}
        </div></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${comic.title.replace(/[^a-z0-9-_]/gi, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const doShare = async () => {
        setSharing(true);
        try {
            let shareId = comic.share_id;
            if (!shareId || !comic.is_public) {
                const { data } = await api.post(`/comics/${comic.comic_id}/share`);
                shareId = data.share_id;
                setComic((c) => ({ ...c, share_id: shareId, is_public: true }));
            }
            const shareUrl = `${window.location.origin}/read/${shareId}`;
            try {
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Share link copied!", { description: shareUrl });
            } catch (_e) {
                toast.success("Public link ready", { description: shareUrl });
            }
        } catch (e) {
            toast.error("Could not create share link");
        } finally {
            setSharing(false);
        }
    };

    return (
        <div className="min-h-screen" data-testid="reader-page">
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <button onClick={() => navigate('/dashboard')} className="text-sm font-body inline-flex items-center gap-1 hover:underline" data-testid="reader-back">
                        <ArrowLeft size={14}/> Back
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="flex border-2 border-ink">
                            <button data-testid="reader-layout-grid" onClick={() => setLayoutOverride('grid')} className={`px-3 py-1.5 font-display font-bold text-sm inline-flex items-center gap-1 ${layout==='grid'?'bg-highlight':'bg-white'}`}>
                                <LayoutGrid size={14}/> Grid
                            </button>
                            <button data-testid="reader-layout-webtoon" onClick={() => setLayoutOverride('webtoon')} className={`px-3 py-1.5 font-display font-bold text-sm inline-flex items-center gap-1 ${layout==='webtoon'?'bg-highlight':'bg-white'}`}>
                                <AlignJustify size={14}/> Webtoon
                            </button>
                        </div>
                        <button data-testid="reader-edit" onClick={() => navigate(`/create/${comic.comic_id}`)} className="btn-ink !py-2 !px-3 text-sm inline-flex items-center gap-1">
                            <Pencil size={14}/> Edit
                        </button>
                        <button data-testid="reader-download" onClick={downloadHTML} className="btn-yellow !py-2 !px-3 text-sm inline-flex items-center gap-1">
                            <Download size={14}/> HTML
                        </button>
                        <button
                            data-testid="reader-pdf"
                            onClick={downloadPDF}
                            disabled={exportingPdf}
                            className={`!py-2 !px-3 text-sm inline-flex items-center gap-1 ${isUltimate ? 'btn-pink' : 'btn-ink'}`}
                            title={isUltimate ? "Download PDF" : "Ultimate-only — click to see plans"}
                        >
                            {isUltimate ? <FileDown size={14}/> : <Crown size={14}/>} {exportingPdf ? "Exporting…" : "PDF"}
                        </button>
                        <button
                            data-testid="reader-cinematic"
                            onClick={() => setCinematicOpen(true)}
                            className="btn-pink !py-2 !px-3 text-sm inline-flex items-center gap-1"
                            title="Play with narrator + music + animations"
                        >
                            <Film size={14}/> Cinematic
                        </button>
                        <button
                            data-testid="reader-share"
                            onClick={doShare}
                            disabled={sharing}
                            className="btn-blue !py-2 !px-3 text-sm inline-flex items-center gap-1"
                            title="Create public share link"
                        >
                            {sharing ? <Loader2 className="animate-spin" size={14}/> : <Share2 size={14}/>} {comic?.is_public ? "Copy link" : "Share"}
                        </button>
                    </div>
                </div>

                <div className="ink-card p-6 lg:p-10 relative tape">
                    <h1 className="font-heading text-5xl sm:text-6xl leading-none">{comic.title}</h1>
                    {comic.synopsis && <p className="mt-3 font-body text-ink/80 max-w-2xl">{comic.synopsis}</p>}
                    <div className={`mt-8 ${layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-6 max-w-xl mx-auto'}`}>
                        {comic.panels.map((p, i) => (
                            <div key={p.id || i} className="panel-frame p-3" data-testid={`reader-panel-${i}`} style={{ transform: `rotate(${i%2?-0.6:0.6}deg)` }}>
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
                </div>
            </main>
            {cinematicOpen && (
                <CinematicReader
                    comic={comic}
                    tier={billing?.tier || "free"}
                    unlimited={!!user?.unlimited}
                    onClose={() => setCinematicOpen(false)}
                    onUpsell={() => navigate('/billing')}
                />
            )}
        </div>
    );
};

const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default Reader;
