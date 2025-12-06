
export class ExternalEmoteService {
    private static BTTV_API = 'https://api.betterttv.net/3/cached/users/twitch/';
    private static FFZ_API = 'https://api.frankerfacez.com/v1/room/id/';
    private static SEVENTV_API = 'https://7tv.io/v3/users/twitch/';

    static async getEmotes(channelId: string): Promise<{
        emotes: Set<string>;
        stats: { bttv: number; ffz: number; sevenTv: number; };
    }> {
        const emotes = new Set<string>();
        let bttvCount = 0;
        let ffzCount = 0;
        let sevenTvCount = 0;

        try {
            const [bttv, ffz, sevenTv] = await Promise.allSettled([
                this.fetchBTTV(channelId),
                this.fetchFFZ(channelId),
                this.fetch7TV(channelId)
            ]);

            if (bttv.status === 'fulfilled') {
                bttv.value.forEach(e => emotes.add(e));
                bttvCount += bttv.value.length;
            }
            if (ffz.status === 'fulfilled') {
                ffz.value.forEach(e => emotes.add(e));
                ffzCount += ffz.value.length;
            }
            if (sevenTv.status === 'fulfilled') {
                sevenTv.value.forEach(e => emotes.add(e));
                sevenTvCount += sevenTv.value.length;
            }

            const [bttvGlobal, sevenTvGlobal] = await Promise.allSettled([
                this.fetchBTTVGlobal(),
                this.fetch7TVGlobal()
            ]);

            if (bttvGlobal.status === 'fulfilled') {
                bttvGlobal.value.forEach(e => emotes.add(e));
                bttvCount += bttvGlobal.value.length;
            }
            if (sevenTvGlobal.status === 'fulfilled') {
                sevenTvGlobal.value.forEach(e => emotes.add(e));
                sevenTvCount += sevenTvGlobal.value.length;
            }

            console.log(`Loaded ${emotes.size} external emotes.`);

        } catch (e) {
            console.error("Failed to load some emotes", e);
        }

        return {
            emotes,
            stats: {
                bttv: bttvCount,
                ffz: ffzCount,
                sevenTv: sevenTvCount
            }
        };
    }

    private static async fetchBTTV(channelId: string): Promise<string[]> {
        const res = await fetch(`${this.BTTV_API}${channelId}`);
        if (!res.ok) return [];
        const data = await res.json();
        // BTTV returns { channelEmotes: [], sharedEmotes: [] }
        const names: string[] = [];
        if (data.channelEmotes) names.push(...data.channelEmotes.map((e: any) => e.code));
        if (data.sharedEmotes) names.push(...data.sharedEmotes.map((e: any) => e.code));
        return names;
    }

    private static async fetchBTTVGlobal(): Promise<string[]> {
        const res = await fetch('https://api.betterttv.net/3/cached/emotes/global');
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((e: any) => e.code);
    }

    private static async fetchFFZ(channelId: string): Promise<string[]> {
        const res = await fetch(`${this.FFZ_API}${channelId}`);
        if (!res.ok) return [];
        const data = await res.json();
        // FFZ returns { sets: { 'id': { emoticons: [] } } }
        const names: string[] = [];
        if (data.sets) {
            Object.values(data.sets).forEach((set: any) => {
                if (set.emoticons) {
                    names.push(...set.emoticons.map((e: any) => e.name));
                }
            });
        }
        return names;
    }

    private static async fetch7TV(channelId: string): Promise<string[]> {
        const res = await fetch(`${this.SEVENTV_API}${channelId}`);
        if (!res.ok) return [];
        const data = await res.json();
        // 7TV returns { emote_set: { emotes: [] } }
        const names: string[] = [];
        if (data.emote_set && data.emote_set.emotes) {
            names.push(...data.emote_set.emotes.map((e: any) => e.name));
        }
        return names;
    }

    private static async fetch7TVGlobal(): Promise<string[]> {
        // 7TV Global is complex, it's an emote set.
        // Usually, the "Global" set ID is 'global' but API structure varies.
        // Simpler to rely on channel set for now as most users import what they want.
        // But let's try a known global set ID or skip if too complex for strict types.
        // https://7tv.io/v3/emote-sets/global

        try {
            const res = await fetch('https://7tv.io/v3/emote-sets/global');
            if (!res.ok) return [];
            const data = await res.json();
            if (data.emotes) {
                return data.emotes.map((e: any) => e.name);
            }
        } catch (e) {
            return [];
        }
        return [];
    }
}
