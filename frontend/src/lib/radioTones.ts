// Synthesized walkie-talkie sound effects (Web Audio, no audio files to ship/host).
// Classic PTT radios chirp up on key-down and down on key-up - this mimics that,
// plus a two-tone "busy" beep for when someone else already holds the channel.

let ctx: AudioContext | null = null;

const getContext = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// Most mobile browsers only allow AudioContext playback after a user gesture -
// call this from the first press handler so later programmatic tones aren't blocked.
export const unlockRadioAudio = () => {
  getContext();
};

const tone = (freqStart: number, freqEnd: number, durationMs: number, gain = 0.15, delayMs = 0) => {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const startAt = audioCtx.currentTime + delayMs / 1000;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freqStart, startAt);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), startAt + durationMs / 1000);
  gainNode.gain.setValueAtTime(gain, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + durationMs / 1000);
  osc.connect(gainNode).connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationMs / 1000 + 0.02);
};

export const playKeyDownTone = () => tone(700, 1500, 100);
export const playKeyUpTone = () => tone(1500, 700, 100);
export const playBusyTone = () => {
  tone(500, 400, 90, 0.18);
  tone(500, 400, 90, 0.18, 130);
};

// Distinct alternating siren - deliberately more urgent/longer than the ordinary chirps so
// an emergency call is unmistakable even with the widget closed.
export const playEmergencyTone = () => {
  for (let i = 0; i < 3; i += 1) {
    tone(950, 950, 140, 0.22, i * 280);
    tone(650, 650, 140, 0.22, i * 280 + 140);
  }
};

export const vibrateEmergency = () => {
  try {
    navigator.vibrate?.([200, 100, 200, 100, 200]);
  } catch {
    // vibration unsupported - harmless no-op
  }
};
