import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { APP_VERSION } from '../config/version';
import { Volume2, Play, Square, RotateCcw, Mic2 } from 'lucide-react';
import type { TtsVoice } from '../services/TTSEngine';
import type { AudioDevice } from '../types';
import { ViewShell } from '../components/ViewShell';
import { TTSEngine, TTSMessage } from '../services/TTSEngine';
import { useChat } from '../context/ChatContext';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { FilterService } from '../services/FilterService';
import { EmoteStats } from '../types';
import { useSettings } from '../context/SettingsContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { DeviceAuthModal } from '../components/DeviceAuthModal';

export function TTSView({ addLog, setEmoteStats }: {
    addLog: (user: string, message: string) => void;
    setEmoteStats: (stats: EmoteStats) => void;
}) {
    const { token, isAuthenticated } = useTwitchAuth();
    const {
        volume, setVolume,
        rate, setRate,
        selectedVoiceURI, setSelectedVoiceURI,
        audioDeviceId, setAudioDeviceId,
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
    const [voices, setVoices] = useState<TtsVoice[]>([]);
    const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
    const [queue, setQueue] = useState<TTSMessage[]>([]);
    const [history, setHistory] = useState<TTSMessage[]>([]);
    const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
    const [testText, setTestText] = useState('');

    // Message Handler
    const handleChatMessage = useCallback((_channel: string, tags: any, message: string, self: boolean) => {
        if (self && !filterSettings.readOwnMessages) return;

        const username = tags['display-name'] || tags.username || 'Unknown';

        // Filter Check
        const { process, cleanMessage } = filterService.current.shouldProcess(username, message, tags);

        // Log to global logs
        addLog(username, `${message} ${!process ? '(Filtered)' : ''}`);

        if (process && cleanMessage) {
            const spokenText = filterSettings.announceUsername
                ? `${username} says ${cleanMessage}`
                : cleanMessage;
            ttsEngine.current?.speak(cleanMessage, username, spokenText);
            const newMessage = { text: cleanMessage, username, id: crypto.randomUUID() };
            setHistory(prev => {
                const updated = [newMessage, ...prev].slice(0, 50); // Keep last 50 (Newest First)
                return updated;
            });
        }
    }, [addLog, filterSettings]);

    // Initialize Services
    useEffect(() => {
        ttsEngine.current = new TTSEngine((newQueue) => {
            setQueue(newQueue);
        });

        addMessageHandler(handleChatMessage);

        // Load WinRT voices and WASAPI output devices
        invoke<TtsVoice[]>('get_tts_voices').then((vs) => {
            setVoices(vs);
            if (selectedVoiceURI) {
                const found = vs.find(v => v.id === selectedVoiceURI);
                ttsEngine.current?.setVoice(found?.id ?? null);
            } else if (vs.length > 0) {
                setSelectedVoiceURI(vs[0].id);
                ttsEngine.current?.setVoice(vs[0].id);
            }
        });

        invoke<AudioDevice[]>('get_audio_devices').then(setAudioDevices);

        return () => {
            removeMessageHandler(handleChatMessage);
            ttsEngine.current?.destroy();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addMessageHandler, removeMessageHandler, handleChatMessage]);

    // Sync engine settings
    useEffect(() => {
        if (!ttsEngine.current) return;
        ttsEngine.current.setVoice(selectedVoiceURI);
        ttsEngine.current.setDevice(audioDeviceId);
        ttsEngine.current.volume = volume;
        ttsEngine.current.rate = rate;
    }, [selectedVoiceURI, audioDeviceId, volume, rate]);

    // Sync Auth State Disconnect
    useEffect(() => {
        if (!isAuthenticated && isChatConnected) {
            disconnectChat();
            setEmoteStats(null);
        }
    }, [isAuthenticated, isChatConnected, setEmoteStats, disconnectChat]);

    const [showDeviceAuth, setShowDeviceAuth] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

    const confirmDisconnect = async () => {
        await disconnectChat();
        setShowDisconnectConfirm(false);
        setEmoteStats(null);
    };

    const handleConnectClick = useCallback(async () => {
        if (isChatConnected) {
            setShowDisconnectConfirm(true);
            return;
        }
        if (isAuthenticated && token) {
            connectChat().catch(() => {});
            return;
        }
        setShowDeviceAuth(true);
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
        const unlistenStop = listen('hotkey-stop', () => handleStop());
        const unlistenConnect = listen('hotkey-connect', () => handleConnectClick());

        return () => {
            unlistenStop.then(fn => fn());
            unlistenConnect.then(fn => fn());
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
            <DeviceAuthModal isOpen={showDeviceAuth} onClose={() => setShowDeviceAuth(false)} />

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
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Voice</label>
                                    <select
                                        value={selectedVoiceURI || ''}
                                        onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white text-sm focus:outline-none focus:border-twitch focus:ring-1 focus:ring-twitch transition-all"
                                    >
                                        {voices.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.language})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Audio Output Device</label>
                                    <select
                                        value={audioDeviceId || ''}
                                        onChange={(e) => setAudioDeviceId(e.target.value || null)}
                                        className="w-full px-3 py-2 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white text-sm focus:outline-none focus:border-twitch focus:ring-1 focus:ring-twitch transition-all"
                                    >
                                        <option value="">System Default</option>
                                        {audioDevices.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Volume: {Math.round(volume * 100)}%</label>
                                    <input
                                        type="range"
                                        min="0" max="1" step="0.1"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="w-full accent-twitch"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Rate: {rate}x</label>
                                    <input
                                        type="range"
                                        min="0.5" max="3" step="0.1"
                                        value={rate}
                                        onChange={(e) => setRate(parseFloat(e.target.value))}
                                        className="w-full accent-twitch"
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
                        <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'queue' ? 'text-twitch border-b-2 border-twitch' : 'text-gray-400 hover:text-white'}`}>Queue ({queue.length})</button>
                        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-twitch border-b-2 border-twitch' : 'text-gray-400 hover:text-white'}`}>History</button>
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
                                            <button onClick={() => handleReplay(msg)} className="text-gray-500 hover:text-twitch opacity-0 group-hover:opacity-100 transition-opacity" title="Replay"><RotateCcw size={14} /></button>
                                        </div>
                                        <p className="text-gray-400 text-sm">{msg.text}</p>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </div>
            </div>
        </ViewShell >
    );
}
