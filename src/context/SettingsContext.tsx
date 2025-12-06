import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface FilterSettings {
    blockedUsers: string[];
    blockedWords: string[];
    allowEmotes: boolean; // If false, strip emotes
    maxMessageLength: number;
    removeRepeatedChars: boolean; // e.g. "Wwwwwwhat" -> "What"
    removeRepeatedWords: boolean; // e.g. "Zombie Zombie Zombie" -> "Zombie"
}

export interface HotkeyConfig {
    stopPlayback: string;
    connectChat: string;
}

interface SettingsContextType {
    volume: number;
    setVolume: (v: number) => void;
    rate: number;
    setRate: (r: number) => void;
    selectedVoiceURI: string | null;
    setSelectedVoiceURI: (uri: string) => void;
    autoConnect: boolean;
    setAutoConnect: (enabled: boolean) => void;

    // Filter Settings
    filterSettings: FilterSettings;
    updateFilterSettings: (settings: Partial<FilterSettings>) => void;

    // UI Settings
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;

    // Hotkey Settings
    hotkeys: HotkeyConfig;
    setHotkey: (action: keyof HotkeyConfig, key: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const DEFAULT_BLOCKED_BOTS = [
    'Nightbot', 'StreamElements', 'Fossabot', 'Moobot', 'Wizebot', 'PhantomBot',
    'Streamlabs', 'Rainmaker', 'SoundAlerts', 'BotRix', 'Sery_Bot', 'PokemonCommunityGame',
    'FrostyTools'
];

export function SettingsProvider({ children }: { children: ReactNode }) {
    // Helper to load settings synchronously
    const loadSettings = () => {
        const saved = localStorage.getItem('tts-settings');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        return null;
    };

    const initialSettings = loadSettings();

    // Audio Settings
    const [volume, setVolumeState] = useState(initialSettings?.volume ?? 1);
    const [rate, setRateState] = useState(initialSettings?.rate ?? 1);
    const [selectedVoiceURI, setSelectedVoiceURIState] = useState<string | null>(initialSettings?.selectedVoiceURI ?? null);
    const [autoConnect, setAutoConnectState] = useState(initialSettings?.autoConnect ?? false);
    const [sidebarCollapsed, setSidebarCollapsedState] = useState(initialSettings?.sidebarCollapsed ?? false);

    // Filter Settings
    const [filterSettings, setFilterSettingsState] = useState<FilterSettings>(() => {
        const defaults = {
            blockedUsers: DEFAULT_BLOCKED_BOTS,
            blockedWords: [],
            allowEmotes: false,
            removeRepeatedChars: true,
            removeRepeatedWords: true,
            maxMessageLength: 300
        };

        if (initialSettings?.filterSettings) {
            // Merge saved blocked users with defaults (deduplicate)
            const savedBlocked = initialSettings.filterSettings.blockedUsers || [];
            const mergedBlocked = Array.from(new Set([...defaults.blockedUsers, ...savedBlocked]));

            return {
                ...defaults,
                ...initialSettings.filterSettings,
                blockedUsers: mergedBlocked,
                // Ensure new flags are present even if loading old settings
                removeRepeatedWords: initialSettings.filterSettings.removeRepeatedWords ?? true
            };
        }
        return defaults;
    });

    // Hotkey Settings
    const [hotkeys, setHotkeysState] = useState<HotkeyConfig>(() => {
        return initialSettings?.hotkeys ?? {
            stopPlayback: 'F10',
            connectChat: 'CommandOrControl+Shift+C'
        };
    });

    const setHotkey = (action: keyof HotkeyConfig, key: string) => {
        setHotkeysState((prev) => ({ ...prev, [action]: key }));
    };

    const saveSettings = (newSettings: any) => {
        localStorage.setItem('tts-settings', JSON.stringify(newSettings));
    };

    // Robust Saver Effect: Triggers on ANY state change
    useEffect(() => {
        const settingsToSave = {
            volume,
            rate,
            selectedVoiceURI,
            autoConnect,
            filterSettings,
            sidebarCollapsed,
            hotkeys
        };
        saveSettings(settingsToSave);
    }, [volume, rate, selectedVoiceURI, autoConnect, filterSettings, sidebarCollapsed, hotkeys]);

    // Sync Hotkeys with Main Process
    useEffect(() => {
        if (window.ipcRenderer) {
            window.ipcRenderer.send('update-global-hotkeys', hotkeys);
        }
    }, [hotkeys]);


    return (
        <SettingsContext.Provider value={{
            volume, setVolume: setVolumeState,
            rate, setRate: setRateState,
            selectedVoiceURI, setSelectedVoiceURI: setSelectedVoiceURIState,
            autoConnect, setAutoConnect: setAutoConnectState,
            filterSettings, updateFilterSettings: (updates) => setFilterSettingsState(prev => ({ ...prev, ...updates })),
            sidebarCollapsed, setSidebarCollapsed: setSidebarCollapsedState,
            hotkeys, setHotkey
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
