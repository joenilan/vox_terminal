// NOTE: The Client ID below must have Device Code Grant enabled in the Twitch Developer Console
// (Application → OAuth Redirect URLs → Grant Types → Device Code)
const CLIENT_ID = import.meta.env.VITE_TWITCH_CLIENT_ID?.trim() || 'ql10wop1w36s9jeg4vv1qrwbaso04l'

const DEVICE_URL = 'https://id.twitch.tv/oauth2/device'
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate'

const SCOPES = [
    'chat:read',
    'chat:edit',
    'channel:read:redemptions',
    'bits:read',
]

export interface DeviceCodeResponse {
    deviceCode: string
    userCode: string
    verificationUri: string
    intervalSeconds: number
    expiresAt: number
}

export type DevicePollResult =
    | { kind: 'success'; accessToken: string; refreshToken: string; expiresAt: number }
    | { kind: 'pending' }
    | { kind: 'slow_down' }
    | { kind: 'denied' }
    | { kind: 'expired' }

export interface TokenValidation {
    clientId: string
    login: string
    userId: string
}

function toFormBody(values: Record<string, string>): URLSearchParams {
    const form = new URLSearchParams()
    for (const [key, value] of Object.entries(values)) {
        form.set(key, value)
    }
    return form
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
    try {
        return (await response.json()) as Record<string, unknown>
    } catch {
        return {}
    }
}

export class TwitchAuthService {

    static getClientId(): string {
        return CLIENT_ID
    }

    /** Step 1: Request a device code. Display userCode + verificationUri to the user. */
    static async startDeviceFlow(): Promise<DeviceCodeResponse> {
        const response = await fetch(DEVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: toFormBody({
                client_id: CLIENT_ID,
                scopes: SCOPES.join(' '),
            }),
        })

        const payload = await parseJson(response)

        if (!response.ok) {
            const message = typeof payload.message === 'string' ? payload.message : 'Unable to start Twitch authorization.'
            throw new Error(message)
        }

        const deviceCode = typeof payload.device_code === 'string' ? payload.device_code : ''
        const userCode = typeof payload.user_code === 'string' ? payload.user_code : ''
        const verificationUri = typeof payload.verification_uri === 'string' ? payload.verification_uri : ''
        const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 0
        const intervalSeconds = typeof payload.interval === 'number' ? payload.interval : 5

        if (!deviceCode || !userCode || !verificationUri || expiresIn <= 0) {
            throw new Error('Twitch returned an incomplete device authorization payload.')
        }

        return {
            deviceCode,
            userCode,
            verificationUri,
            intervalSeconds,
            expiresAt: Date.now() + expiresIn * 1000,
        }
    }

    /** Step 2: Poll until the user completes authorization (or it expires/is denied). */
    static async pollDeviceFlow(deviceCode: string): Promise<DevicePollResult> {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: toFormBody({
                client_id: CLIENT_ID,
                scopes: SCOPES.join(' '),
                device_code: deviceCode,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
        })

        const payload = await parseJson(response)

        if (response.ok) {
            const accessToken = typeof payload.access_token === 'string' ? payload.access_token : ''
            const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : ''
            const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 0
            if (!accessToken || !refreshToken) throw new Error('Twitch returned an incomplete token payload.')
            return { kind: 'success', accessToken, refreshToken, expiresAt: Date.now() + expiresIn * 1000 }
        }

        const message = (typeof payload.message === 'string' ? payload.message : '').toLowerCase()

        if (message === 'authorization_pending') return { kind: 'pending' }
        if (message === 'slow_down') return { kind: 'slow_down' }
        if (message === 'access_denied') return { kind: 'denied' }
        if (message === 'expired_token' || message.includes('device code expired')) return { kind: 'expired' }

        throw new Error(typeof payload.message === 'string' ? payload.message : 'Unable to complete Twitch authorization.')
    }

    /** Refresh an expired access token using the stored refresh token. */
    static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: toFormBody({
                client_id: CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        })

        if (!response.ok) return null

        const payload = await parseJson(response)
        const accessToken = typeof payload.access_token === 'string' ? payload.access_token : ''
        const newRefreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : refreshToken
        const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 0

        if (!accessToken) return null
        return { accessToken, refreshToken: newRefreshToken, expiresAt: Date.now() + expiresIn * 1000 }
    }

    /** Validate a token and return basic session info. Returns null if invalid. */
    static async validateToken(accessToken: string): Promise<TokenValidation | null> {
        const response = await fetch(VALIDATE_URL, {
            headers: { Authorization: `OAuth ${accessToken}` },
        })
        if (!response.ok) return null
        const payload = await parseJson(response)
        const clientId = typeof payload.client_id === 'string' ? payload.client_id : ''
        const login = typeof payload.login === 'string' ? payload.login : ''
        const userId = typeof payload.user_id === 'string' ? payload.user_id : ''
        if (!clientId || !login) return null
        return { clientId, login, userId }
    }
}
