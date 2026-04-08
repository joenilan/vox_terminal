import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { fetchLatestRelease, isNewerVersion, type UpdateInfo } from '../services/UpdateService'
import { APP_VERSION } from '../config/version'

interface UpdateContextValue {
    updateInfo: UpdateInfo | null
    checking: boolean
    fetchFailed: boolean
    refresh: () => void
}

const UpdateContext = createContext<UpdateContextValue>({
    updateInfo: null,
    checking: false,
    fetchFailed: false,
    refresh: () => {},
})

export function UpdateProvider({ children }: { children: ReactNode }) {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
    const [checking, setChecking] = useState(false)
    const [fetchFailed, setFetchFailed] = useState(false)

    const check = useCallback(async () => {
        setChecking(true)
        setFetchFailed(false)
        try {
            const info = await fetchLatestRelease()
            setUpdateInfo(isNewerVersion(APP_VERSION, info.version) ? info : null)
        } catch {
            setFetchFailed(true)
        } finally {
            setChecking(false)
        }
    }, [])

    useEffect(() => {
        void check()
    }, [check])

    return (
        <UpdateContext.Provider value={{ updateInfo, checking, fetchFailed, refresh: check }}>
            {children}
        </UpdateContext.Provider>
    )
}

export function useUpdate() {
    return useContext(UpdateContext)
}
