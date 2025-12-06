import { LogOut, Power, User } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useTwitchAuth } from '../hooks/useTwitchAuth';

export function AuthStatus({ auth }: { auth: any }) {
    const { isConnected, connect, disconnect } = useChat();
    const { clearCredentials } = useTwitchAuth();

    if (!auth.isAuthenticated) {
        return null;
    }

    const toggleConnection = async () => {
        if (isConnected) {
            await disconnect();
        } else {
            await connect();
        }
    };

    return (
        <div className="grid grid-cols-1 gap-1">
            <div className="flex items-center justify-between p-3 rounded bg-dark-surface border border-dark-surfaceHover">
                <div className="flex items-center gap-2">
                    <User size={16} className={isConnected ? "text-green-500" : "text-gray-500"} />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">{isConnected ? 'Online' : 'Offline'}</span>
                        <span className="text-[10px] text-gray-400 leading-none mt-1">Chat Status</span>
                    </div>
                </div>
                <button
                    onClick={toggleConnection}
                    className={`p-1.5 rounded-md transition-all ${isConnected ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                    title={isConnected ? "Disconnect Chat" : "Connect Chat"}
                >
                    <Power size={16} />
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
