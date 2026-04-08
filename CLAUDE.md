# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VOX_TERMINAL is a **Tauri v2 + React + TypeScript** desktop application for Twitch streamers that reads chat messages aloud using the Web Speech API. It supports real-time Twitch chat connection, message filtering, multiple UI themes, and global hotkeys.

## Commands

```bash
bun run dev       # Start dev server (Tauri + Vite with hot reload)
bun run build     # TypeScript check → Vite build → Tauri bundle
bun run lint      # ESLint (zero warnings allowed)
```

No test suite is present. `bun` is the preferred package manager.

## Versioning

`VERSION` is the source of truth. `package.json` and `src-tauri/tauri.conf.json` are synced from it.

```bash
bun run version:check          # Verify VERSION, package.json, and tauri.conf.json are in sync
bun run version:check-notes    # Verify CHANGELOG.md and PATCH_NOTES.md have entries for current version
bun run version:patch          # Bump patch (1.0.0 → 1.0.1) and sync all targets
bun run version:minor          # Bump minor
bun run version:major          # Bump major
bun run version:set -- 1.2.0   # Set exact version
bun run version:sync           # Re-sync targets from VERSION without bumping
```

Before releasing: update `CHANGELOG.md` and `PATCH_NOTES.md` with a `## {version}` heading. `version:check-notes` enforces this.

## Release & Publishing

Releases are uploaded via SFTP to `apps.zombie.digital` at `/mnt/data/sites/apps/public/downloads/vox-terminal/`. The website reads `latest.json` at runtime — no site rebuild needed.

```bash
bun run release:windows    # Check notes → full build → package artifacts to release/windows/
bun run release:publish    # release:windows → upload via SFTP
```

**Credentials**: Copy `.env.raspi.example` → `.env.raspi` (never commit). Required vars:
```
SSH_HOST=192.168.1.151
SSH_USER=dietpi
SSH_PASSWORD=...
SSH_PORT=22
RPI_RELEASE_BASE_DIR=/mnt/data/sites/apps/public/downloads
RELEASE_APP_SLUG=vox-terminal
RELEASE_CHANNEL=stable
```

**Artifacts produced** (in `release/windows/`):
- `vox-terminal_{version}_x64-setup.exe` — NSIS installer (from `src-tauri/target/release/bundle/nsis/`)
- `vox-terminal_{version}_x64_portable.zip` — ZIP of `src-tauri/target/release/vox-terminal.exe`
- `.sha256` files for each
- `manifest.json`, `latest.json`, `notes.md`

**Release scripts** are in `scripts/`:
- `version.mjs` — version bump/sync/check logic (syncs package.json + tauri.conf.json)
- `package-release.mjs` — copies Tauri artifacts into `release/windows/`, creates portable ZIP via PowerShell
- `publish-release.mjs` — generates `latest.json` + `notes.md`, uploads via SFTP

## Architecture

### Process Boundary

```
src-tauri/src/lib.rs      ← Rust backend: window creation, global hotkeys, portable mode
src/                      ← WebView renderer: all React/UI code
```

The renderer has no direct system access. All cross-process communication uses:
- **Tauri commands** (`invoke` from `@tauri-apps/api/core`): renderer → Rust
- **Tauri events** (`listen`/`emit` from `@tauri-apps/api/event`): Rust → renderer
- **opener plugin** (`openUrl` from `@tauri-apps/plugin-opener`): open URLs/system URIs

Key channels:
- **Rust → Renderer events**: `hotkey-stop`, `hotkey-connect`
- **Renderer → Rust commands**: `update_global_hotkeys(stopPlayback, connectChat)`

### State Management

Four React Contexts wrap the entire app (`src/main.tsx`):

| Context | Responsibility | Persistence |
|---|---|---|
| `AuthContext` | Twitch OAuth tokens + auto-refresh | `localStorage` |
| `SettingsContext` | Audio, filters, hotkeys, UI prefs | `localStorage` as `tts-settings` |
| `ChatContext` | Chat connection state, emote sets | in-memory |
| `ThemeContext` | Active theme + CSS variable injection | in-memory |

### Twitch Authentication

The app uses **Twitch Device Code Grant** — the user visits `twitch.tv/activate` and enters a short code.

Flow (implemented in `src/components/DeviceAuthModal.tsx`):
1. `TwitchAuthService.startDeviceFlow()` → requests device code, returns `userCode` + `verificationUri`
2. Modal displays the code and opens the browser via `openUrl`
3. `TwitchAuthService.pollDeviceFlow(deviceCode)` polls every N seconds until `success | denied | expired`
4. On success: tokens stored via `setManualToken()` (AuthContext), chat auto-connects

Token refresh is automatic: `AuthContext` schedules a `setTimeout` 5 minutes before `tokenExpiresAt`, calls `TwitchAuthService.refreshAccessToken()` silently, and reschedules on success.

CLIENT_ID: `ql10wop1w36s9jeg4vv1qrwbaso04l` — must have **Device Code Grant** enabled in Twitch Developer Console. Override via `VITE_TWITCH_CLIENT_ID` env var.

### Services (Business Logic)

Services in `src/services/` are plain classes/modules with no React dependencies:

- **TTSEngine** — Wraps `window.speechSynthesis` with a FIFO queue. `TTSMessage.spokenText` separates display text from what is spoken (used for "Username says [message]" mode).
- **TwitchChatService** — tmi.js wrapper. Connects with OAuth token; emits messages via callback.
- **TwitchAuthService** — Device Code Grant flow, token refresh, and token validation against Twitch API.
- **FilterService** — Sequential pipeline: block users → max length → strip emotes → censor words → collapse repeated chars → collapse repeated words.
- **ExternalEmoteService** — Fetches BTTV/FFZ/7TV emote sets for a channel.

### Views

Single-page app with in-component routing in `src/App.tsx`. Views: `TTSView` (main dashboard), `SettingsView`, `FiltersView`, `LogsView`, `AboutView`.

### Theming

Themes inject CSS variables onto `document.documentElement`. Tailwind uses them via `tailwind.config.js` with the `rgb(var(--color-...))` pattern.

### Portable Mode

In `src-tauri/src/lib.rs`, if a `data/` folder exists next to the executable, `WebviewWindowBuilder::data_directory()` redirects WebView storage (localStorage, IndexedDB) there instead of AppData. The window is created manually in `setup()` rather than via `tauri.conf.json` so this can be applied at runtime.

## Key Files

- `VERSION` — single source of truth for the release version
- `src-tauri/src/lib.rs` — window setup, `update_global_hotkeys` command, portable mode detection
- `src-tauri/tauri.conf.json` — app identity, bundle config (NSIS perMachine), build commands
- `src-tauri/capabilities/default.json` — Tauri permission grants
- `src/context/SettingsContext.tsx` — all user-configurable state; default blocked bots list lives here; syncs hotkeys to Rust via `invoke('update_global_hotkeys')`
- `src/context/AuthContext.tsx` — token storage, auto-refresh scheduling
- `src/services/TwitchAuthService.ts` — Device Code Grant, token refresh, token validation
- `src/components/DeviceAuthModal.tsx` — Device Code auth UI with polling loop
- `src/services/TTSEngine.ts` — TTS queue logic with display/spoken text separation
- `src/services/FilterService.ts` — message filtering pipeline
- `scripts/package-release.mjs` — finds Tauri NSIS artifact, creates portable ZIP, generates SHA256 + manifest
- `scripts/publish-release.mjs` — generates `latest.json`/`notes.md` and uploads via SFTP

## TypeScript

Strict mode is fully enabled. No unused locals or parameters. All new code must be type-safe.
