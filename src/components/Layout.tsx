import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { View } from '../App';
import { EmoteStats } from '../types';

interface LayoutProps {
    children: ReactNode;
    currentView: View;
    setCurrentView: (view: View) => void;
    emoteStats: EmoteStats;
}

export function Layout({ children, currentView, setCurrentView, emoteStats }: LayoutProps) {
    return (
        <div className="flex h-screen w-full bg-dark-bg text-gray-100 overflow-hidden">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} emoteStats={emoteStats} />
            <main className="flex-1 flex flex-col min-w-0 bg-dark-surface rounded-tl-xl shadow-2xl relative overflow-hidden my-2 mr-2 border border-[#2d2e35]">
                {children}
            </main>
        </div>
    );
}
