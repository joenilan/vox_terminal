# Changelog

## 1.0.13

- All UI elements now smoothly transition colors, borders, and radius on theme change (global CSS baseline)

## 1.0.12

- Remove yellow update badge from About nav item (update banner is global now)

## 1.0.11

- Move stop audio hotkey label to the left of the button as "Hotkey: F10" style text

## 1.0.10

- Stop Audio button now shows the configured hotkey as a badge
- Voice and audio device dropdowns show "Loading…" placeholder while data loads instead of blank

## 1.0.9

- Remove redundant update notice from About view (global banner covers it)

## 1.0.8

- Add refresh icon next to update status in sidebar to manually trigger update check

## 1.0.7

- Fix version display showing stale 1.0.0-alpha.1 — now injected from package.json at build time

## 1.0.6

- Updated publisher name to DreadedZombie

## 1.0.5

- In-app updater: download and restart directly from the app using Tauri signed updates

## 1.0.4

- Fix update check failing in compiled app — now routes through Rust to bypass WebView CORS restrictions

## 1.0.3

- Fix installer upgrade — new versions now replace the old install instead of stacking alongside it

## 1.0.2

- Update About page developer name to DreadedZombie

## 1.0.1

- Fix update status text invisible on dark background (now uses readable green/gray)
- Audio output device selector added to Console view

## 1.0.0

- Initial public release
- Twitch chat TTS with Device Code authentication
- Message filtering pipeline (blocked users, words, emotes, repeated chars/words)
- BTTV, FFZ, and 7TV emote support
- Multiple UI themes (Modern, Terminal, Cyberpunk, Glass)
- Global hotkeys for Stop Playback and Connect Chat
- Portable mode support via `data/` folder
- Auto-connect on startup option
