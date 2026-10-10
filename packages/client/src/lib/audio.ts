/**
 * Audio system using Web Audio API for generated sounds.
 * Replace the generated sounds with real audio files by placing them in /public/sounds/
 * and updating the SOUND_FILES map below.
 */

type SoundName =
  | 'card_play'
  | 'card_deal'
  | 'card_shuffle'
  | 'truco_call'
  | 'seis_call'
  | 'nove_call'
  | 'doze_call'
  | 'accept'
  | 'run'
  | 'round_win'
  | 'hand_win'
  | 'game_win'
  | 'game_lose'
  | 'your_turn';

let audioContext: AudioContext | null = null;
let globalVolume = 0.7;
let muted = false;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Play a simple generated tone/noise as a placeholder sound.
 */
function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
) {
  if (muted) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  gainNode.gain.setValueAtTime(volume * globalVolume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

/**
 * Play a noise burst (for card/shuffle sounds).
 */
function playNoise(duration: number, volume: number = 0.2) {
  if (muted) return;

  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(volume * globalVolume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);

  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  source.start();
}

/**
 * Speak a word using the browser's SpeechSynthesis API.
 */
function speak(text: string, rate: number = 1.3, pitch: number = 1.2) {
  if (muted) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = globalVolume;
  window.speechSynthesis.speak(utterance);
}

/**
 * Play a generated placeholder sound by name.
 */
const SOUND_GENERATORS: Record<SoundName, () => void> = {
  card_play: () => {
    playNoise(0.1, 0.3);
    playTone(800, 0.05, 'sine', 0.1);
  },
  card_deal: () => {
    playNoise(0.08, 0.2);
  },
  card_shuffle: () => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => playNoise(0.05, 0.15), i * 50);
    }
  },
  truco_call: () => {
    speak('TRUCO!', 1.4, 1.3);
    playTone(440, 0.15, 'square', 0.4);
    setTimeout(() => playTone(554, 0.15, 'square', 0.4), 150);
    setTimeout(() => playTone(659, 0.3, 'square', 0.5), 300);
  },
  seis_call: () => {
    speak('SEIS!', 1.4, 1.4);
    playTone(523, 0.12, 'square', 0.4);
    setTimeout(() => playTone(659, 0.12, 'square', 0.4), 120);
    setTimeout(() => playTone(784, 0.25, 'square', 0.5), 240);
  },
  nove_call: () => {
    speak('DEZ!', 1.4, 1.5);
    playTone(587, 0.1, 'sawtooth', 0.4);
    setTimeout(() => playTone(740, 0.1, 'sawtooth', 0.4), 100);
    setTimeout(() => playTone(880, 0.2, 'sawtooth', 0.5), 200);
  },
  doze_call: () => {
    speak('DOZE!', 1.3, 1.6);
    playTone(659, 0.1, 'sawtooth', 0.5);
    setTimeout(() => playTone(831, 0.1, 'sawtooth', 0.5), 100);
    setTimeout(() => playTone(988, 0.1, 'sawtooth', 0.5), 200);
    setTimeout(() => playTone(1175, 0.3, 'sawtooth', 0.6), 300);
  },
  accept: () => {
    playTone(440, 0.1, 'sine', 0.3);
    setTimeout(() => playTone(554, 0.2, 'sine', 0.3), 100);
  },
  run: () => {
    playTone(440, 0.2, 'sine', 0.3);
    setTimeout(() => playTone(330, 0.3, 'sine', 0.3), 200);
  },
  round_win: () => {
    playTone(523, 0.15, 'sine', 0.3);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.3), 150);
  },
  hand_win: () => {
    playTone(523, 0.12, 'sine', 0.3);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.3), 120);
    setTimeout(() => playTone(784, 0.25, 'sine', 0.4), 240);
  },
  game_win: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.4), i * 200);
    });
  },
  game_lose: () => {
    const notes = [440, 370, 330, 262];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.3), i * 250);
    });
  },
  your_turn: () => {
    playTone(880, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(1109, 0.15, 'sine', 0.2), 100);
  },
};

export function playSound(name: SoundName): void {
  if (muted) return;

  try {
    SOUND_GENERATORS[name]?.();
  } catch (e) {
    // Audio might fail on first interaction before user gesture
    console.warn('Audio playback failed:', e);
  }
}

export function setVolume(volume: number): void {
  globalVolume = Math.max(0, Math.min(1, volume));
}

export function getVolume(): number {
  return globalVolume;
}

export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
}

/**
 * Initialize audio context on user interaction.
 * Must be called from a user gesture handler.
 */
export function initAudio(): void {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}
