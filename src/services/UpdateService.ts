import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

const UPDATE_URL = 'https://apps.zombie.digital/downloads/vox-terminal/latest.json'
export const DOWNLOAD_BASE = 'https://apps.zombie.digital/downloads/vox-terminal'

export interface UpdateInfo {
    version: string
    publishedAt: string
    notes: string
    files: {
        setup: string
        msi: string
        portable: string
    }
}

export async function fetchLatestRelease(): Promise<UpdateInfo> {
    // Use Tauri's HTTP plugin (routes through Rust) when running in the
    // compiled app to avoid WebView CORS restrictions. Falls back to
    // window.fetch in dev where the plugin is not available.
    const fetcher = ('__TAURI_INTERNALS__' in window) ? tauriFetch : fetch

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
        const res = await fetcher(UPDATE_URL, {
            signal: controller.signal,
            cache: 'no-cache',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<UpdateInfo>
    } finally {
        clearTimeout(timeout)
    }
}

export function isNewerVersion(current: string, candidate: string): boolean {
    const parse = (v: string) => {
        const [main, pre] = v.split('-')
        const [major = 0, minor = 0, patch = 0] = main.split('.').map(Number)
        return { major, minor, patch, pre: pre ?? null }
    }

    const c = parse(current)
    const n = parse(candidate)

    if (n.major !== c.major) return n.major > c.major
    if (n.minor !== c.minor) return n.minor > c.minor
    if (n.patch !== c.patch) return n.patch > c.patch

    // Same base: release > any pre-release
    if (c.pre && !n.pre) return true
    if (!c.pre && n.pre) return false
    if (c.pre && n.pre) return n.pre > c.pre

    return false
}
