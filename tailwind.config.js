/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Mapping old names to new dynamic variables for backward compatibility
                twitch: {
                    light: 'rgb(var(--color-accent-secondary) / <alpha-value>)',
                    DEFAULT: 'rgb(var(--color-accent-primary) / <alpha-value>)',
                    dark: 'rgb(var(--color-accent-dark) / <alpha-value>)',
                },
                dark: {
                    bg: 'rgb(var(--color-bg-base) / <alpha-value>)',
                    surface: 'rgb(var(--color-bg-surface) / <alpha-value>)',
                    surfaceHover: 'rgb(var(--color-bg-hover) / <alpha-value>)'
                },
                // New semantic names
                accent: {
                    DEFAULT: 'rgb(var(--color-accent-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--color-accent-secondary) / <alpha-value>)',
                    dark: 'rgb(var(--color-accent-dark) / <alpha-value>)',
                },
                surface: {
                    base: 'rgb(var(--color-bg-base) / <alpha-value>)',
                    card: 'rgb(var(--color-bg-surface) / <alpha-value>)',
                    hover: 'rgb(var(--color-bg-hover) / <alpha-value>)'
                }
            },
            fontFamily: {
                sans: ['var(--font-primary)', 'Inter', 'sans-serif'],
                mono: ['var(--font-mono)', 'monospace'],
            },
            borderRadius: {
                DEFAULT: 'var(--radius-base)',
                sm: 'var(--radius-sm)',
                md: 'var(--radius-base)',
                lg: 'var(--radius-base)',
                xl: 'calc(var(--radius-base) + 4px)',
            }
        },
    },
    plugins: [],
}
