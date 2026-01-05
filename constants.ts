// Audio
// Use paths from public folder (served at root in production)
export const MUSIC_INTRO_URL = "/before-game.mp3";
export const WIN_SOUND_URL = "/winning-sound.mp3";
export const LOSE_SOUND_URL = "/losing-sound.mp3";

export const BASE_BPM = 140;
export const SONG_BPM = 140; // Default fallback for note generation if needed

// ===========================================
// AUDIO SYNC CONFIGURATION
// ===========================================

// Time in seconds where the FIRST BEAT/DRUM hits in the song
export const FIRST_BEAT_TIME_SEC = 3.11;

// Fine-tune offset in milliseconds (for latency compensation)
// Positive = delay game beats, Negative = advance game beats
export const AUDIO_OFFSET_MS = 0;

// Detection window as percentage of beat interval (±75% = very forgiving)
// e.g., at 120 BPM (500ms beat), window is -375ms to +375ms around beat center
export const DETECTION_WINDOW_PERCENT = 0.75;
