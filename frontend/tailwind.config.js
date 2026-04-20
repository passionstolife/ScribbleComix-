/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
    ],
    theme: {
        extend: {
            fontFamily: {
                heading: ['"Caveat Brush"', '"Fredoka"', 'cursive'],
                display: ['"Fredoka"', '"Caveat Brush"', 'sans-serif'],
                body: ['"Nunito"', 'sans-serif'],
                hand: ['"Kalam"', '"Caveat"', 'cursive'],
            },
            colors: {
                ink: '#111111',
                paper: '#FDFBF7',
                panel: '#F9F8F5',
                highlight: '#FFE600',
                highlightHover: '#FFD500',
                marker: '#0057FF',
                markerHover: '#004CE6',
                hotpink: '#FF007F',
                hotpinkHover: '#E60073',

                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            boxShadow: {
                'ink-sm': '3px 3px 0 0 #111111',
                'ink': '6px 6px 0 0 #111111',
                'ink-lg': '10px 10px 0 0 #111111',
                'ink-pink': '6px 6px 0 0 #FF007F',
                'ink-blue': '6px 6px 0 0 #0057FF',
            },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
                wiggle: {
                    '0%,100%': { transform: 'rotate(-1.5deg)' },
                    '50%': { transform: 'rotate(1.5deg)' },
                },
                floaty: {
                    '0%,100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                wiggle: 'wiggle 1.8s ease-in-out infinite',
                floaty: 'floaty 4s ease-in-out infinite',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
