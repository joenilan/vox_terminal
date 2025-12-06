import { app, BrowserWindow, ipcMain, globalShortcut, shell, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// FAST PORTABLE CHECK:
// If a "data" folder exists next to the executable, use it for user data.
if (!VITE_DEV_SERVER_URL) {
  const exeDir = path.dirname(app.getPath('exe'));
  const portableDataPath = path.join(exeDir, 'data');
  if (fs.existsSync(portableDataPath)) {
    app.setPath('userData', portableDataPath);
    console.log(`[Portable Mode] Using data path: ${portableDataPath}`);
  }
}

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    backgroundColor: '#0e0e10',
    title: 'VOX_TERMINAL'
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Remove default menu
  Menu.setApplicationMenu(null);
}

// IPC Handlers
ipcMain.handle('open-external', async (_, url: string) => {
  await shell.openExternal(url);
});

// Deprecated auth handler - explicitly null to prevent usage
ipcMain.handle('auth:twitch', async () => {
  return null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow();

  // Register Global Hotkeys via IPC
  ipcMain.on('update-global-hotkeys', (_, hotkeys) => {
    globalShortcut.unregisterAll(); // Clear existing

    // Stop Playback
    if (hotkeys.stopPlayback) {
      try {
        globalShortcut.register(hotkeys.stopPlayback, () => {
          win?.webContents.send('hotkey-stop');
        });
      } catch (e) {
        console.error(`Failed to register hotkey: ${hotkeys.stopPlayback}`, e);
      }
    }

    // Connect Chat
    if (hotkeys.connectChat) {
      try {
        globalShortcut.register(hotkeys.connectChat, () => {
          win?.webContents.send('hotkey-connect');
        });
      } catch (e) {
        console.error(`Failed to register hotkey: ${hotkeys.connectChat}`, e);
      }
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
