import { ReactNode, useState } from 'react';
import { Download, X } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Sidebar } from './Sidebar';
import { View } from '../App';
import { EmoteStats } from '../types';
import { useUpdate } from '../context/UpdateContext';
import { DOWNLOAD_BASE } from '../services/UpdateService';

interface LayoutProps {
    children: ReactNode;
    currentView: View;
    setCurrentView: (view: View) => void;
    emoteStats: EmoteStats;
}

export function Layout({ children, currentView, setCurrentView, emoteStats }: LayoutProps) {
    const { updateInfo } = useUpdate();
    const [dismissedVersion, setDismissedVersion] = useState<string | null>(
        () => localStorage.getItem('dismissed-update')
    );

    const showBanner = !!updateInfo && updateInfo.version !== dismissedVersion;

    const dismiss = () => {
        if (updateInfo) {
            localStorage.setItem('dismissed-update', updateInfo.version);
            setDismissedVersion(updateInfo.version);
        }
    };

    return (
        <div className="flex h-screen w-full bg-dark-bg text-gray-100 overflow-hidden">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} emoteStats={emoteStats} />
            <main className="flex-1 flex flex-col min-w-0 bg-dark-surface rounded-xl shadow-2xl relative overflow-hidden my-2 mr-2 border border-[#2d2e35]">
                {showBanner && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-400/10 border-b border-yellow-400/20 text-sm shrink-0">
                        <Download size={14} className="text-yellow-400 shrink-0" />
                        <span className="text-yellow-300 font-medium flex-1">
                            VOX_TERMINAL v{updateInfo!.version} is available —{' '}
                            <span className="text-yellow-400/70">{updateInfo!.notes}</span>
                        </span>
                        <button
                            onClick={() => openUrl(`${DOWNLOAD_BASE}/${updateInfo!.files.setup}`).catch(() => {})}
                            className="px-2.5 py-1 bg-yellow-400 text-black text-xs font-bold rounded-md hover:bg-yellow-300 transition-colors shrink-0"
                        >
                            Download
                        </button>
                        <button
                            onClick={dismiss}
                            className="text-yellow-400/50 hover:text-yellow-300 transition-colors shrink-0"
                            title="Dismiss"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
