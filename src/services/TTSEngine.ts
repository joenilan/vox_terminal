import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface TTSMessage {
    id: string;
    text: string;        // displayed in queue/history
    spokenText?: string; // what TTS actually says (defaults to text if omitted)
    username: string;
}

export interface TtsVoice {
    id: string;
    name: string;
    language: string;
}

export class TTSEngine {
    private queue: TTSMessage[] = [];
    private isPlaying = false;
    private stopped = false;
    private unlisten: UnlistenFn | null = null;

    public volume = 1.0;
    public rate = 1.0;
    public voiceId: string | null = null;
    public deviceId: string | null = null;

    private readonly onQueueChange: ((queue: TTSMessage[]) => void) | null;

    constructor(onQueueChange?: (queue: TTSMessage[]) => void) {
        this.onQueueChange = onQueueChange ?? null;
        this.setupListener();
    }

    private async setupListener() {
        this.unlisten = await listen<void>('speech-ended', () => {
            if (this.stopped) return;
            this.queue.shift();
            this.notifyQueue();
            if (this.queue.length > 0) {
                this.playNext();
            } else {
                this.isPlaying = false;
            }
        });
    }

    speak(text: string, username: string, spokenText?: string) {
        const msg: TTSMessage = { id: crypto.randomUUID(), text, spokenText, username };
        this.queue.push(msg);
        this.notifyQueue();
        if (!this.isPlaying) {
            this.stopped = false;
            this.isPlaying = true;
            this.playNext();
        }
    }

    private playNext() {
        const msg = this.queue[0];
        if (!msg) { this.isPlaying = false; return; }

        invoke('speak', {
            text: msg.spokenText ?? msg.text,
            voiceId: this.voiceId,
            deviceId: this.deviceId,
            rate: this.rate,
            volume: this.volume,
        }).catch(() => {
            this.queue.shift();
            this.notifyQueue();
            if (this.queue.length > 0) {
                this.playNext();
            } else {
                this.isPlaying = false;
            }
        });
    }

    stop() {
        this.stopped = true;
        this.isPlaying = false;
        this.queue = [];
        this.notifyQueue();
        invoke('stop_speech').catch(() => {});
    }

    setVoice(voiceId: string | null) { this.voiceId = voiceId; }
    setDevice(deviceId: string | null) { this.deviceId = deviceId; }

    destroy() {
        this.stop();
        this.unlisten?.();
    }

    private notifyQueue() {
        this.onQueueChange?.([...this.queue]);
    }
}
