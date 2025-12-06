import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TwitchAuthService } from '../services/TwitchAuthService';

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    refreshToken: string | null;
    clientId: string | null;
    login: () => Promise<void>;
    logout: () => void;
    clearCredentials: () => void; // Added for explicit clear
    setManualToken: (token: string, refreshToken?: string, clientId?: string) => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [clientId, setClientId] = useState<string | null>(null);

    const login = useCallback(async () => {
        // Check if we are in Electron
        if (window.ipcRenderer) {
            try {
                const token = await TwitchAuthService.authenticateWithElectron();
                if (token) {
                    setToken(token);
                    setIsAuthenticated(true);
                    localStorage.setItem('twitch_token', token);
                }
            } catch (error) {
                console.error('Auth failed', error);
            }
        } else {
            // Fallback for dev mode (browser)
            window.location.href = TwitchAuthService.getAuthUrl();
        }
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setRefreshToken(null);
        setClientId(null);
        setIsAuthenticated(false);
        // Do NOT clear localStorage here, user wants to persist credentials
    }, []);

    const clearCredentials = useCallback(() => {
        setToken(null);
        setRefreshToken(null);
        setClientId(null);
        setIsAuthenticated(false);
        localStorage.removeItem('twitch_token');
        localStorage.removeItem('twitch_refresh_token');
        localStorage.removeItem('twitch_client_id');
    }, []);

    const setManualToken = useCallback((newToken: string, newRefreshToken?: string, newClientId?: string) => {
        setToken(newToken);
        localStorage.setItem('twitch_token', newToken);

        if (newRefreshToken) {
            setRefreshToken(newRefreshToken);
            localStorage.setItem('twitch_refresh_token', newRefreshToken);
        }

        if (newClientId) {
            setClientId(newClientId);
            localStorage.setItem('twitch_client_id', newClientId);
        }

        setIsAuthenticated(true);
    }, []);

    // Initial Load
    useEffect(() => {
        // Check local storage
        const storedToken = localStorage.getItem('twitch_token');
        const storedRefreshToken = localStorage.getItem('twitch_refresh_token');
        const storedClientId = localStorage.getItem('twitch_client_id');

        if (storedToken) {
            setToken(storedToken);
            if (storedRefreshToken) setRefreshToken(storedRefreshToken);
            if (storedClientId) setClientId(storedClientId);
            // Default to NOT authenticated initially if user explicitly logged out previously?
            // Actually, if tokens exist, we usually auto-login or at least prepopulate.
            // But if "logout" sets isAuthenticated=false and we reload...
            // the Effect runs and sets isAuthenticated=true again.
            // This means "Logout" will just act like a Refresh.
            // We need a persistent 'isAuthenticated' state if we want to stay logged out with tokens saved.
            // OR we just assume if tokens are there, we are ready to connect, but maybe not "Connected to Chat".
            // The AuthContext tracks "Twitch Auth", not "Chat Connection".
            // If tokens are there, we ARE authenticated with Twitch potentially.
            // Let's keep it simple: Tokens = Authenticated.
            // User can be Authenticated but Disconnected (from Chat).
            setIsAuthenticated(true);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, token, refreshToken, clientId, login, logout, clearCredentials, setManualToken }}>
            {children}
        </AuthContext.Provider>
    );
};
