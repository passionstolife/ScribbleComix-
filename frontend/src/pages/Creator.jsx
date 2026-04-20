import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { api } from "../lib/api";
import { useNavigate, useParams } from "react-router-dom";
import { Wand2, Save, Image as ImageIcon, LayoutGrid, AlignJustify, Plus, Trash2, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const emptyPanel = () => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2),
    caption: "",
    dialogue: "",
    image_prompt: "",
    image_base64: null,
});

const Creator = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { fetchBilling } = useAuth();
    const [loadingComic, setLoadingComic] = useState(!!id);
    const [title, setTitle] = useState("Untitled Comic");
    const [synopsis, setSynopsis] = useState("");
    const [layout, setLayout] = useState("grid");
    const [panels, setPanels] = useState([emptyPanel(), emptyPanel(), emptyPanel(), emptyPanel()]);
    const [prompt, setPrompt] = useState("");
    const [numPanels, setNumPanels] = useState(6);
    const [generating, setGenerating] = useState(false);
    const [imgLoadingId, setImgLoadingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [comicId, setComicId] = useState(id || null);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const { data } = await api.get(`/comics/${id}`);
                setTitle(data.title);
                setSynopsis(data.synopsis || "");
                setLayout(data.layout);
                setPanels(data.panels.length ? data.panels : [emptyPanel()]);
                setComicId(data.comic_id);
            } catch (e) {
                toast.error("Could not load comic");
                navigate('/dashboard');
            } finally {
                setLoadingComic(false);
            }
        })();
    }, [id, navigate]);

    const generateStory = async () => {
        if (!prompt.trim()) { toast.error("Type a story prompt first"); return; }
        setGenerating(true);
        try {
            const { data } = await api.post("/generate/story", { prompt, num_panels: Number(numPanels) });
            setTitle(data.title);
            setSynopsis(data.synopsis);
            setPanels(data.panels);
            toast.success("Story ready! Now generate the sketches.");
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Story generation failed");
        } finally {
            setGenerating(false);
        }
    };

    const generateImageForPanel = async (pid) => {
        const panel = panels.find(p => p.id === pid);
        if (!panel?.image_prompt?.trim()) { toast.error("Add an image prompt first"); return; }
        setImgLoadingId(pid);
        try {
            const { data } = await api.post("/generate/panel-image", { prompt: panel.image_prompt });
            setPanels((ps) => ps.map(p => p.id === pid ? { ...p, image_base64: data.image_base64 } : p));
            fetchBilling && fetchBilling();
        } catch (e) {
            if (e?.response?.status === 402) {
                toast.error("Out of credits — top up or upgrade.", { action: { label: "Plans", onClick: () => navigate('/billing') } });
            } else {
                toast.error(e?.response?.data?.detail || "Image generation failed");
            }
        } finally {
            setImgLoadingId(null);
        }
    };

    const generateAllImages = async () => {
        let outOfCredits = false;
        for (const p of panels) {
            if (!p.image_prompt) continue;
            setImgLoadingId(p.id);
            try {
                const { data } = await api.post("/generate/panel-image", { prompt: p.image_prompt });
                setPanels((ps) => ps.map(x => x.id === p.id ? { ...x, image_base64: data.image_base64 } : x));
            } catch (e) {
                if (e?.response?.status === 402) { outOfCredits = true; break; }
            }
        }
        setImgLoadingId(null);
        fetchBilling && fetchBilling();
        if (outOfCredits) {
            toast.error("Ran out of credits mid-way.", { action: { label: "Plans", onClick: () => navigate('/billing') } });
        } else {
            toast.success("Sketches rendered!");
        }
    };

    const updatePanel = (pid, field, val) => {
        setPanels((ps) => ps.map(p => p.id === pid ? { ...p, [field]: val } : p));
    };

    const addPanel = () => setPanels((ps) => [...ps, emptyPanel()]);
    const removePanel = (pid) => setPanels((ps) => ps.filter(p => p.id !== pid));

    const save = async () => {
        setSaving(true);
        try {
            const payload = { title, synopsis, layout, panels };
            let res;
            if (comicId) {
                res = await api.put(`/comics/${comicId}`, payload);
            } else {
                res = await api.post(`/comics`, payload);
                setComicId(res.data.comic_id);
                window.history.replaceState(null, "", `/create/${res.data.comic_id}`);
            }
            toast.success("Saved!");
        } catch (e) {
            toast.error("Save failed");
        } finally {
            setSaving(false);
        }
    };

    if (loadingComic) {
        return <div className="min-h-screen grid place-items-center font-heading text-4xl">Loading sketchbook…</div>;
    }

    return (
        <div className="min-h-screen" data-testid="creator-page">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 grid grid-cols-12 gap-6">
                {/* Sidebar */}
                <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-5 lg:sticky lg:top-6 self-start" data-testid="creator-sidebar">
                    <button onClick={() => navigate('/dashboard')} className="text-sm font-body inline-flex items-center gap-1 hover:underline" data-testid="back-btn">
                        <ArrowLeft size={14}/> Back to shelf
                    </button>
                    <div className="ink-card p-5">
                        <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Prompt the muse</div>
                        <h2 className="font-heading text-3xl mt-1">AI Story</h2>
                        <textarea
                            data-testid="ai-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g. A grumpy cat travels to Mars to find the lost fish of legend…"
                            rows={4}
                            className="mt-3 w-full border-2 border-ink bg-white p-3 font-body text-sm outline-none focus:border-hotpink"
                        />
                        <div className="flex items-center gap-3 mt-3">
                            <label className="font-body text-xs font-bold">Panels</label>
                            <input
                                data-testid="num-panels"
                                type="number" min={2} max={12}
                                value={numPanels}
                                onChange={(e) => setNumPanels(e.target.value)}
                                className="w-16 border-2 border-ink bg-white p-1.5 text-center font-display font-bold"
                            />
                        </div>
                        <button data-testid="generate-story-btn" onClick={generateStory} disabled={generating} className="btn-pink w-full mt-4 inline-flex items-center justify-center gap-2">
                            {generating ? <><Loader2 className="animate-spin" size={16}/> Writing…</> : <><Wand2 size={16} strokeWidth={2.5}/> Generate story</>}
                        </button>
                        <button data-testid="generate-all-images-btn" onClick={generateAllImages} disabled={!!imgLoadingId} className="btn-yellow w-full mt-3 inline-flex items-center justify-center gap-2">
                            {imgLoadingId ? <><Loader2 className="animate-spin" size={16}/> Sketching…</> : <><ImageIcon size={16} strokeWidth={2.5}/> Sketch all panels</>}
                        </button>
                    </div>

                    <div className="ink-card p-5">
                        <div className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Layout</div>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                            <button data-testid="layout-grid" onClick={() => setLayout("grid")} className={`border-2 border-ink p-3 font-display font-bold text-sm inline-flex items-center justify-center gap-2 ${layout==='grid' ? 'bg-highlight shadow-ink-sm' : 'bg-white'}`}>
                                <LayoutGrid size={16}/> Grid
                            </button>
                            <button data-testid="layout-webtoon" onClick={() => setLayout("webtoon")} className={`border-2 border-ink p-3 font-display font-bold text-sm inline-flex items-center justify-center gap-2 ${layout==='webtoon' ? 'bg-highlight shadow-ink-sm' : 'bg-white'}`}>
                                <AlignJustify size={16}/> Webtoon
                            </button>
                        </div>
                    </div>

                    <div className="ink-card p-5">
                        <label className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70">Title</label>
                        <input data-testid="comic-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full border-2 border-ink bg-white p-2 font-heading text-2xl" />
                        <label className="font-display uppercase text-xs tracking-[0.2em] font-bold text-ink/70 mt-3 block">Synopsis</label>
                        <textarea data-testid="comic-synopsis" rows={3} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} className="mt-2 w-full border-2 border-ink bg-white p-2 font-body text-sm" />
                        <button data-testid="save-comic-btn" onClick={save} disabled={saving} className="btn-blue w-full mt-4 inline-flex items-center justify-center gap-2">
                            {saving ? <><Loader2 className="animate-spin" size={16}/> Saving…</> : <><Save size={16} strokeWidth={2.5}/> Save comic</>}
                        </button>
                        {comicId && (
                            <button data-testid="open-reader-btn" onClick={() => navigate(`/comic/${comicId}`)} className="btn-ink w-full mt-2 text-sm">Open reader</button>
                        )}
                    </div>
                </aside>

                {/* Canvas */}
                <section className="col-span-12 lg:col-span-8 xl:col-span-9" data-testid="creator-canvas">
                    <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
                        <h2 className="font-heading text-5xl">{title || "Untitled"}</h2>
                        <div className="flex gap-2">
                            <button data-testid="add-panel-btn" onClick={addPanel} className="btn-ink text-sm inline-flex items-center gap-2"><Plus size={14}/> Add panel</button>
                        </div>
                    </div>

                    <div className={layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex flex-col gap-6 max-w-2xl mx-auto'}>
                        {panels.map((p, idx) => (
                            <PanelCard
                                key={p.id}
                                panel={p}
                                index={idx}
                                onChange={updatePanel}
                                onRemove={() => removePanel(p.id)}
                                onGenerateImage={() => generateImageForPanel(p.id)}
                                imgLoading={imgLoadingId === p.id}
                                layout={layout}
                            />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

const PanelCard = ({ panel, index, onChange, onRemove, onGenerateImage, imgLoading, layout }) => {
    return (
        <div className={`panel-frame p-4 ${layout==='grid' ? '' : 'w-full'}`} data-testid={`panel-card-${index}`} style={{ transform: `rotate(${index % 2 ? -0.4 : 0.4}deg)` }}>
            <div className="flex items-center justify-between mb-3">
                <div className="font-display font-bold text-xs uppercase tracking-[0.2em]">Panel {index + 1}</div>
                <button data-testid={`remove-panel-${index}`} onClick={onRemove} className="text-ink/60 hover:text-hotpink" title="Remove panel">
                    <Trash2 size={14} />
                </button>
            </div>
            <div className="aspect-[4/3] border-2 border-ink bg-paper grid place-items-center overflow-hidden relative">
                {imgLoading ? (
                    <div className="flex flex-col items-center gap-2 text-ink/70">
                        <Loader2 className="animate-spin" />
                        <div className="font-hand">Scribbling…</div>
                    </div>
                ) : panel.image_base64 ? (
                    <img src={panel.image_base64} alt={`Panel ${index+1}`} className="w-full h-full object-cover" data-testid={`panel-img-${index}`} />
                ) : (
                    <div className="text-ink/40 font-hand text-center px-4">No sketch yet. Add a prompt ↓</div>
                )}
                {panel.dialogue && (
                    <div className="absolute top-2 left-2 max-w-[70%] bg-white border-2 border-ink px-2 py-1 font-hand text-sm shadow-ink-sm">
                        {panel.dialogue}
                    </div>
                )}
            </div>
            <div className="mt-3 space-y-2">
                <input data-testid={`caption-${index}`} value={panel.caption || ''} onChange={(e) => onChange(panel.id, 'caption', e.target.value)} placeholder="Caption / narration" className="w-full border-2 border-ink bg-white p-2 font-hand text-sm" />
                <input data-testid={`dialogue-${index}`} value={panel.dialogue || ''} onChange={(e) => onChange(panel.id, 'dialogue', e.target.value)} placeholder='"A character line…"' className="w-full border-2 border-ink bg-white p-2 font-hand text-sm" />
                <div className="flex gap-2">
                    <input data-testid={`image-prompt-${index}`} value={panel.image_prompt || ''} onChange={(e) => onChange(panel.id, 'image_prompt', e.target.value)} placeholder="Describe the sketch for this panel" className="flex-1 border-2 border-ink bg-white p-2 text-xs font-body" />
                    <button data-testid={`gen-image-${index}`} onClick={onGenerateImage} disabled={imgLoading} className="btn-yellow !py-2 !px-3 text-xs inline-flex items-center gap-1">
                        {panel.image_base64 ? <RefreshCw size={14}/> : <ImageIcon size={14}/>} {panel.image_base64 ? 'Redraw' : 'Sketch'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Creator;
