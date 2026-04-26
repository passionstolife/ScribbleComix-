// Free tint palette usable by everyone. Applied as background/border accent on submitted comics.
export const TINTS = [
    { key: "none",     label: "None",      hex: "transparent" },
    { key: "sunshine", label: "Sunshine",  hex: "#FFE600" },
    { key: "rose",     label: "Rose",      hex: "#FFB6C1" },
    { key: "hotpink",  label: "Hot Pink",  hex: "#FF007F" },
    { key: "sky",      label: "Sky",       hex: "#9FE7E7" },
    { key: "blue",     label: "Blue",      hex: "#0057FF" },
    { key: "mint",     label: "Mint",      hex: "#B8E7C5" },
    { key: "sage",     label: "Sage",      hex: "#86A873" },
    { key: "lavender", label: "Lavender",  hex: "#C5A9F5" },
    { key: "violet",   label: "Violet",    hex: "#6A3FB5" },
    { key: "peach",    label: "Peach",     hex: "#FFB892" },
    { key: "rust",     label: "Rust",      hex: "#C85A30" },
    { key: "coffee",   label: "Coffee",    hex: "#8B5E3C" },
    { key: "onyx",     label: "Onyx",      hex: "#2C2C2C" },
    { key: "gold",     label: "Gold",      hex: "#FFD700" },
    { key: "silver",   label: "Silver",    hex: "#C8C8D0" },
];

export const tintByKey = (key) => TINTS.find((t) => t.key === key) || TINTS[0];
