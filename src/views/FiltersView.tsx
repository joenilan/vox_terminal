import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Shield, UserX, MessageSquareX, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { ViewShell } from '../components/ViewShell';

// Helper Component for individual blocked words
function BlockedWordItem({ word, onRemove }: { word: string, onRemove: () => void }) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="flex items-center justify-between p-2 rounded bg-dark-bg border border-dark-surfaceHover group">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="text-gray-500 hover:text-white transition-colors"
                >
                    {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <span className={`font-mono ${isVisible ? 'text-white' : 'text-gray-500'}`}>
                    {isVisible ? word : (word.charAt(0) + '•'.repeat(Math.max(0, word.length - 1)))}
                </span>
            </div>
            <button
                onClick={onRemove}
                className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

export function FiltersView() {
    const { filterSettings, updateFilterSettings } = useSettings();
    const [newUser, setNewUser] = useState('');
    const [newWord, setNewWord] = useState('');

    const handleAddUser = () => {
        if (newUser && !filterSettings.blockedUsers.includes(newUser)) {
            updateFilterSettings({
                blockedUsers: [...filterSettings.blockedUsers, newUser]
            });
            setNewUser('');
        }
    };

    const handleRemoveUser = (user: string) => {
        updateFilterSettings({
            blockedUsers: filterSettings.blockedUsers.filter(u => u !== user)
        });
    };

    const handleAddWord = () => {
        if (newWord && !filterSettings.blockedWords.includes(newWord)) {
            updateFilterSettings({
                blockedWords: [...filterSettings.blockedWords, newWord]
            });
            setNewWord('');
        }
    };

    const handleRemoveWord = (word: string) => {
        updateFilterSettings({
            blockedWords: filterSettings.blockedWords.filter(w => w !== word)
        });
    };

    return (
        <ViewShell title="SAFETY_PROTOCOLS" subtitle="Content filtering & blocking configuration" icon={Shield}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100%-1rem)] min-h-0">
                {/* Blocked Users */}
                <div className="p-4 rounded-xl bg-dark-bg border border-dark-surfaceHover flex flex-col h-full min-h-[300px] overflow-hidden">
                    <div className="flex items-center gap-2 mb-3 shrink-0">
                        <UserX className="text-red-400" size={16} />
                        <h3 className="text-base font-semibold text-white">Blocked Users</h3>
                    </div>

                    <div className="flex gap-2 mb-3 shrink-0">
                        <input
                            type="text"
                            value={newUser}
                            onChange={(e) => setNewUser(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
                            placeholder="Username..."
                            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white text-sm focus:border-twitch focus:ring-1 focus:ring-twitch transition-all placeholder:text-gray-600"
                        />
                        <button
                            onClick={handleAddUser}
                            disabled={!newUser}
                            className="p-1.5 bg-twitch hover:bg-twitch-dark text-white rounded-lg disabled:opacity-50 shrink-0"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 bg-dark-surface p-2 rounded-lg border border-dark-surfaceHover min-h-0">
                        {filterSettings.blockedUsers.length === 0 ? (
                            <div className="text-center text-gray-500 py-4 italic text-xs">No blocked users</div>
                        ) : (
                            filterSettings.blockedUsers.map(user => (
                                <div key={user} className="flex items-center justify-between p-1.5 rounded bg-dark-bg border border-dark-surfaceHover group">
                                    <span className="text-gray-300 text-sm truncate max-w-[150px]">{user}</span>
                                    <button
                                        onClick={() => handleRemoveUser(user)}
                                        className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Blocked Words */}
                <div className="p-4 rounded-xl bg-dark-bg border border-dark-surfaceHover flex flex-col h-full min-h-[300px] overflow-hidden">
                    <div className="flex items-center gap-2 mb-3 shrink-0">
                        <MessageSquareX className="text-orange-400" size={16} />
                        <h3 className="text-base font-semibold text-white">Blocked Words</h3>
                    </div>

                    <div className="flex gap-2 mb-3 shrink-0">
                        <input
                            type="text"
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                            placeholder="Word or phrase..."
                            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-surfaceHover text-white text-sm focus:border-twitch focus:ring-1 focus:ring-twitch transition-all placeholder:text-gray-600"
                        />
                        <button
                            onClick={handleAddWord}
                            disabled={!newWord}
                            className="p-1.5 bg-twitch hover:bg-twitch-dark text-white rounded-lg disabled:opacity-50 shrink-0"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 bg-dark-surface p-2 rounded-lg border border-dark-surfaceHover min-h-0">
                        {filterSettings.blockedWords.length === 0 ? (
                            <div className="text-center text-gray-500 py-4 italic text-xs">No blocked words</div>
                        ) : (
                            filterSettings.blockedWords.map(word => (
                                <BlockedWordItem
                                    key={word}
                                    word={word}
                                    onRemove={() => handleRemoveWord(word)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* General Settings */}
                <div className="lg:col-span-2 p-4 rounded-xl bg-dark-bg border border-dark-surfaceHover h-fit shrink-0">
                    <h3 className="text-base font-semibold mb-3 text-white">Processing Rules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-dark-surface overflow-hidden">
                            <div className="min-w-0 mr-2">
                                <div className="text-sm font-medium text-white truncate">Remove Emotes</div>
                                <div className="text-xs text-gray-400 truncate">Strip emotes from audio</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={!filterSettings.allowEmotes}
                                    onChange={(e) => updateFilterSettings({ allowEmotes: !e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-twitch/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-twitch"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-dark-surface overflow-hidden">
                            <div className="min-w-0 mr-2">
                                <div className="text-sm font-medium text-white truncate">Anti-Spam</div>
                                <div className="text-xs text-gray-400 truncate">Reduce repeated chars</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={filterSettings.removeRepeatedChars}
                                    onChange={(e) => updateFilterSettings({ removeRepeatedChars: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-twitch/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-twitch"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-dark-surface overflow-hidden md:col-span-2 lg:col-span-1">
                            <div className="flex-1 mr-4 min-w-0">
                                <div className="text-sm font-medium text-white truncate">Max Length</div>
                                <div className="text-xs text-gray-400 truncate">Limit chars ({filterSettings.maxMessageLength})</div>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="500"
                                step="10"
                                value={filterSettings.maxMessageLength}
                                onChange={(e) => updateFilterSettings({ maxMessageLength: parseInt(e.target.value) })}
                                className="w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-twitch shrink-0"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </ViewShell>
    );
}
