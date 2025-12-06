export class TwitchAuthService {

    static async authenticateWithElectron(): Promise<string | null> {
        // ipcRenderer is exposed via contextBridge (window.ipcRenderer)
        if (window.ipcRenderer) {
            return await window.ipcRenderer.invoke('auth:twitch');
        } else {
            console.warn('IPC Renderer not found - Are you running in browser mode?');
            return null;
        }
    }

    static getAuthUrl(): string {
        const CLIENT_ID = 'gp762nuuoqcoxypju8c569th9wz7q5';
        const scopes = [
            'chat:read',
            'chat:edit',
            'channel:read:redemptions',
            'bits:read'
        ].join(' ');

        const url = new URL('https://id.twitch.tv/oauth2/authorize');
        url.searchParams.append('client_id', CLIENT_ID);
        url.searchParams.append('redirect_uri', 'http://localhost:3000');
        url.searchParams.append('response_type', 'token');
        url.searchParams.append('scope', scopes);

        return url.toString();
    }

    static parseHash(hash: string): string | null {
        if (!hash) return null;
        const params = new URLSearchParams(hash.substring(1));
        return params.get('access_token');
    }
}
