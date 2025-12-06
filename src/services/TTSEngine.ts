export interface TTSMessage {
    id: string;
    text: string;
    username: string;
    processed?: boolean;
}

export class TTSEngine {
    // @ts-ignore - Used in internal callbacks
    private synth = window.speechSynthesis;
    // @ts-ignore - Used
    private queue: TTSMessage[] = [];
    // @ts-ignore - Used
    private isSpeaking = false;
    // @ts-ignore - reference kept
    private currentUtterance: SpeechSynthesisUtterance | null = null;

    // Settings
    public volume = 1; // 0 to 1
    public rate = 1;   // 0.1 to 10
    public pitch = 1;  // 0 to 2
    public selectedVoice: SpeechSynthesisVoice | null = null;

    // Events
    private onQueueChange: ((queue: TTSMessage[]) => void) | null = null;

    constructor(onQueueChange?: (queue: TTSMessage[]) => void) {
        this.onQueueChange = onQueueChange || null;
    }

    // @ts-ignore
    public getCurrentUtterance() { return this.currentUtterance; }

    getVoices(): SpeechSynthesisVoice[] {
        return window.speechSynthesis.getVoices();
    }

    speak(text: string, username: string) {
        const message: TTSMessage = {
            id: crypto.randomUUID(),
            text,
            username,
            processed: false
        };

        this.queue.push(message);
        this.notifyQueue();
        this.processQueue();
    }

    stop() {
        window.speechSynthesis.cancel();
        this.queue = [];
        this.isSpeaking = false;
        this.notifyQueue();
    }

    skipCurrent() {
        window.speechSynthesis.cancel();
        this.isSpeaking = false;
        this.processQueue();
    }

    private processQueue() {
        if (this.isSpeaking || this.queue.length === 0) return;

        const message = this.queue[0]; // Peek
        this.isSpeaking = true;

        const utterance = new SpeechSynthesisUtterance(message.text);

        if (this.selectedVoice) utterance.voice = this.selectedVoice;
        utterance.volume = this.volume;
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;

        utterance.onend = () => {
            this.queue.shift(); // Remove finished
            this.isSpeaking = false;
            this.notifyQueue();
            this.processQueue(); // Process next
        };

        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            this.queue.shift();
            this.isSpeaking = false;
            this.notifyQueue();
            this.processQueue();
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    private notifyQueue() {
        if (this.onQueueChange) {
            this.onQueueChange([...this.queue]);
        }
    }

    setVoice(voiceName: string) {
        const voices = this.getVoices();
        this.selectedVoice = voices.find(v => v.name === voiceName) || null;
    }
}
