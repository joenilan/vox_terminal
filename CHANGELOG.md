# Changelog

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
