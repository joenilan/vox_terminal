import { useEffect, useState, useRef, useCallback } from 'react';
import { APP_VERSION } from '../config/version';
import { Volume2, Play, Square, RotateCcw, Mic2 } from 'lucide-react';
import { ViewShell } from '../components/ViewShell';
import { TTSEngine, TTSMessage } from '../services/TTSEngine';
import { useChat } from '../context/ChatContext';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { FilterService } from '../services/FilterService';
import { EmoteStats } from '../types';
import { useSettings } from '../context/SettingsContext';
import { ConfirmationModal } from '../components/ConfirmationModal';

export function TTSView({ addLog, setEmoteStats }: {
    addLog: (user: string, message: string) => void;
    setEmoteStats: (stats: EmoteStats) => void;
}) {
    const { token, isAuthenticated, setManualToken } = useTwitchAuth();
    const {
        volume, setVolume,
        rate, setRate,
        selectedVoiceURI, setSelectedVoiceURI,
        filterSettings
    } = useSettings();

    // Chat Context
    const { isConnected: isChatConnected, connect: connectChat, disconnect: disconnectChat, addMessageHandler, removeMessageHandler, emoteStats: chatEmoteStats } = useChat();

    // Services
    const ttsEngine = useRef<TTSEngine | null>(null);
    const filterService = useRef<FilterService>(new FilterService(filterSettings));

    // Sync Emote Stats from ChatContext
    useEffect(() => {
        if (chatEmoteStats) {
            setEmoteStats(chatEmoteStats);
            // We need to pass the raw emotes set if available, but ChatContext exposes it now.
            // However, useChat definition in the file might need to be checked if I added 'emotes'. 
            // For now, let's assume FilterService might just need the stats or we can extend this later.
            // If ChatContext wasn't updated with "emotes" in the interface locally, we might get a TS error.
            // But I did update ChatContext to include it.
            // access via destructuring if needed: const { emotes } = useChat();
        }
    }, [chatEmoteStats, setEmoteStats]);

    // Use a separate effect to sync raw emotes if `useChat` provides them
    const { emotes } = useChat();
    useEffect(() => {
        if (emotes) {
            filterService.current.setExternalEmotes(emotes);
        }
    }, [emotes]);

    // Sync Filter Settings
    useEffect(() => {
        if (filterService.current) {
            filterService.current.updateSettings(filterSettings);
        }
    }, [filterSettings]);

    // State
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [queue, setQueue] = useState<TTSMessage[]>([]);
    const [history, setHistory] = useState<TTSMessage[]>([]);
    const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
    const [testText, setTestText] = useState('');

    // Message Handler
    const handleChatMessage = useCallback((_channel: string, tags: any, message: string, self: boolean) => {
        if (self) return;

        const username = tags['display-name'] || tags.username || 'Unknown';

        // Filter Check
        const { process, cleanMessage } = filterService.current.shouldProcess(username, message, tags);

        // Log to global logs
        addLog(username, `${message} ${!process ? '(Filtered)' : ''}`);

        if (process && cleanMessage) {
            ttsEngine.current?.speak(cleanMessage, username);
            setHistory(prev => [{ text: cleanMessage, username, id: Date.now().toString() }, ...prev].slice(50));
        }
    }, [addLog]);

    // Initialize Services
    useEffect(() => {
        ttsEngine.current = new TTSEngine((newQueue) => {
            setQueue(newQueue);
        });

        // Register Handler
        addMessageHandler(handleChatMessage);

        // Load voices
        const loadVoices = () => {
            const vs = ttsEngine.current?.getVoices() || [];
            setVoices(vs);

            // If we have a saved voice, try to find it
            if (selectedVoiceURI) {
                const found = vs.find(v => v.voiceURI === selectedVoiceURI);
                if (found) {
                    ttsEngine.current?.setVoice(found.name);
                }
            } else if (vs.length > 0) {
                // Default to first if nothing saved
                setSelectedVoiceURI(vs[0].voiceURI);
                ttsEngine.current?.setVoice(vs[0].name);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;

        return () => {
            removeMessageHandler(handleChatMessage);
            ttsEngine.current?.stop();
        };
    }, [addMessageHandler, removeMessageHandler, handleChatMessage, selectedVoiceURI, setSelectedVoiceURI]);

    // Update Settings
    useEffect(() => {
        if (ttsEngine.current) {
            const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
            if (voice) {
                ttsEngine.current.setVoice(voice.name);
            }
            ttsEngine.current.volume = volume;
            ttsEngine.current.rate = rate;
        }
    }, [selectedVoiceURI, volume, rate, voices]);

    // Sync Auth State Disconnect
    useEffect(() => {
        if (!isAuthenticated && isChatConnected) {
            disconnectChat();
            setEmoteStats(null);
        }
    }, [isAuthenticated, isChatConnected, setEmoteStats, disconnectChat]);

    // Manual Token Logic
    const [showTokenInput, setShowTokenInput] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [manualToken, setManualTokenInput] = useState('');
    const [manualRefreshToken, setManualRefreshToken] = useState('');
    const [manualClientId, setManualClientId] = useState('');



    const confirmDisconnect = async () => {
        await disconnectChat();
        // setManualDisconnect(true) is now handled internally by ChatContext.disconnect()
        setShowDisconnectConfirm(false);
        setEmoteStats(null);
    };

    const handleManualTokenSubmit = () => {
        if (manualToken) {
            // Clean token
            const cleanToken = manualToken.replace('oauth:', '').trim();
            const cleanRefresh = manualRefreshToken.trim();
            const cleanClient = manualClientId.trim();

            setManualTokenInput(cleanToken);
            setManualToken(cleanToken, cleanRefresh || undefined, cleanClient || undefined);

            setTimeout(() => {
                connectChat().catch((e: any) => {
                    alert("Failed to connect with new token: " + e.message);
                });
            }, 100);

            setShowTokenInput(false);
        }
    };

    const handleGenerateToken = () => {
        const url = "https://twitchtokengenerator.com/";
        if (window.ipcRenderer) {
            window.ipcRenderer.invoke('open-external', url);
        } else {
            window.open(url, '_blank');
        }
    }

    const handleConnectClick = useCallback(async () => {
        // Case 1: Already connected -> Disconnect
        if (isChatConnected) {
            setShowDisconnectConfirm(true);
            return;
        }

        // Case 2: Has token (from storage) -> Connect directly
        if (isAuthenticated && token) {
            connectChat().catch((e: any) => {
                console.error(e);
                setShowTokenInput(true);
            });
            return;
        }

        // Case 3: No token -> Show input
        setShowTokenInput(true);
    }, [isAuthenticated, token, isChatConnected, connectChat]);

    const handleStop = () => {
        ttsEngine.current?.stop();
    };

    const handleTestSpeak = () => {
        if (testText) {
            ttsEngine.current?.speak(testText, 'Test');
        }
    };

    const handleReplay = (msg: TTSMessage) => {
        ttsEngine.current?.speak(msg.text, msg.username);
    };

    // Global Hotkeys Listener
    useEffect(() => {
        const stopListener = () => handleStop();
        const connectListener = () => handleConnectClick();

        if (window.ipcRenderer) {
            window.ipcRenderer.on('hotkey-stop', stopListener);
            window.ipcRenderer.on('hotkey-connect', connectListener);
        }

        return () => {
            if (window.ipcRenderer) {
                window.ipcRenderer.off('hotkey-stop', stopListener);
                window.ipcRenderer.off('hotkey-connect', connectListener);
            }
        };
    }, [handleConnectClick]);

    return (
        <ViewShell
            title="AUDIO_CONSOLE"
            subtitle={`Synthesis module // v${APP_VERSION}`}
            icon={Mic2}
            headerAction={
                <div className="flex gap-2 relative">


                    <button
                        onClick={handleStop}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors font-medium border border-red-500/20 text-sm"
                    >
                        <Square size={16} fill="currentColor" />
                        Stop Audio
                    </button>

                    <ConfirmationModal
                        isOpen={showDisconnectConfirm}
                        title="Disconnect Chat?"
                        message="Are you sure you want to disconnect? TTS will stop working until you reconnect."
                        confirmLabel="Disconnect"
                        isDestructive={true}
                        onConfirm={confirmDisconnect}
                        onCancel={() => setShowDisconnectConfirm(false)}
                    />
                </div>
            }
        >

            {/* Token Input Modal Overlay */}
            {showTokenInput && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in">
                    <div className="bg-dark-bg border border-dark-surfaceHover p-8 rounded-xl max-w-md w-full shadow-2xl space-y-4">
                        <h3 className="text-xl font-bold text-white">Manual Connection</h3>
                        <p className="text-gray-400 text-sm">
                            Paste your Twitch credentials below. We recommend using <button onClick={handleGenerateToken} className="text-twitch underline font-bold">TwitchTokenGenerator</button>.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Token (Required)</label>
                                <input
                                    type="password"
                                    placeholder="u..."
                                    value={manualToken}
                                    onChange={(e) => setManualTokenInput(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white focus:border-twitch focus:ring-1 focus:ring-twitch transition-all font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Refresh Token (Optional)</label>
                                <input
                                    type="password"
                                    placeholder="For auto-reconnect..."
                                    value={manualRefreshToken}
                                    onChange={(e) => setManualRefreshToken(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white focus:border-twitch focus:ring-1 focus:ring-twitch transition-all font-mono text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client ID (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="gp762..."
                                    value={manualClientId}
                                    onChange={(e) => setManualClientId(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white focus:border-twitch focus:ring-1 focus:ring-twitch transition-all font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => setShowTokenInput(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleManualTokenSubmit}
                                disabled={!manualToken}
                                className="px-6 py-2 bg-twitch hover:bg-twitch-dark disabled:opacity-50 text-white rounded-lg font-bold"
                            >
                                Verify & Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-0">
                {/* Main Controls - Left Column */}
                <div className="md:col-span-2 space-y-4">

                    {/* Voice Selection & Controls */}
                    <div className="p-4 rounded-xl bg-dark-bg border border-dark-surfaceHover">
                        <div className="flex items-center gap-2 mb-4">
                            <Volume2 size={18} className="text-twitch-light" />
                            <h3 className="text-base font-semibold">Voice Configuration</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <select
                                    value={selectedVoiceURI || ''}
                                    onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white text-sm focus:outline-none focus:border-twitch focus:ring-1 focus:ring-twitch transition-all"
                                >
                                    {voices.map(v => (
                                        <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Volume: {Math.round(volume * 100)}%</label>
                                    <input
                                        type="range" min="0" max="1" step="0.1"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-dark-surface rounded-lg appearance-none cursor-pointer accent-twitch"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Rate: {rate}x</label>
                                    <input
                                        type="range" min="0.5" max="3" step="0.1"
                                        value={rate}
                                        onChange={(e) => setRate(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-dark-surface rounded-lg appearance-none cursor-pointer accent-twitch"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test & Previous Messages */}
                    <div className="p-4 rounded-xl bg-dark-bg border border-dark-surfaceHover flex flex-col gap-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Type to test voice..."
                                value={testText}
                                onChange={(e) => setTestText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTestSpeak()}
                                className="flex-1 px-3 py-2 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white text-sm focus:outline-none focus:border-twitch focus:ring-1 focus:ring-twitch transition-all"
                            />
                            <button
                                onClick={handleTestSpeak}
                                className="p-2 bg-twitch hover:bg-twitch-dark text-white rounded-lg transition-colors"
                            >
                                <Play size={18} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Queue & History - Right Column */}
                <div className="h-full min-h-0 bg-dark-bg border border-dark-surfaceHover rounded-xl flex flex-col overflow-hidden">
                    <div className="flex border-b border-dark-surfaceHover">
                        <button
                            onClick={() => setActiveTab('queue')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'queue' ? 'text-twitch border-b-2 border-twitch' : 'text-gray-400 hover:text-white'}`}
                        >
                            Queue ({queue.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-twitch border-b-2 border-twitch' : 'text-gray-400 hover:text-white'}`}
                        >
                            History
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                        {activeTab === 'queue' ? (
                            queue.length === 0 ? (
                                <div className="text-center text-gray-500 py-8 text-sm">Queue is empty</div>
                            ) : (
                                queue.map((msg, i) => (
                                    <div key={msg.id} className="p-3 rounded-lg bg-dark-surface border border-dark-surfaceHover animate-in slide-in-from-left-2 fade-in">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-twitch text-sm">{msg.username}</span>
                                            <span className="text-xs text-gray-500">#{i + 1}</span>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">{msg.text}</p>
                                    </div>
                                ))
                            )
                        ) : (
                            history.length === 0 ? (
                                <div className="text-center text-gray-500 py-8 text-sm">No history yet</div>
                            ) : (
                                history.map((msg) => (
                                    <div key={msg.id} className="p-3 rounded-lg bg-dark-surface/50 border border-dark-surfaceHover/50 group hover:border-dark-surfaceHover transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-gray-400 text-sm">{msg.username}</span>
                                            <button
                                                onClick={() => handleReplay(msg)}
                                                className="text-gray-500 hover:text-twitch opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Replay"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        </div>
                                        <p className="text-gray-400 text-sm">{msg.text}</p>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>
            </div>
        </ViewShell>
    );
}
