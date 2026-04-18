use std::path::PathBuf;
use std::sync::mpsc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use cpal::traits::{DeviceTrait, HostTrait};

// ── Serialisable types sent to the frontend ───────────────────────────────────

#[derive(serde::Serialize, Clone)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
}

#[derive(serde::Serialize, Clone)]
pub struct TtsVoice {
    pub id: String,
    pub name: String,
    pub language: String,
}

// ── Audio thread ──────────────────────────────────────────────────────────────
// rodio::OutputStream is !Send, so we keep it on a dedicated thread and
// communicate via a std::sync::mpsc channel.

enum AudioCmd {
    Speak {
        wav: Vec<u8>,
        device_name: Option<String>,
        cancelled: Arc<AtomicBool>,
    },
    Stop,
}

/// Spawns the persistent audio thread and returns a sender for commands.
fn spawn_audio_thread(app: tauri::AppHandle) -> mpsc::SyncSender<AudioCmd> {
    let (tx, rx) = mpsc::sync_channel::<AudioCmd>(8);

    std::thread::spawn(move || {
        // Keep the current sink and stream alive for the duration of playback.
        let mut _current_stream: Option<rodio::OutputStream> = None;
        let mut current_sink: Option<Arc<rodio::Sink>> = None;

        for cmd in rx {
            match cmd {
                AudioCmd::Stop => {
                    if let Some(s) = &current_sink {
                        s.stop();
                    }
                    current_sink = None;
                    _current_stream = None;
                }

                AudioCmd::Speak { wav, device_name, cancelled } => {
                    // Stop whatever is currently playing.
                    if let Some(s) = &current_sink {
                        s.stop();
                    }
                    current_sink = None;
                    _current_stream = None;

                    // Select output device.
                    let host = cpal::default_host();
                    let device = device_name
                        .as_deref()
                        .and_then(|name| {
                            host.output_devices().ok()?.find(|d| {
                                d.name().ok().as_deref() == Some(name)
                            })
                        })
                        .or_else(|| host.default_output_device());

                    let Some(device) = device else {
                        let _ = app.emit("speech-ended", ());
                        continue;
                    };

                    let Ok((stream, handle)) = rodio::OutputStream::try_from_device(&device) else {
                        let _ = app.emit("speech-ended", ());
                        continue;
                    };

                    let Ok(sink) = rodio::Sink::try_new(&handle) else {
                        let _ = app.emit("speech-ended", ());
                        continue;
                    };

                    let cursor = std::io::Cursor::new(wav);
                    if let Ok(source) = rodio::Decoder::new(cursor) {
                        sink.append(source);
                    }

                    let sink = Arc::new(sink);
                    let sink_wait = Arc::clone(&sink);
                    let app_wait = app.clone();

                    // Wait for playback to finish on a sub-thread so the
                    // audio thread stays responsive to new commands.
                    std::thread::spawn(move || {
                        sink_wait.sleep_until_end();
                        if !cancelled.load(Ordering::Relaxed) {
                            let _ = app_wait.emit("speech-ended", ());
                        }
                    });

                    current_sink = Some(sink);
                    _current_stream = Some(stream);
                }
            }
        }
    });

    tx
}

// ── App state stored in Tauri ─────────────────────────────────────────────────

