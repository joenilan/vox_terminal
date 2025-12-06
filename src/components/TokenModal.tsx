import { useState } from 'react';
import { KeyRound, X, Check } from 'lucide-react';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useSettings } from '../context/SettingsContext';

interface TokenModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TokenModal({ isOpen, onClose }: TokenModalProps) {
    const { setManualToken } = useTwitchAuth();
    const { setAutoConnect } = useSettings();
    const [token, setTokenInput] = useState('');
    const [refreshToken, setRefreshTokenInput] = useState('');
    const [clientId, setClientIdInput] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token.trim()) {
            setError('Access Token is required to connect.');
            return;
        }

        // Pass all 3 prompts to the auth context
        setManualToken(
            token.trim(),
            refreshToken.trim() || undefined,
            clientId.trim() || undefined
        );

        // Explicitly enable Auto-Connect since the user just manually signed in
        // This triggers the ChatContext auto-connect effect
        setAutoConnect(true);

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-dark-bg border border-dark-surfaceHover rounded-xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-surfaceHover bg-dark-surface">
                    <div className="flex items-center gap-2 text-white">
                        <KeyRound className="text-twitch" size={20} />
                        <h2 className="font-bold">Connect Twitch Account</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 bg-twitch/10 border border-twitch/20 rounded-lg">
                        <p className="text-xs text-twitch-light">
                            <strong className="block mb-1">Need a token?</strong>
                            Generate one securely using:
                            <a
                                href="#"
                                onClick={() => window.open('https://twitchtokengenerator.com', '_blank')}
                                className="block mt-1 underline hover:text-white transition-colors font-medium"
                            >
                                https://twitchtokengenerator.com
                            </a>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Access Token <span className="text-red-500">*</span></label>
                        <input
                            type="password"
                            value={token}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder="Your Access Token"
                            className="w-full px-3 py-2 bg-dark-surface border border-dark-surfaceHover rounded-lg text-white focus:outline-none focus:border-twitch transition-colors font-mono text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Refresh Token <span className="text-gray-500">(Optional)</span></label>
                        <input
                            type="password"
                            value={refreshToken}
                            onChange={(e) => setRefreshTokenInput(e.target.value)}
                            placeholder="Your Refresh Token"
                            className="w-full px-3 py-2 bg-dark-surface border border-dark-surfaceHover rounded-lg text-white focus:outline-none focus:border-twitch transition-colors font-mono text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Client ID <span className="text-gray-500">(Optional)</span></label>
                        <input
                            type="text"
                            value={clientId}
                            onChange={(e) => setClientIdInput(e.target.value)}
                            placeholder="Custom Client ID"
                            className="w-full px-3 py-2 bg-dark-surface border border-dark-surfaceHover rounded-lg text-white focus:outline-none focus:border-twitch transition-colors font-mono text-sm"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-twitch hover:bg-twitch-dark text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Check size={16} />
                            Save & Connect
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
