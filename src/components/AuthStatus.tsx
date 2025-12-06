import { LogOut, Power, User, Loader2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useTwitchAuth } from '../hooks/useTwitchAuth';

export function AuthStatus({ auth }: { auth: any }) {
    const { isConnected, isConnecting, connect, disconnect } = useChat();
    const { clearCredentials } = useTwitchAuth();

    if (!auth.isAuthenticated) {
        return null;
    }

    const toggleConnection = async () => {
        if (isConnecting) return; // Prevent clicks while connecting
        if (isConnected) {
            await disconnect();
        } else {
            await connect();
        }
    };

    return (
        <div className="grid grid-cols-1 gap-1">
            <div className={`flex items-center justify-between p-3 rounded bg-dark-surface border border-dark-surfaceHover transition-colors ${isConnecting ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
                <div className="flex items-center gap-2">
                    {isConnecting ? (
                        <Loader2 size={16} className="text-yellow-500 animate-spin" />
                    ) : (
                        <User size={16} className={isConnected ? "text-green-500" : "text-gray-500"} />
                    )}
                    <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">
                            {isConnecting ? 'Connecting...' : (isConnected ? 'Online' : 'Offline')}
                        </span>
                        <span className={`text-[10px] leading-none mt-1 ${isConnecting ? 'text-yellow-500/70' : 'text-gray-400'}`}>Chat Status</span>
                    </div>
                </div>
                <button
                    onClick={toggleConnection}
                    disabled={isConnecting}
                    className={`p-1.5 rounded-md transition-all ${isConnecting
                            ? 'bg-yellow-500/10 text-yellow-500 cursor-wait'
                            : isConnected
                                ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                        }`}
                    title={isConnecting ? "Connecting..." : (isConnected ? "Disconnect Chat" : "Connect Chat")}
                >
                    {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                </button>
            </div>

            {/* Explicit Sign Out */}
            <div className="flex justify-end px-1">
                <button onClick={clearCredentials} className="text-[10px] text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors">
                    <LogOut size={10} />
                    Sign Out & Forget
                </button>
            </div>
        </div>
    );
}
