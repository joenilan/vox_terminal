# VOX_TERMINAL

**VOX_TERMINAL** is a high-performance, electron-based text-to-speech engine designed specifically for Twitch streamers. It provides a highly customizable and visual interface for monitoring chat and converting messages to speech in real-time.

![Icon](public/icon.png)

## Features

- **Twitch Integration**: Seamlessly connects to Twitch chat to read messages aloud.
- **Advanced TTS Control**:
  - Select from all installed system voices.
  - Fine-tune rate, pitch, and volume.
  - Queue management with skip and history replay.
- **Visual Customization**:
  - Multiple built-in themes (Modern, Terminal, Cyberpunk, Glass, etc.).
  - "Read Own Messages" toggle.
  - Collapsible sidebar for compact viewing.
- **Moderation & Filters**:
  - Block specific users or bots.
  - Filter out banned words or spam patterns.
  - Smart filtering of common bot commands.
- **Global Hotkeys**:
  - Control playback (Stop/Skip) and connection status even when the app is in the background.
- **Secure & Private**:
  - Credentials are stored locally.
  - "Sign Out & Forget" option for complete data clearance.

## Installation

You can download the latest release from the [Releases](./release) folder (if available) or build it yourself.

**Available formats:**
- **Installer (`-Setup.exe`)**: Standard Windows installer.
- **ZIP Archive (`.zip`)**: Compressed application (Extract and run).
  > **Tip**: Create a folder named `data` next to the executable (inside the extracted folder) to store all settings and credentials locally, making it fully portable.


## Development

This project uses **React**, **TypeScript**, **Vite**, and **Electron**.

### Prerequisites
- Node.js (Latest LTS recommended)
- `bun` (Recommended package manager) or `npm`/`yarn`

### Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   bun install
   ```

### Running Locally
Start the development server (Vite + Electron):
```bash
bun run dev
```

### Building
Build the production application (creates installer in `release/`):
```bash
bun run build
```

## Configuration

### Authentication
VOX_TERMINAL uses a manual token entry flow for maximum security and control.
1. Generate an **Access Token** (scope: `chat:read`) from a trusted generator (e.g., https://twitchtokengenerator.com).
2. Enter the token in the **Settings** or **Connect** menu.
3. (Optional) Provide Client ID and Refresh Token for extended sessions.

### Application Settings
Access the **Settings** panel (Gear icon) to configure:
- Auto-Connect on startup.
- Global Hotkeys.
- Visual Themes.
- Account Credentials.

## Credits

**Developer**: ZMBRT

*Built with:*
- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/)
