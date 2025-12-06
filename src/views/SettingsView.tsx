import { useSettings } from '../context/SettingsContext';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Settings, Globe, Keyboard, Save, CheckCircle2 } from 'lucide-react';
import { ViewShell } from '../components/ViewShell';
import { useState, useEffect, useCallback } from 'react';

// Sub-component for Hotkey Recording
function HotkeyRecorder({ label, value, onChange }: { label: string, value: string, onChange: (k: string) => void }) {
    const [isRecording, setIsRecording] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Ignore modifier-only presses
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

        const modifiers = [];
        if (e.ctrlKey) modifiers.push('CommandOrControl');
        if (e.shiftKey) modifiers.push('Shift');
        if (e.altKey) modifiers.push('Alt');

        let key = e.key.toUpperCase();
        if (key === ' ') key = 'Space';

        // F-keys
        if (/^F\d+$/.test(e.key)) key = e.key;

        const combo = [...modifiers, key].join('+');
        onChange(combo);
        setIsRecording(false);
    };

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
            <button
                onClick={() => setIsRecording(true)}
                onKeyDown={isRecording ? handleKeyDown : undefined}
                onBlur={() => setIsRecording(false)}
                className={`w-full px-4 py-3 rounded-lg border text-left font-mono text-sm transition-all outline-none ${isRecording
                    ? 'bg-twitch text-white border-twitch ring-2 ring-twitch/50'
                    : 'bg-dark-surface border-dark-surfaceHover text-gray-300 hover:border-twitch/50'
                    }`}
            >
                {isRecording ? 'Press any key...' : (value || 'None')}
            </button>
        </div>
    );
}

