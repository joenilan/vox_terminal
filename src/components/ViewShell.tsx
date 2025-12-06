import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ViewShellProps {
    title: string;
    subtitle: string;
    icon?: LucideIcon;
    headerAction?: React.ReactNode;
    children: React.ReactNode;
}

export function ViewShell({ title, subtitle, icon: Icon, headerAction, children }: ViewShellProps) {
    return (
        <div className="h-full flex flex-col p-4 overflow-hidden">
            <header className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        {Icon && <Icon className="text-twitch" size={20} />}
                        <h2 className="text-xl font-bold text-white font-mono tracking-wider">{title}</h2>
                    </div>
                    <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
                {headerAction && (
                    <div className="flex gap-2">
                        {headerAction}
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-y-auto min-h-0">
                {children}
            </div>
        </div>
    );
}
