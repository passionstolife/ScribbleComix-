// Generate a sketch-aesthetic achievement certificate as PDF.
// Uses jsPDF (already a dependency from Reader.jsx PDF export).

const CERT_COLORS = {
    bronze:    "#C87533",
    silver:    "#C8C8D0",
    gold:      "#FFD700",
    platinum:  "#9FE7E7",
    diamond:   "#FF7AB6",
    rainbow:   "#FF007F",
    highlight: "#FFE600",
    hotpink:   "#FF007F",
    marker:    "#0057FF",
};

const drawDoodleStar = (pdf, cx, cy, r, fill = "#FFD700") => {
    const points = [];
    for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r / 2.4;
        points.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
    }
    pdf.setFillColor(fill);
    pdf.setDrawColor("#111111");
    pdf.setLineWidth(2);
    const lines = points.map((p, i) => {
        if (i === 0) return null;
        const prev = points[i - 1];
        return [p[0] - prev[0], p[1] - prev[1]];
    }).filter(Boolean);
    pdf.lines(lines, points[0][0], points[0][1], [1, 1], "FD", true);
};

const drawDoodleBorder = (pdf, x, y, w, h) => {
    pdf.setDrawColor("#111");
    pdf.setLineWidth(3);
    pdf.rect(x, y, w, h);
    pdf.setLineWidth(1.2);
    pdf.rect(x + 8, y + 8, w - 16, h - 16);
    // wavy/dashed inner accent
    pdf.setLineDashPattern([3, 3], 0);
    pdf.rect(x + 14, y + 14, w - 28, h - 28);
    pdf.setLineDashPattern([], 0);
};

export const downloadCertificate = async ({ kind = "achievement", title, subtitle, recipient, color = "highlight", level }) => {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const accent = CERT_COLORS[color] || CERT_COLORS.highlight;

    // Paper background tint (very subtle)
    pdf.setFillColor("#FDFBF7");
    pdf.rect(0, 0, W, H, "F");

    // Border
    drawDoodleBorder(pdf, 24, 24, W - 48, H - 48);

    // Top tape strip
    pdf.setFillColor(accent);
    pdf.setDrawColor("#111");
    pdf.setLineWidth(1.5);
    pdf.rect(W / 2 - 60, 14, 120, 16, "FD");

    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor("#666666");
    pdf.text("ScribbleComix · Official Certificate", W / 2, 70, { align: "center" });

    pdf.setFont("times", "italic");
    pdf.setFontSize(46);
    pdf.setTextColor("#111111");
    pdf.text(kind === "milestone" ? "Trophy Awarded" : "Achievement Unlocked", W / 2, 130, { align: "center" });

    // Star decorations
    drawDoodleStar(pdf, 100, 110, 22, accent);
    drawDoodleStar(pdf, W - 100, 110, 22, accent);

    // "Awarded to"
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.setTextColor("#444");
    pdf.text("Awarded to", W / 2, 180, { align: "center" });

    // Recipient
    pdf.setFont("times", "bolditalic");
    pdf.setFontSize(40);
    pdf.setTextColor("#111");
    pdf.text(recipient || "Anonymous Creator", W / 2, 222, { align: "center" });

    // Underline
    pdf.setDrawColor("#111");
    pdf.setLineWidth(1.5);
    pdf.line(W / 2 - 180, 232, W / 2 + 180, 232);

    // "for"
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.setTextColor("#444");
    pdf.text("for the achievement of", W / 2, 268, { align: "center" });

    // Achievement title (BIG, accent background)
    pdf.setFillColor(accent);
    pdf.setDrawColor("#111");
    pdf.setLineWidth(2);
    const titleW = Math.min(500, pdf.getStringUnitWidth(title) * 24 + 60);
    pdf.rect(W / 2 - titleW / 2, 290, titleW, 60, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.setTextColor("#111");
    pdf.text(title.toUpperCase(), W / 2, 330, { align: "center" });

    // Subtitle / desc
    if (subtitle) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(13);
        pdf.setTextColor("#333");
        const subLines = pdf.splitTextToSize(subtitle, W - 200);
        pdf.text(subLines, W / 2, 380, { align: "center" });
    }

    // Level (if any)
    if (level) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor("#666");
        pdf.text(`LEVEL ${level}`, W / 2, 420, { align: "center" });
    }

    // Bottom signature row
    const footerY = H - 80;
    pdf.setDrawColor("#111");
    pdf.setLineWidth(1.5);
    pdf.line(80, footerY, 240, footerY);
    pdf.line(W - 240, footerY, W - 80, footerY);

    pdf.setFont("times", "italic");
    pdf.setFontSize(13);
    pdf.setTextColor("#111");
    pdf.text("Founder, ScribbleComix", 160, footerY + 16, { align: "center" });
    pdf.text(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), W - 160, footerY + 16, { align: "center" });

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor("#888");
    pdf.text("Signed", 160, footerY - 6, { align: "center" });
    pdf.text("Date", W - 160, footerY - 6, { align: "center" });

    // Circular seal in center bottom
    const sealX = W / 2; const sealY = footerY + 8; const sealR = 32;
    pdf.setFillColor(accent);
    pdf.setDrawColor("#111");
    pdf.setLineWidth(2);
    pdf.circle(sealX, sealY, sealR, "FD");
    pdf.setLineDashPattern([2, 2], 0);
    pdf.circle(sealX, sealY, sealR - 6, "S");
    pdf.setLineDashPattern([], 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor("#111");
    pdf.text("OFFICIAL", sealX, sealY - 4, { align: "center" });
    pdf.text("SEAL", sealX, sealY + 6, { align: "center" });

    // tiny doodle pencil at top-left corner
    pdf.setFillColor(CERT_COLORS.hotpink);
    pdf.setDrawColor("#111");
    pdf.setLineWidth(1.5);
    pdf.lines([[20, -10], [4, 4], [-20, 10], [-4, -4]], 60, 60, [1, 1], "FD", true);

    const safe = (s) => String(s || "cert").replace(/[^a-z0-9-_]/gi, "_");
    pdf.save(`scribblecomix_${kind}_${safe(title)}.pdf`);
};
