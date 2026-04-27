// Pure-canvas confetti burst — no deps, ~3KB, runs on Canvas2D.
// Usage: burstConfetti({ x, y, count, theme }) where theme is one of "comic", "celebration", "stars".

const THEMES = {
    comic: ["#FFE600", "#FF007F", "#0057FF", "#111111", "#FFFFFF"],
    celebration: ["#FFD700", "#FF7AB6", "#FFE600", "#9FE7E7", "#FF007F"],
    stars: ["#FFD700", "#FFE600", "#FFFFFF", "#FF7AB6"],
    sparks: ["#FFE600", "#FFD700", "#FF007F"],
};

const SHAPES = ["square", "circle", "star", "scribble", "ribbon"];

let canvasRef = null;
let particles = [];
let rafId = null;

const ensureCanvas = () => {
    if (canvasRef) return canvasRef;
    const c = document.createElement("canvas");
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    document.body.appendChild(c);
    canvasRef = c;
    window.addEventListener("resize", () => {
        if (!canvasRef) return;
        canvasRef.width = window.innerWidth;
        canvasRef.height = window.innerHeight;
    });
    return c;
};

const drawShape = (ctx, p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.r);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.5;
    const s = p.size;
    if (p.shape === "circle") {
        ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (p.shape === "star") {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = (Math.PI / 5) * i - Math.PI / 2;
            const rr = i % 2 === 0 ? s : s / 2.4;
            const px = Math.cos(a) * rr;
            const py = Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (p.shape === "scribble") {
        ctx.beginPath();
        ctx.moveTo(-s, 0);
        ctx.quadraticCurveTo(-s / 2, -s, 0, 0);
        ctx.quadraticCurveTo(s / 2, s, s, 0);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
    } else if (p.shape === "ribbon") {
        ctx.fillRect(-s / 2, -s / 6, s, s / 3);
        ctx.strokeRect(-s / 2, -s / 6, s, s / 3);
    } else {
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.strokeRect(-s / 2, -s / 2, s, s);
    }
    ctx.restore();
};

const tick = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    particles.forEach((p) => {
        p.vy += 0.15; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        p.life -= 1;
        if (p.life > 0) drawShape(ctx, p);
    });
    particles = particles.filter((p) => p.life > 0 && p.y < canvasRef.height + 60);
    if (particles.length > 0) {
        rafId = requestAnimationFrame(tick);
    } else {
        cancelAnimationFrame(rafId);
        rafId = null;
        if (canvasRef && canvasRef.parentNode) {
            canvasRef.parentNode.removeChild(canvasRef);
            canvasRef = null;
        }
    }
};

export const burstConfetti = ({ x, y, count = 60, theme = "comic", spread = 360, power = 12 } = {}) => {
    const c = ensureCanvas();
    const cx = x ?? c.width / 2;
    const cy = y ?? c.height / 3;
    const colors = THEMES[theme] || THEMES.comic;
    for (let i = 0; i < count; i++) {
        const angle = ((spread / 360) * Math.PI * 2) * (i / count) + (Math.random() * 0.6 - 0.3);
        const speed = power * (0.5 + Math.random());
        particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - power * 0.4,
            r: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.3,
            size: 6 + Math.random() * 12,
            life: 80 + Math.random() * 60,
            color: colors[Math.floor(Math.random() * colors.length)],
            shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        });
    }
    if (!rafId) rafId = requestAnimationFrame(tick);
};

export const cannonConfetti = (theme = "celebration") => {
    // Fires from both sides toward center
    const w = window.innerWidth;
    burstConfetti({ x: 60, y: window.innerHeight - 80, count: 40, theme, spread: 70, power: 18 });
    burstConfetti({ x: w - 60, y: window.innerHeight - 80, count: 40, theme, spread: 70, power: 18 });
    setTimeout(() => burstConfetti({ x: w / 2, y: window.innerHeight / 3, count: 50, theme, spread: 360, power: 10 }), 250);
};
