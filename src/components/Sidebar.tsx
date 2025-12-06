import { Mic2, Settings, MessageSquare, ShieldAlert, Terminal, Info, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { AuthStatus } from './AuthStatus';
import { useChat } from '../context/ChatContext';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { View } from '../App';
import { EmoteStats } from '../types';
import { APP_VERSION } from '../config/version';
import { useState } from 'react';
import { TokenModal } from './TokenModal';


interface NavItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick: () => void;
    collapsed: boolean;
}

function NavItem({ icon: Icon, label, active, onClick, collapsed }: NavItemProps) {
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
            <Icon size={18} className={active ? "text-white" : "text-gray-500 group-hover:text-twitch-light transition-colors"} />
            {!collapsed && <span>{label}</span>}
        </button>
    );
}

interface SidebarProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    emoteStats: EmoteStats;
}

import { useSettings } from '../context/SettingsContext';

export function Sidebar({ currentView, setCurrentView, emoteStats }: SidebarProps) {
    const auth = useTwitchAuth();
    const { isConnecting } = useChat(); // Added isConnecting for button feedback
    const { sidebarCollapsed, setSidebarCollapsed } = useSettings();
    const [showTokenModal, setShowTokenModal] = useState(false);

    // Use persisted state directly
    const collapsed = sidebarCollapsed;
    const setCollapsed = setSidebarCollapsed;

    return (
        <div className={twMerge(
            "h-full flex flex-col p-3 bg-dark-bg shrink-0 transition-all duration-300 relative",
            collapsed ? "w-16" : "w-52"
        )}>
            {/* Toggle Button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
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

            <div className={twMerge("pt-3 mt-auto border-t border-dark-surfaceHover space-y-3", collapsed && "border-t-0 space-y-0")}>
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

                <div className={twMerge("origin-left transition-all", collapsed ? "scale-0 w-0 h-0 overflow-hidden" : "scale-90 w-[110%]")}>
                    <AuthStatus auth={auth} />
                </div>

                {/* Collapsed Auth status indicator */}
                {collapsed && (
                    <div className="flex justify-center pb-2">
                        <button
                            onClick={() => !auth.isAuthenticated && setShowTokenModal(true)}
                            className={`w-3 h-3 rounded-full ${auth.isAuthenticated ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-red-500 hover:bg-red-400 cursor-pointer'}`}
                            title={auth.isAuthenticated ? 'Connected' : 'Click to Connect'}
                        />
                    </div>
                )}

                {!auth.isAuthenticated && !collapsed && (
                    <button
                        onClick={() => setShowTokenModal(true)}
                        disabled={isConnecting}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group w-full ${isConnecting
                            ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 cursor-wait'
                            : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30'
                            }`}
                    >
                        {isConnecting ? (
                            <Loader2 size={8} className="animate-spin text-yellow-500" />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 group-hover:animate-pulse" />
                        )}
                        <span className={`text-xs font-medium ${isConnecting ? 'text-yellow-500' : 'text-red-500'}`}>
                            {isConnecting ? 'Connecting...' : 'Connect Account'}
                        </span>
                    </button>
                )}
            </div>

            <TokenModal isOpen={showTokenModal} onClose={() => setShowTokenModal(false)} />
        </div>
    );
}
