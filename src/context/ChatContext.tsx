import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { TwitchChatService } from '../services/TwitchChatService';
import { useTwitchAuth } from '../hooks/useTwitchAuth';
import { useSettings } from './SettingsContext';
import { ExternalEmoteService } from '../services/ExternalEmoteService';
import { EmoteStats } from '../types';

interface ChatContextType {
    isConnected: boolean;
    isConnecting: boolean;
    connect: (overrideToken?: string) => Promise<void>;
    disconnect: () => Promise<void>;
    addMessageHandler: (handler: (channel: string, tags: any, message: string, self: boolean) => void) => void;
    removeMessageHandler: (handler: (channel: string, tags: any, message: string, self: boolean) => void) => void;
    emoteStats: EmoteStats | null;
    emotes: Set<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const { token, isAuthenticated } = useTwitchAuth();
    const { autoConnect } = useSettings();

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [emoteStats, setEmoteStats] = useState<EmoteStats | null>(null);
    const [emotes, setEmotes] = useState<Set<string>>(new Set());

    // Track explicit disconnection to prevent auto-reconnect loops
    const [manualDisconnect, setManualDisconnect] = useState(false);

    // Service Ref
    const chatService = useRef<TwitchChatService | null>(null);
    const handlers = useRef<Set<(channel: string, tags: any, message: string, self: boolean) => void>>(new Set());

    // Initialize Service
    useEffect(() => {
        chatService.current = new TwitchChatService((channel, tags, message, self) => {
            handlers.current.forEach(handler => handler(channel, tags, message, self));
        });

        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            chatService.current?.disconnect();
        };
    }, []);

    const connect = useCallback(async (overrideToken?: string) => {
        const activeToken = overrideToken || token;
        // If overrideToken is present, we assume we are authenticated for the purpose of the attempt
        const activeAuth = overrideToken ? true : isAuthenticated;

        if (!activeAuth || !activeToken || isConnecting) return;

        setIsConnecting(true);

        // Reset manual disconnect flag on explicit connect attempt
        setManualDisconnect(false);

        try {
            // Fetch user info using the token (lightweight validation)
            const response = await fetch('https://id.twitch.tv/oauth2/validate', {
                headers: { 'Authorization': `OAuth ${activeToken}` }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token invalid - do not retry auto-connect
                    setManualDisconnect(true);
                }
                throw new Error('Invalid Token');
            }

            const data = await response.json();
            const username = data.login;
            const userId = data.user_id;

            // Connect to chat
            await chatService.current?.connect(username, activeToken, username);
            setIsConnected(true);
            setIsConnecting(false);

            // Fetch Emotes
            if (userId) {
                ExternalEmoteService.getEmotes(userId).then(res => {
                    setEmoteStats(res.stats);
                    setEmotes(res.emotes);
                });
            }

        } catch (e: any) {
            console.error("Chat Connect Failed", e);
            setIsConnected(false);
            setIsConnecting(false);
            throw e;
        }
    }, [isAuthenticated, token, isConnecting]);

    const disconnect = async () => {
        if (chatService.current) {
            await chatService.current.disconnect();
            setIsConnected(false);
            setEmoteStats(null);
            setEmotes(new Set());
            // Implicitly set manual disconnect to prevent auto-reconnect
            setManualDisconnect(true);
        }
    };

    // Auto-Connect Effect
    useEffect(() => {
        let mounted = true;

        // Logic: 
        // 1. Must be authenticated & have token
        // 2. Auto-connect setting must be ON
        // 3. Must NOT be currently connected
        // 4. Must NOT have been manually disconnected in this session

        if (autoConnect && isAuthenticated && token && !isConnected && !manualDisconnect) {
            const timer = setTimeout(() => {
                if (mounted && !isConnected && !manualDisconnect) {
                    // console.log("ChatContext: Triggering Auto-Connect...");
                    connect().catch(e => console.warn("Auto-connect failed:", e));
                }
            }, 1000); // Small delay
            return () => clearTimeout(timer);
        }

        return () => { mounted = false; };
    }, [autoConnect, isAuthenticated, token, isConnected, manualDisconnect, connect]);


    const addMessageHandler = (handler: any) => handlers.current.add(handler);
    const removeMessageHandler = (handler: any) => handlers.current.delete(handler);

    return (
        <ChatContext.Provider value={{ isConnected, isConnecting, connect, disconnect, addMessageHandler, removeMessageHandler, emoteStats, emotes }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
}
