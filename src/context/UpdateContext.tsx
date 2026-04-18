import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

interface UpdateContextValue {
    update: Update | null
    checking: boolean
    downloading: boolean
    downloadProgress: number
    error: string | null
    checkForUpdate: () => Promise<void>
    installUpdate: () => Promise<void>
}

const UpdateContext = createContext<UpdateContextValue>({
    update: null,
    checking: false,
    downloading: false,
    downloadProgress: 0,
    error: null,
    checkForUpdate: async () => {},
    installUpdate: async () => {},
})

export function UpdateProvider({ children }: { children: ReactNode }) {
    const [update, setUpdate] = useState<Update | null>(null)
    const [checking, setChecking] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const checkedRef = useRef(false)

    const checkForUpdate = useCallback(async () => {
        setChecking(true)
        setError(null)
        try {
            const result = await check()
            setUpdate(result ?? null)
        } catch {
            setError('Could not reach the update server.')
        } finally {
            setChecking(false)
        }
    }, [])

    const installUpdate = useCallback(async () => {
        if (!update) return
        setDownloading(true)
        setError(null)
        try {
            let downloaded = 0
            let total = 0
            await update.downloadAndInstall((event) => {
                if (event.event === 'Started') {
                    total = event.data.contentLength ?? 0
                } else if (event.event === 'Progress') {
                    downloaded += event.data.chunkLength
                    if (total > 0) {
                        setDownloadProgress(Math.round((downloaded / total) * 100))
                    }
                } else if (event.event === 'Finished') {
                    setDownloadProgress(100)
                }
            })
            await relaunch()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Update failed.')
            setDownloading(false)
        }
    }, [update])

    useEffect(() => {
        if (checkedRef.current) return
        checkedRef.current = true
        void checkForUpdate()
    }, [checkForUpdate])

    return (
        <UpdateContext.Provider value={{ update, checking, downloading, downloadProgress, error, checkForUpdate, installUpdate }}>
            {children}
        </UpdateContext.Provider>
    )
}

export function useUpdate() {
    return useContext(UpdateContext)
}
