import { Mic2, Settings, MessageSquare, ShieldAlert, Terminal, Info, ChevronLeft, ChevronRight, Loader2, Power, Twitch, LogOut, RefreshCw } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useChat } from '../context/ChatContext';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { View } from '../App';
import { EmoteStats } from '../types';
import { APP_VERSION } from '../config/version';
import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useUpdate } from '../context/UpdateContext';
import { DeviceAuthModal } from './DeviceAuthModal';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick: () => void;
    collapsed: boolean;
    badge?: boolean;
}

function NavItem({ icon: Icon, label, active, onClick, collapsed, badge }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={twMerge(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm w-full",
                active
                    ? "bg-twitch text-white font-medium shadow-lg shadow-twitch/20"
                    : "text-gray-400 hover:bg-dark-surfaceHover hover:text-white",
                collapsed && "justify-center px-2"
            )}
        >
            <span className="relative shrink-0">
                <Icon size={18} className={active ? "text-white" : "text-gray-500 group-hover:text-twitch-light transition-colors"} />
                {badge && <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full shadow-sm shadow-yellow-400/50" />}
            </span>
            {!collapsed && <span>{label}</span>}
            {!collapsed && badge && <span className="ml-auto text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Update</span>}
        </button>
    );
}

interface SidebarProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    emoteStats: EmoteStats;
}

