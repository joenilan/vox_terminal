import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TwitchAuthService } from '../services/TwitchAuthService';

const REFRESH_EARLY_MS = 5 * 60 * 1000; // refresh 5 min before expiry

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    refreshToken: string | null;
    username: string | null;
    logout: () => void;
    clearCredentials: () => void;
    setManualToken: (token: string, refreshToken?: string, expiresAt?: number) => void;
    setUsername: (username: string) => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
    const [username, setUsernameState] = useState<string | null>(null);

    const setUsername = useCallback((name: string) => {
        setUsernameState(name);
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setRefreshToken(null);
        setIsAuthenticated(false);
    }, []);

    const clearCredentials = useCallback(() => {
        setToken(null);
        setRefreshToken(null);
        setTokenExpiresAt(null);
        setUsernameState(null);
        setIsAuthenticated(false);
        localStorage.removeItem('twitch_token');
        localStorage.removeItem('twitch_refresh_token');
        localStorage.removeItem('twitch_token_expires_at');
    }, []);

    const setManualToken = useCallback((newToken: string, newRefreshToken?: string, newExpiresAt?: number) => {
        setToken(newToken);
        localStorage.setItem('twitch_token', newToken);

        if (newRefreshToken) {
            setRefreshToken(newRefreshToken);
            localStorage.setItem('twitch_refresh_token', newRefreshToken);
        }

        if (newExpiresAt) {
            setTokenExpiresAt(newExpiresAt);
            localStorage.setItem('twitch_token_expires_at', String(newExpiresAt));
        }

        setIsAuthenticated(true);
    }, []);

    // Auto-refresh: schedule a refresh REFRESH_EARLY_MS before expiry.
    // When the refresh succeeds, updating tokenExpiresAt re-triggers this effect,
    // which schedules the next refresh automatically.
    useEffect(() => {
        if (!token || !refreshToken || tokenExpiresAt === null) return;

        const delay = tokenExpiresAt - Date.now() - REFRESH_EARLY_MS;

        const doRefresh = async () => {
            const result = await TwitchAuthService.refreshAccessToken(refreshToken);
            if (result) {
                setToken(result.accessToken);
                setRefreshToken(result.refreshToken);
                setTokenExpiresAt(result.expiresAt);
                localStorage.setItem('twitch_token', result.accessToken);
                localStorage.setItem('twitch_refresh_token', result.refreshToken);
                localStorage.setItem('twitch_token_expires_at', String(result.expiresAt));
            } else {
                // Refresh token rejected — clear everything, user must re-auth
                setToken(null);
                setRefreshToken(null);
                setTokenExpiresAt(null);
                setUsernameState(null);
                setIsAuthenticated(false);
                localStorage.removeItem('twitch_token');
                localStorage.removeItem('twitch_refresh_token');
                localStorage.removeItem('twitch_token_expires_at');
            }
        };

        if (delay <= 0) {
            doRefresh();
            return;
        }

        const timer = setTimeout(doRefresh, delay);
        return () => clearTimeout(timer);
    }, [token, refreshToken, tokenExpiresAt]);

    // Load saved tokens on startup
    useEffect(() => {
        const storedToken = localStorage.getItem('twitch_token');
        const storedRefreshToken = localStorage.getItem('twitch_refresh_token');
        const storedExpiresAt = localStorage.getItem('twitch_token_expires_at');

        if (storedToken) {
            setToken(storedToken);
            if (storedRefreshToken) setRefreshToken(storedRefreshToken);
            if (storedExpiresAt) setTokenExpiresAt(Number(storedExpiresAt));
            setIsAuthenticated(true);

            // Validate to get username (also confirms the token is still good)
            TwitchAuthService.validateToken(storedToken).then((validation) => {
                if (validation) {
                    setUsernameState(validation.login);
                }
            });
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            isAuthenticated, token, refreshToken, username,
            logout, clearCredentials, setManualToken, setUsername,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
