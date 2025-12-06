import tmi from 'tmi.js';

export type ChatMessageHandler = (channel: string, tags: tmi.ChatUserstate, message: string, self: boolean) => void;

export class TwitchChatService {
    private client: tmi.Client | null = null;
    private messageHandler: ChatMessageHandler | null = null;

    // @ts-ignore - Used for status checks potentially
    private isConnected = false;

    constructor(handler?: ChatMessageHandler) {
        if (handler) this.messageHandler = handler;
    }

    async connect(username: string, token: string, channel: string) {
        if (this.client) {
            await this.disconnect();
        }

        this.isConnected = false;

        this.client = new tmi.Client({
            options: { debug: true, messagesLogLevel: "info" },
            connection: {
                reconnect: true,
                secure: true
            },
            identity: {
                username: username,
                password: `oauth:${token}`
            },
            channels: [channel]
        });

        this.client.on('message', (channel, tags, message, self) => {
            if (this.messageHandler) {
                this.messageHandler(channel, tags, message, self);
            }
        });

        await this.client.connect();
        this.isConnected = true;
    }

    async disconnect() {
        if (this.client) {
            try {
                await this.client.disconnect();
            } catch (e) {
                console.error("Error disconnecting:", e);
            }
            this.client = null;
            this.isConnected = false;
        }
    }

    setHandler(handler: ChatMessageHandler) {
        this.messageHandler = handler;
    }
}