export function Sidebar({ currentView, setCurrentView, emoteStats }: SidebarProps) {
    const { isAuthenticated, username, clearCredentials } = useTwitchAuth();
    const { isConnected, isConnecting, connect, disconnect } = useChat();
    const { sidebarCollapsed, setSidebarCollapsed } = useSettings();
    const { update, checking, error: updateError, checkForUpdate } = useUpdate();
    const [showDeviceAuth, setShowDeviceAuth] = useState(false);

    const collapsed = sidebarCollapsed;

    const handlePowerClick = async () => {
        if (!isAuthenticated) {
            setShowDeviceAuth(true);
            return;
        }
        if (isConnecting) return;
        if (isConnected) {
            await disconnect();
        } else {
            await connect();
        }
    };

    return (
        <div className={twMerge(
            "h-full flex flex-col p-3 bg-dark-bg shrink-0 transition-all duration-300 relative",
            collapsed ? "w-16" : "w-52"
        )}>
            {/* Toggle Button */}
            <button
                onClick={() => setSidebarCollapsed(!collapsed)}
                className="absolute -right-3 top-6 w-6 h-6 bg-dark-surface border border-dark-surfaceHover rounded-full text-gray-400 hover:text-white flex items-center justify-center shadow-lg transform hover:scale-105 transition-all z-10"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            <div className={twMerge("flex items-center gap-3 px-2 mb-4 mt-1 transition-all", collapsed && "justify-center px-0 flex-col gap-2")}>
                <div className="w-7 h-7 rounded bg-twitch flex items-center justify-center shadow-lg shadow-twitch/20 shrink-0">
                    <Terminal size={18} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col animate-in fade-in duration-200">
                        <h1 className="text-lg font-bold tracking-tight font-mono leading-none">VOX_TERMINAL</h1>
                        <span className="text-[10px] text-twitch font-mono font-medium opacity-80">v{APP_VERSION}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                            {checking && (
                                <span className="text-[9px] text-gray-400">checking for updates…</span>
                            )}
                            {!checking && update && (
                                <span className="text-[9px] text-yellow-400 font-semibold">↑ v{update.version} available</span>
                            )}
                            {!checking && !update && updateError && (
                                <span className="text-[9px] text-gray-400">update check failed</span>
                            )}
                            {!checking && !update && !updateError && (
                                <span className="text-[9px] text-green-400">up to date</span>
                            )}
                            <button
                                onClick={() => void checkForUpdate()}
                                disabled={checking}
                                title="Check for updates"
                                className="text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors"
                            >
                                <RefreshCw size={8} className={checking ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <nav className="flex-1 space-y-1">
                <NavItem icon={Mic2} label="Console" active={currentView === 'tts'} onClick={() => setCurrentView('tts')} collapsed={collapsed} />
                <NavItem icon={ShieldAlert} label="Filters" active={currentView === 'filters'} onClick={() => setCurrentView('filters')} collapsed={collapsed} />
                <NavItem icon={MessageSquare} label="Logs" active={currentView === 'logs'} onClick={() => setCurrentView('logs')} collapsed={collapsed} />
                <NavItem icon={Settings} label="Settings" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} collapsed={collapsed} />
                <NavItem icon={Info} label="About" active={currentView === 'about'} onClick={() => setCurrentView('about')} collapsed={collapsed} />
            </nav>

            <div className={twMerge("pt-3 mt-auto border-t border-dark-surfaceHover space-y-2", collapsed && "border-t-0 space-y-0")}>
                {emoteStats && !collapsed && (
                    <div className="px-3 py-2 bg-dark-surface rounded-lg border border-dark-surfaceHover space-y-1 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Emotes Loaded</div>
                        <div className="flex justify-between text-[10px] text-gray-300">
                            <span>7TV</span>
                            <span className="font-mono text-twitch-light">{emoteStats.sevenTv}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-300">
                            <span>BTTV</span>
                            <span className="font-mono text-purple-400">{emoteStats.bttv}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-300">
                            <span>FFZ</span>
                            <span className="font-mono text-blue-400">{emoteStats.ffz}</span>
                        </div>
                    </div>
                )}

                {/* Collapsed: status dot + power button */}
                {collapsed && (
                    <div className="flex flex-col items-center gap-2 pb-1">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-lg shadow-green-500/30' : isAuthenticated ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <button
                            onClick={handlePowerClick}
                            disabled={isConnecting}
                            title={!isAuthenticated ? 'Connect with Twitch' : isConnected ? 'Disconnect Chat' : 'Connect Chat'}
                            className={twMerge(
                                "p-2 rounded-lg transition-all",
                                isConnecting ? "bg-yellow-500/10 text-yellow-500 cursor-wait" :
                                isConnected ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" :
                                isAuthenticated ? "bg-dark-surfaceHover text-gray-400 hover:text-white" :
                                "bg-twitch/10 text-twitch hover:bg-twitch/20"
                            )}
                        >
                            {isConnecting ? <Loader2 size={16} className="animate-spin" /> :
                             !isAuthenticated ? <Twitch size={16} /> :
                             <Power size={16} />}
                        </button>
                    </div>
                )}

                {/* Expanded: account panel */}
                {!collapsed && (
                    isAuthenticated ? (
                        <div className="p-3 rounded-lg bg-dark-surface border border-dark-surfaceHover space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Twitch size={14} className="text-twitch shrink-0" />
                                    <span className="text-sm font-medium text-white truncate">{username ?? 'Connected'}</span>
                                </div>
                                <button
                                    onClick={handlePowerClick}
                                    disabled={isConnecting}
                                    title={isConnected ? 'Disconnect Chat' : 'Connect Chat'}
                                    className={twMerge(
                                        "p-1.5 rounded-md transition-all shrink-0",
                                        isConnecting ? "bg-yellow-500/10 text-yellow-500 cursor-wait" :
                                        isConnected ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" :
                                        "bg-dark-bg text-gray-400 hover:text-white hover:bg-dark-surfaceHover"
                                    )}
                                >
                                    {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-medium ${isConnecting ? 'text-yellow-500' : isConnected ? 'text-green-500' : 'text-gray-500'}`}>
                                    {isConnecting ? 'Connecting...' : isConnected ? 'Chat live' : 'Chat offline'}
                                </span>
                                <button
                                    onClick={clearCredentials}
                                    className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                                    title="Sign out"
                                >
                                    <LogOut size={10} />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDeviceAuth(true)}
                            disabled={isConnecting}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-lg w-full bg-twitch/10 hover:bg-twitch/20 border border-twitch/20 hover:border-twitch/30 text-twitch transition-colors"
                        >
                            <Twitch size={15} />
                            <span className="text-xs font-semibold">Connect with Twitch</span>
                        </button>
                    )
                )}
            </div>

            <DeviceAuthModal isOpen={showDeviceAuth} onClose={() => setShowDeviceAuth(false)} />
        </div>
    );
}
