import tmi from 'tmi.js';

export interface FilterSettings {
    blockedUsers: string[];
    blockedWords: string[];
    allowEmotes: boolean; // If false, strip emotes
    maxMessageLength: number;
    removeRepeatedChars: boolean; // e.g. "Wwwwwwhat" -> "What"
    removeRepeatedWords: boolean;
}

export class FilterService {
    private settings: FilterSettings = {
        blockedUsers: [],
        blockedWords: [],
        allowEmotes: false,
        maxMessageLength: 300,
        removeRepeatedChars: true,
        removeRepeatedWords: true
    };


    private externalEmotes: Set<string> = new Set();

    constructor(initialSettings?: Partial<FilterSettings>) {
        if (initialSettings) {
            this.updateSettings(initialSettings);
        }
    }

    setExternalEmotes(emotes: Set<string>) {
        this.externalEmotes = emotes;
    }

    updateSettings(newSettings: Partial<FilterSettings>) {
        this.settings = { ...this.settings, ...newSettings };
    }

    shouldProcess(username: string, message: string, tags: tmi.ChatUserstate): { process: boolean; cleanMessage: string } {
        // 1. Blocked Users
        if (this.settings.blockedUsers.map(u => u.toLowerCase()).includes(username.toLowerCase())) {
            return { process: false, cleanMessage: '' };
        }

        // 2. Length Check
        if (message.length > this.settings.maxMessageLength) {
            return { process: false, cleanMessage: '' };
        }

        let cleanMessage = message;

        // 3. Emotes stripping 
        if (!this.settings.allowEmotes) {
            // A. Standard Twitch Emotes (using ranges)
            if (tags.emotes) {
                const ranges: [number, number][] = [];
                Object.values(tags.emotes).forEach((rangeList) => {
                    rangeList.forEach((rangeStr: string) => {
                        const [start, end] = rangeStr.split('-').map(Number);
                        ranges.push([start, end]);
                    });
                });

                ranges.sort((a, b) => b[0] - a[0]);

                ranges.forEach(([start, end]) => {
                    cleanMessage = cleanMessage.substring(0, start) + cleanMessage.substring(end + 1);
                });
            }

            // B. External Emotes (7TV, BTTV, FFZ) logic
            // We split by space and check tokens.
            const words = cleanMessage.split(/\s+/);
            const filteredWords = words.filter(word => !this.externalEmotes.has(word));

            // Reconstruct if changed. Warning: this normalizes whitespace.
            if (filteredWords.length !== words.length) {
                cleanMessage = filteredWords.join(' ');
            }
        }

        // 4. Blocked Words (Censoring)
        // We replace blocked words with asterisks ****
        this.settings.blockedWords.forEach(word => {
            const regex = new RegExp(word, 'gi');
            cleanMessage = cleanMessage.replace(regex, '*'.repeat(word.length));
        });

        // 5. Repeated Chars (Simple spam filter)
        if (this.settings.removeRepeatedChars) {
            cleanMessage = cleanMessage.replace(/(.)\1{2,}/g, '$1$1'); // "aaaaa" -> "aa"
        }

        // 6. Repeated Words/Phrases (Raid Protection)
        // Collapses "Word Word Word" -> "Word"
        // Collapses "Long Phrase Long Phrase Long Phrase" -> "Long Phrase"
        if (this.settings.removeRepeatedWords) {
            // Regex explanation:
            // \b            - Word boundary start
            // (             - Group 1: The phrase to match
            //   \S+         - First word (non-whitespace)
            //   (?:         - Non-capturing group for subsequent words
            //     \s+\S+    - Space followed by word
            //   ){0,3}      - Match 0 to 3 extra words (limit phrase length to 4 words to prevent catastrophic backtracking)
            // )             - End Group 1
            // (?:           - Non-capturing group for repetitions
            //   \s+\1       - Space followed by exact same phrase
            // ){2,}         - Repeated 2 or more times (so 3+ total occurrences)
            // \b            - Word boundary end
            const repeatRegex = /\b(\S+(?:\s+\S+){0,3})(?:\s+\1){2,}\b/gi;
            cleanMessage = cleanMessage.replace(repeatRegex, '$1');
        }

        return { process: true, cleanMessage: cleanMessage.trim() };
    }
}
