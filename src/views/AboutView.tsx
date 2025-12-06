import { ViewShell } from '../components/ViewShell';
import { Terminal, Heart, Globe, Github, Twitter, Coffee, Rocket, Twitch, Volume2, Settings } from 'lucide-react';
import { APP_VERSION } from '../config/version';

export function AboutView() {
    const openLink = (url: string) => {
        if (window.ipcRenderer) {
            window.ipcRenderer.invoke('open-external', url);
        } else {
            window.open(url, '_blank');
        }
    };

    return (
        <ViewShell
            title="SYSTEM_INFO"
            subtitle="About & Credits"
            icon={Terminal}
        >
            <div className="max-w-2xl mx-auto space-y-8 mt-4">

                {/* Developer Profile */}
                <div className="p-6 bg-dark-bg border border-dark-surfaceHover rounded-xl text-center space-y-4">
                    <div className="w-20 h-20 bg-twitch mx-auto rounded-full flex items-center justify-center shadow-lg shadow-twitch/20 mb-4">
                        <Terminal size={40} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">VOX_TERMINAL</h2>
                        <p className="text-twitch font-mono text-sm opacity-80 mt-1">v{APP_VERSION}</p>
                    </div>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Advanced Text-to-Speech Engine utilizing Twitch chat integration.
                        Built for streamers, by streamers.
                    </p>

                    {/* Audio Output Limitation Note */}
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-left space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-lg shrink-0">
                                <Volume2 size={20} className="text-yellow-500" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-yellow-500 uppercase mb-1">Audio Output Selection</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    This app uses the Windows System TTS Engine, which follows your default playback device.
                                    To route audio to a specific mixer track (e.g., for OBS):
                                </p>
                                <ol className="list-decimal list-inside text-xs text-gray-400 mt-2 space-y-1 ml-1">
                                    <li>Start playing audio in VOX_TERMINAL (use Test button).</li>
                                    <li>Open <strong>Windows Volume Mixer</strong>.</li>
                                    <li>Find <strong>VOX_TERMINAL</strong> in the apps list.</li>
                                    <li>Change the <strong>Output Device</strong> dropdown.</li>
                                </ol>
                            </div>
                        </div>

                        <button
                            onClick={() => openLink('ms-settings:apps-volume')}
                            className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-yellow-500/20 flex items-center justify-center gap-2"
                        >
                            <Settings size={14} />
                            Open Windows Volume Mixer
                        </button>
                    </div>

                    <div className="pt-4 border-t border-dark-surfaceHover flex flex-col items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Developed By</span>
                        <h3 className="text-xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-twitch-light to-purple-400">
                            ZMBRT
                        </h3>
                    </div>
                </div>

                {/* Socials & Support */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Socials */}
                    <div className="p-6 bg-dark-bg border border-dark-surfaceHover rounded-xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Globe size={18} className="text-blue-400" />
                            <h3 className="font-bold text-white">Connect</h3>
                        </div>
                        <div className="space-y-2">
                            <button onClick={() => openLink('https://x.com/dreadedzombietv')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-surface hover:bg-dark-surfaceHover border border-transparent hover:border-dark-surfaceHover transition-all group text-left">
                                <Twitter size={18} className="text-gray-400 group-hover:text-blue-400" />
                                <span className="text-gray-300 group-hover:text-white text-sm font-medium">Twitter / X</span>
                            </button>
                            <button onClick={() => openLink('https://twitch.tv/dreadedzombie')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-surface hover:bg-dark-surfaceHover border border-transparent hover:border-dark-surfaceHover transition-all group text-left">
                                <Twitch size={18} className="text-gray-400 group-hover:text-purple-400" />
                                <span className="text-gray-300 group-hover:text-white text-sm font-medium">Twitch</span>
                            </button>
                            <button onClick={() => openLink('https://github.com/joenilan')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-surface hover:bg-dark-surfaceHover border border-transparent hover:border-dark-surfaceHover transition-all group text-left">
                                <Github size={18} className="text-gray-400 group-hover:text-white" />
                                <span className="text-gray-300 group-hover:text-white text-sm font-medium">GitHub</span>
                            </button>
                        </div>
                    </div>

                    {/* Support */}
                    <div className="p-6 bg-dark-bg border border-dark-surfaceHover rounded-xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Heart size={18} className="text-pink-500" />
                            <h3 className="font-bold text-white">Support Development</h3>
                        </div>
                        <div className="space-y-2">
                            <button onClick={() => openLink('https://streamelements.com/dreadedzombie/tip')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-surface hover:bg-dark-surfaceHover border border-transparent hover:border-dark-surfaceHover transition-all group text-left">
                                <Rocket size={18} className="text-gray-400 group-hover:text-yellow-400" />
                                <span className="text-gray-300 group-hover:text-white text-sm font-medium">Send me a tip!</span>
                            </button>
                            <button onClick={() => openLink('https://ko-fi.com/dreadedzombie')} className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-surface hover:bg-dark-surfaceHover border border-transparent hover:border-dark-surfaceHover transition-all group text-left">
                                <Coffee size={18} className="text-gray-400 group-hover:text-yellow-400" />
                                <span className="text-gray-300 group-hover:text-white text-sm font-medium">Buy me a Coffee</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div >
        </ViewShell >
    );
}
