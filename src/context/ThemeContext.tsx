import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'modern' | 'terminal' | 'amber' | 'cyberwave' | 'glass' | 'crimson' | 'orange' | 'ocean';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('zmbrt_theme');
        return (saved as Theme) || 'modern';
    });

    useEffect(() => {
        const target = document.body;
        console.log('[ThemeContext] Switching theme to:', theme);

        // Remove all known theme classes
        const themes: Theme[] = ['terminal', 'amber', 'cyberwave', 'glass', 'crimson', 'orange', 'ocean'];
        target.classList.remove(...themes.map(t => `theme-${t}`));

        // Apply new theme class if not modern (modern is default :root vars)
        if (theme !== 'modern') {
            console.log('[ThemeContext] Adding class to body:', `theme-${theme}`);
            target.classList.add(`theme-${theme}`);
        } else {
            console.log('[ThemeContext] Reverting to modern (default)');
        }

        // Persist
        localStorage.setItem('zmbrt_theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