pub struct AudioState {
    tx: mpsc::SyncSender<AudioCmd>,
    /// Set to true when stop() is called so any in-flight speech-ended is ignored.
    cancelled: Arc<AtomicBool>,
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
fn get_audio_devices() -> Vec<AudioDevice> {
    let host = cpal::default_host();
    let Ok(devices) = host.output_devices() else { return vec![] };
    devices
        .filter_map(|d| d.name().ok().map(|n| AudioDevice { id: n.clone(), name: n }))
        .collect()
}

#[tauri::command]
fn get_tts_voices() -> Vec<TtsVoice> {
    #[cfg(windows)]
    {
        use windows::Media::SpeechSynthesis::SpeechSynthesizer;
        let Ok(voices) = SpeechSynthesizer::AllVoices() else { return vec![] };
        let Ok(count) = voices.Size() else { return vec![] };
        (0..count)
            .filter_map(|i| {
                let v = voices.GetAt(i).ok()?;
                Some(TtsVoice {
                    id: v.Id().ok()?.to_string(),
                    name: v.DisplayName().ok()?.to_string(),
                    language: v.Language().ok()?.to_string(),
                })
            })
            .collect()
    }
    #[cfg(not(windows))]
    vec![]
}

#[tauri::command]
async fn speak(
    audio: tauri::State<'_, AudioState>,
    text: String,
    voice_id: Option<String>,
    device_id: Option<String>,
    rate: f64,
    volume: f64,
) -> Result<(), String> {
    // Mark any in-flight playback as superseded.
    audio.cancelled.store(false, Ordering::Relaxed);
    let cancelled = Arc::clone(&audio.cancelled);

    // Synthesise on a blocking thread (WinRT needs a COM/WinRT-initialised context).
    let wav = tauri::async_runtime::spawn_blocking(move || {
        synthesize(&text, voice_id.as_deref(), rate, volume)
    })
    .await
    .map_err(|e| e.to_string())??;

    audio
        .tx
        .send(AudioCmd::Speak { wav, device_name: device_id, cancelled })
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_speech(audio: tauri::State<'_, AudioState>) {
    audio.cancelled.store(true, Ordering::Relaxed);
    let _ = audio.tx.send(AudioCmd::Stop);
}

// ── WinRT synthesis ───────────────────────────────────────────────────────────

#[cfg(windows)]
fn synthesize(
    text: &str,
    voice_id: Option<&str>,
    rate: f64,
    volume: f64,
) -> Result<Vec<u8>, String> {
    use windows::{
        core::{Interface, HSTRING},
        Media::SpeechSynthesis::SpeechSynthesizer,
        Storage::Streams::{DataReader, IInputStream},
        Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED},
    };

    unsafe {
        // Initialise COM/WinRT (MTA) – safe to call multiple times per thread.
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }

    let synth = SpeechSynthesizer::new().map_err(|e| e.to_string())?;

    let options = synth.Options().map_err(|e| e.to_string())?;
    // WinRT rate range: 0.5–6.0 (our UI: 0.5–3.0 — maps 1:1)
    options.SetSpeakingRate(rate).map_err(|e| e.to_string())?;
    options.SetAudioVolume(volume).map_err(|e| e.to_string())?;

    if let Some(id) = voice_id {
        let target = HSTRING::from(id);
        let all = SpeechSynthesizer::AllVoices().map_err(|e| e.to_string())?;
        let count = all.Size().map_err(|e| e.to_string())?;
        for i in 0..count {
            if let Ok(v) = all.GetAt(i) {
                if v.Id().ok().as_ref() == Some(&target) {
                    synth.SetVoice(&v).map_err(|e| e.to_string())?;
                    break;
                }
            }
        }
    }

    let stream = synth
        .SynthesizeTextToStreamAsync(&HSTRING::from(text))
        .map_err(|e| e.to_string())?
        .get()
        .map_err(|e| e.to_string())?;

    let size = stream.Size().map_err(|e| e.to_string())? as u32;

    // SpeechSynthesisStream implements IRandomAccessStream → IInputStream;
    // cast explicitly so DataReader::CreateDataReader gets the right interface.
    let input_stream: IInputStream = stream.cast().map_err(|e| e.to_string())?;
    let reader = DataReader::CreateDataReader(&input_stream).map_err(|e| e.to_string())?;
    reader
        .LoadAsync(size)
        .map_err(|e| e.to_string())?
        .get()
        .map_err(|e| e.to_string())?;

    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).map_err(|e| e.to_string())?;
    Ok(bytes)
}

#[cfg(not(windows))]
fn synthesize(_text: &str, _voice_id: Option<&str>, _rate: f64, _volume: f64) -> Result<Vec<u8>, String> {
    Err("TTS synthesis is only supported on Windows".into())
}

// ── Portable mode ─────────────────────────────────────────────────────────────

fn portable_data_dir() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let parent = exe.parent()?;
    let candidate = parent.join("data");
    if candidate.is_dir() { Some(candidate) } else { None }
}

// ── Global shortcuts ──────────────────────────────────────────────────────────

fn normalize_shortcut(s: &str) -> String {
    s.replace("CommandOrControl", "Ctrl").replace("CmdOrCtrl", "Ctrl")
}

#[tauri::command]
fn update_global_hotkeys(
    app: tauri::AppHandle,
    stop_playback: Option<String>,
    connect_chat: Option<String>,
) -> Result<(), String> {
    let gs = app.global_shortcut();
    gs.unregister_all().map_err(|e| e.to_string())?;

    if let Some(key) = stop_playback.filter(|s| !s.is_empty()) {
        let norm = normalize_shortcut(&key);
        let sc: tauri_plugin_global_shortcut::Shortcut =
            norm.parse().map_err(|e| format!("Invalid stop_playback shortcut '{norm}': {e}"))?;
        let h = app.clone();
        gs.on_shortcut(sc, move |_, _, ev| {
            if ev.state == ShortcutState::Pressed {
                let _ = h.emit("hotkey-stop", ());
            }
        })
        .map_err(|e| e.to_string())?;
    }

    if let Some(key) = connect_chat.filter(|s| !s.is_empty()) {
        let norm = normalize_shortcut(&key);
        let sc: tauri_plugin_global_shortcut::Shortcut =
            norm.parse().map_err(|e| format!("Invalid connect_chat shortcut '{norm}': {e}"))?;
        let h = app.clone();
        gs.on_shortcut(sc, move |_, _, ev| {
            if ev.state == ShortcutState::Pressed {
                let _ = h.emit("hotkey-connect", ());
            }
        })
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ── Entry point ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            update_global_hotkeys,
            get_audio_devices,
            get_tts_voices,
            speak,
            stop_speech,
        ])
        .setup(|app| {
            // Spawn the persistent audio thread and register state.
            let tx = spawn_audio_thread(app.handle().clone());
            app.manage(AudioState {
                tx,
                cancelled: Arc::new(AtomicBool::new(false)),
            });

            let mut builder = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::default(),
            )
            .title("VOX_TERMINAL")
            .inner_size(800.0, 600.0)
            .min_inner_size(800.0, 600.0)
            .resizable(true)
            .decorations(true);

            if let Some(dir) = portable_data_dir() {
                std::fs::create_dir_all(&dir).ok();
                builder = builder.data_directory(dir);
            }

            builder.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running VOX_TERMINAL");
}