export function SettingsView() {
    const {
        autoConnect, setAutoConnect,
        hotkeys, setHotkey
    } = useSettings();
    const { token, refreshToken, clientId, clearCredentials, setManualToken } = useTwitchAuth();
    const { theme, setTheme } = useTheme();

    // Local state for form inputs
    const [localToken, setLocalToken] = useState('');
    const [localRefreshToken, setLocalRefreshToken] = useState('');
    const [localClientId, setLocalClientId] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state with global state on mount or when global changes (if not dirty)
    useEffect(() => {
        if (!isDirty) {
            setLocalToken(token || '');
            setLocalRefreshToken(refreshToken || '');
            setLocalClientId(clientId || '');
        }
    }, [token, refreshToken, clientId, isDirty]);

    const performSave = useCallback(() => {
        const cleanToken = localToken.replace('oauth:', '').trim();
        const cleanRefresh = localRefreshToken.trim();
        const cleanClient = localClientId.trim();

        setManualToken(cleanToken, cleanRefresh || undefined, cleanClient || undefined);
        setIsDirty(false);
        setIsSaving(false);
    }, [localToken, localRefreshToken, localClientId, setManualToken]);

    // Debounced Auto-Save
    useEffect(() => {
        if (!isDirty) return;

        setIsSaving(true);
        const timer = setTimeout(() => {
            performSave();
        }, 1000); // 1s debounce

        return () => clearTimeout(timer);
    }, [localToken, localRefreshToken, localClientId, isDirty, performSave]);

    const handleManualSave = () => {
        performSave();
    };

    const handleClear = () => {
        if (confirm('Are you sure you want to delete all saved Twitch credentials?')) {
            clearCredentials();
            setLocalToken('');
            setLocalRefreshToken('');
            setLocalClientId('');
            setIsDirty(false);
        }
    };

    return (
        <ViewShell title="GLOBAL_CONFIG" subtitle="System preferences & personalization" icon={Settings}>
            <div className="space-y-8 max-w-2xl mx-auto">



                {/* Connection Settings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Globe className="text-twitch" size={20} />
                        Connection
                    </h3>

                    <div className="p-6 rounded-xl bg-dark-bg border border-dark-surfaceHover">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="font-medium text-white">Auto-Connect</div>
                                <div className="text-xs text-gray-500">Automatically connect to Twitch chat on startup</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoConnect}
                                    onChange={(e) => setAutoConnect(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-twitch/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-twitch"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Hotkey Settings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Keyboard className="text-twitch" size={20} />
                        Global Hotkeys
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-xl bg-dark-bg border border-dark-surfaceHover">
                        <HotkeyRecorder
                            label="Stop Audio Playback"
                            value={hotkeys.stopPlayback}
                            onChange={(k) => setHotkey('stopPlayback', k)}
                        />
                        <HotkeyRecorder
                            label="Connect / Disconnect"
                            value={hotkeys.connectChat}
                            onChange={(k) => setHotkey('connectChat', k)}
                        />
                    </div>
                    <p className="text-xs text-gray-500 px-2">
                        * Hotkeys work globally even when the application is minimized or not focused.
                    </p>
                </div>

                <div className="p-4 rounded-xl bg-dark-bg border border-dark-surfaceHover">
                    <h3 className="text-base font-semibold mb-3 text-white">Appearance</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => setTheme('modern')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'modern' ? 'bg-twitch/10 border-twitch text-white' : 'bg-dark-surface border-dark-surfaceHover text-gray-400 hover:border-gray-500 hover:text-white'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-[#9146FF]"></div>
                            <span className="text-xs font-medium">Modern</span>
                        </button>

                        <button
                            onClick={() => setTheme('terminal')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'terminal' ? 'bg-green-900/20 border-green-500 text-green-400' : 'bg-black border-gray-800 text-gray-500 hover:border-green-900 hover:text-green-600'}`}
                        >
                            <div className="w-4 h-4 bg-[#33ff33]"></div>
                            <span className="text-xs font-medium font-mono">TERMINAL</span>
                        </button>

                        <button
                            onClick={() => setTheme('amber')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'amber' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-500' : 'bg-black border-gray-800 text-gray-500 hover:border-yellow-900 hover:text-yellow-600'}`}
                        >
                            <div className="w-4 h-4 bg-[#ffb000]"></div>
                            <span className="text-xs font-medium font-mono">AMBER</span>
                        </button>

                        <button
                            onClick={() => setTheme('cyberwave')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'cyberwave' ? 'bg-cyan-900/20 border-cyan-400 text-cyan-400' : 'bg-[#150a19] border-gray-800 text-gray-500 hover:border-cyan-400 hover:text-cyan-400'}`}
                        >
                            <div className="w-4 h-4 bg-[#00f0ff] shadow-[0_0_10px_#00f0ff]"></div>
                            <span className="text-xs font-medium font-mono">CYBER</span>
                        </button>

                        <button
                            onClick={() => setTheme('glass')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'glass' ? 'bg-sky-900/20 border-sky-300 text-sky-200' : 'bg-[#0f1419] border-gray-800 text-gray-500 hover:border-sky-300 hover:text-sky-200'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-[#38bdf8]/50 ring-1 ring-[#38bdf8]"></div>
                            <span className="text-xs font-medium">Glass</span>
                        </button>

                        <button
                            onClick={() => setTheme('crimson')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'crimson' ? 'bg-red-900/30 border-red-600 text-red-500' : 'bg-black border-gray-800 text-gray-500 hover:border-red-600 hover:text-red-500'}`}
                        >
                            <div className="w-4 h-4 bg-[#dc143c]"></div>
                            <span className="text-xs font-medium">ROGUE</span>
                        </button>

                        <button
                            onClick={() => setTheme('orange')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'orange' ? 'bg-orange-900/20 border-orange-500 text-orange-500' : 'bg-[#1e140a] border-gray-800 text-gray-500 hover:border-orange-500 hover:text-orange-500'}`}
                        >
                            <div className="w-4 h-4 rounded bg-[#ff6400]"></div>
                            <span className="text-xs font-medium">FLARE</span>
                        </button>

                        <button
                            onClick={() => setTheme('ocean')}
                            className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'ocean' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-[#050a14] border-gray-800 text-gray-500 hover:border-blue-500 hover:text-blue-400'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-[#008cff]"></div>
                            <span className="text-xs font-medium">OCEAN</span>
                        </button>

                    </div>
                </div>

                <div className="p-4 rounded-xl bg-dark-bg border border-dark-surfaceHover">
                    <h3 className="text-base font-semibold mb-3 text-white">Account Management</h3>
                    <div className="bg-dark-surface rounded-lg p-4 space-y-4">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Token</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={localToken}
                                        onChange={(e) => { setLocalToken(e.target.value); setIsDirty(true); }}
                                        className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-surfaceHover text-white text-sm font-mono focus:border-twitch focus:ring-1 focus:ring-twitch outline-none transition-all"
                                        placeholder="No token saved"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Refresh Token</label>
                                <input
                                    type="password"
                                    value={localRefreshToken}
                                    onChange={(e) => { setLocalRefreshToken(e.target.value); setIsDirty(true); }}
                                    className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-surfaceHover text-white text-sm font-mono focus:border-twitch focus:ring-1 focus:ring-twitch outline-none transition-all"
                                    placeholder="No refresh token saved"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client ID</label>
                                <input
                                    type="text"
                                    value={localClientId}
                                    onChange={(e) => { setLocalClientId(e.target.value); setIsDirty(true); }}
                                    className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-surfaceHover text-white text-sm font-mono focus:border-twitch focus:ring-1 focus:ring-twitch outline-none transition-all"
                                    placeholder="No client ID saved"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-dark-surfaceHover flex items-center justify-between">
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                {isSaving ? <span className="text-yellow-500 font-bold">Saving...</span> : isDirty ? <span className="text-gray-400">Unsaved changes...</span> : <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={12} /> Saved</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleManualSave}
                                    disabled={!isDirty}
                                    className="flex items-center gap-2 px-4 py-2 bg-twitch hover:bg-twitch-dark disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs transition-colors"
                                >
                                    <Save size={14} />
                                    Save
                                </button>
                                <button
                                    onClick={handleClear}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors font-medium border border-red-500/20 text-xs"
                                >
                                    <LogOut size={14} />
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ViewShell>
    );
}
