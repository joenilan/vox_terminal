import React from 'react';
import { Download, Trash2, FileText, Clock } from 'lucide-react';
import { ViewShell } from '../components/ViewShell';

export function LogsView({ logs, onClear }: {
    logs: { timestamp: string, user: string, message: string }[],
    onClear: () => void
}) {
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleExport = () => {
        const text = logs.map(l => `[${l.timestamp}] ${l.user}: ${l.message}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tts-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
    };

    return (
        <ViewShell
            title="SYSTEM_LOGS"
            subtitle="Session history archive"
            icon={FileText}
            headerAction={
                <>
                    <button
                        onClick={onClear}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20 text-xs font-medium"
                    >
                        <Trash2 size={14} />
                        Clear
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-1.5 bg-twitch hover:bg-twitch-dark text-white rounded-lg transition-colors text-xs font-medium"
                    >
                        <Download size={14} />
                        Export
                    </button>
                </>
            }
        >
            <div className="rounded-xl bg-dark-bg border border-dark-surfaceHover h-full flex flex-col">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm scroll-smooth custom-scrollbar"
                >
                    {logs.length === 0 ? (
                        <div className="text-center text-gray-500 py-20 italic flex flex-col items-center">
                            <Clock size={48} className="mb-4 opacity-20" />
                            No logs for this session
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="hover:bg-dark-surface p-1 rounded flex gap-2">
                                <span className="text-gray-500">[{log.timestamp}]</span>
                                <span className="font-bold text-twitch-light">{log.user}:</span>
                                <span className="text-gray-300">{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </ViewShell>
    );
}
