import { useEffect, useState, useRef, useCallback } from 'react';
import { Twitch, X, Copy, Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { TwitchAuthService, DeviceCodeResponse } from '../services/TwitchAuthService';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useSettings } from '../context/SettingsContext';
import { useChat } from '../context/ChatContext';

interface DeviceAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Phase =
    | { kind: 'loading' }
    | { kind: 'waiting'; flow: DeviceCodeResponse }
    | { kind: 'success'; login: string }
    | { kind: 'denied' }
    | { kind: 'expired' }
    | { kind: 'error'; message: string };

async function openBrowser(url: string) {
    try {
        await openUrl(url);
    } catch {
        window.open(url, '_blank');
    }
}

export function DeviceAuthModal({ isOpen, onClose }: DeviceAuthModalProps) {
    const { setManualToken, setUsername } = useTwitchAuth();
    const { setAutoConnect } = useSettings();
    const { connect } = useChat();

    const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
    const [copied, setCopied] = useState(false);
    const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelledRef = useRef(false);

    const stopPolling = () => {
        if (pollRef.current !== null) {
            clearTimeout(pollRef.current);
            pollRef.current = null;
        }
    };

    const startFlow = useCallback(async () => {
        stopPolling();
        cancelledRef.current = false;
        setPhase({ kind: 'loading' });

        try {
            const flow = await TwitchAuthService.startDeviceFlow();
            if (cancelledRef.current) return;
            setPhase({ kind: 'waiting', flow });
            openBrowser(flow.verificationUri);
        } catch (err) {
            if (!cancelledRef.current) {
                setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Failed to start Twitch authorization.' });
            }
        }
    }, []);

    // Start flow when modal opens
    useEffect(() => {
        if (!isOpen) return;
        startFlow();
        return () => {
            cancelledRef.current = true;
            stopPolling();
        };
    }, [isOpen, startFlow]);

    // Poll while in 'waiting' phase
    useEffect(() => {
        if (phase.kind !== 'waiting') {
            stopPolling();
            return;
        }

        const { flow } = phase;
        let pollIntervalMs = flow.intervalSeconds * 1000;

        const schedulePoll = () => {
            pollRef.current = setTimeout(async () => {
                if (cancelledRef.current) return;

                if (Date.now() > flow.expiresAt) {
                    setPhase({ kind: 'expired' });
                    return;
                }

                try {
                    const result = await TwitchAuthService.pollDeviceFlow(flow.deviceCode);
                    if (cancelledRef.current) return;

                    if (result.kind === 'pending') {
                        schedulePoll();
                        return;
                    }

                    if (result.kind === 'slow_down') {
                        pollIntervalMs += 5000;
                        schedulePoll();
                        return;
                    }

                    if (result.kind === 'success') {
                        setManualToken(result.accessToken, result.refreshToken, result.expiresAt);
                        setAutoConnect(true);
                        const validation = await TwitchAuthService.validateToken(result.accessToken);
                        if (!cancelledRef.current) {
                            const login = validation?.login ?? '';
                            if (login) setUsername(login);
                            setPhase({ kind: 'success', login });
                            connect(result.accessToken).catch(() => {});
                        }
                        return;
                    }

                    setPhase({ kind: result.kind });
                } catch (err) {
                    if (!cancelledRef.current) {
                        setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Polling failed.' });
                    }
                }
            }, pollIntervalMs);
        };

        schedulePoll();
        return stopPolling;
    }, [phase, connect, setAutoConnect, setManualToken, setUsername]);

    const handleCopyCode = () => {
        if (phase.kind !== 'waiting') return;
        navigator.clipboard.writeText(phase.flow.userCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleOpenBrowser = () => {
        if (phase.kind !== 'waiting') return;
        openBrowser(phase.flow.verificationUri);
    };

    const handleClose = () => {
        cancelledRef.current = true;
        stopPolling();
        onClose();
        setTimeout(() => {
            cancelledRef.current = false;
            setPhase({ kind: 'loading' });
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-dark-bg border border-dark-surfaceHover rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-surfaceHover bg-dark-surface">
                    <div className="flex items-center gap-2 text-white">
                        <Twitch className="text-twitch" size={20} />
                        <h2 className="font-bold">Connect with Twitch</h2>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {phase.kind === 'loading' && (
                        <div className="flex flex-col items-center gap-4 py-6">
                            <Loader2 size={32} className="animate-spin text-twitch" />
                            <p className="text-gray-400 text-sm">Starting authorization...</p>
                        </div>
                    )}

                    {phase.kind === 'waiting' && (
                        <div className="space-y-5">
                            <p className="text-gray-300 text-sm leading-relaxed">
                                A browser window has opened. Visit{' '}
                                <button onClick={handleOpenBrowser} className="text-twitch underline hover:text-white transition-colors">
                                    twitch.tv/activate
                                </button>{' '}
                                and enter the code below.
                            </p>

                            {/* User code */}
                            <div className="flex items-center gap-3 p-4 bg-dark-surface border border-dark-surfaceHover rounded-xl">
                                <span className="flex-1 text-center font-mono text-2xl font-bold tracking-[0.35em] text-white select-all">
                                    {phase.flow.userCode}
                                </span>
                                <button
                                    onClick={handleCopyCode}
                                    title="Copy code"
                                    className="p-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                </button>
                            </div>

                            <button
                                onClick={handleOpenBrowser}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-dark-surface border border-dark-surfaceHover hover:border-twitch/50 text-gray-300 hover:text-white text-sm rounded-lg transition-colors"
                            >
                                <ExternalLink size={15} />
                                Open Browser
                            </button>

                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                                <Loader2 size={13} className="animate-spin flex-shrink-0" />
                                Waiting for authorization...
                            </div>
                        </div>
                    )}

                    {phase.kind === 'success' && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check size={28} className="text-green-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-semibold text-lg">Connected!</p>
                                {phase.login && (
                                    <p className="text-gray-400 text-sm mt-1">
                                        Logged in as <span className="text-twitch font-medium">{phase.login}</span>
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={handleClose}
                                className="mt-2 px-6 py-2 bg-twitch hover:bg-twitch-dark text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {(phase.kind === 'denied' || phase.kind === 'expired' || phase.kind === 'error') && (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertCircle size={28} className="text-red-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-semibold">
                                    {phase.kind === 'denied' && 'Authorization Denied'}
                                    {phase.kind === 'expired' && 'Code Expired'}
                                    {phase.kind === 'error' && 'Authorization Failed'}
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    {phase.kind === 'denied' && 'You declined the authorization request on Twitch.'}
                                    {phase.kind === 'expired' && 'The code expired before authorization was completed.'}
                                    {phase.kind === 'error' && phase.message}
                                </p>
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={handleClose}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={startFlow}
                                    className="px-4 py-2 bg-twitch hover:bg-twitch-dark text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
