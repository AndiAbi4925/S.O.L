let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a short retro beep/tick for countdowns
 */
export function playTick() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

/**
 * Play a camera shutter click (white noise mechanical burst + metallic spring click)
 */
export function playShutter() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // 1. White noise burst for the mechanical shutter slice
    const duration = 0.15;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 2.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 2. High-pitch oscillator click
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);
    
    oscGain.gain.setValueAtTime(0.12, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    noise.start(now);
    osc.start(now);
    
    noise.stop(now + duration);
    osc.stop(now + 0.06);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

/**
 * Play a crystal clean retro chime (ding) for completion
 */
export function playDing() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Harmonic chime note (C5 & E5)
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now); // E5

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

// ==========================================
// LO-FI BGM SYNTHESIS SYSTEM (WEB AUDIO API)
// ==========================================

let bgmTimer: any = null;
let bgmNodes: (OscillatorNode | GainNode | AudioBufferSourceNode)[] = [];
let bgmVolumeNode: GainNode | null = null;
let bgmActive = false;
let currentChordIndex = 0;

// Lo-fi chord progressions (frequencies for Fmaj7, G6, Em7, Am7)
const LOFI_CHORDS = [
  [174.61, 220.00, 261.63, 329.63], // Fmaj7 (F3, A3, C4, E4)
  [196.00, 246.94, 293.66, 329.63], // G6 (G3, B3, D4, E4)
  [164.81, 196.00, 246.94, 293.66], // Em7 (E3, G3, B3, D4)
  [220.00, 261.63, 329.63, 392.00], // Am7 (A3, C4, E4, G4)
];

// Generate simple vinyl crackle / tape hiss buffer
function createVinylNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2; // 2 seconds of loopable noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < bufferSize; i++) {
    // White noise baseline
    let val = (Math.random() * 2 - 1) * 0.015;
    
    // Add random static crackles/pops
    if (Math.random() < 0.0003) {
      val += (Math.random() * 2 - 1) * 0.4; // crackle pop
    }
    data[i] = val;
  }
  return buffer;
}

// Play a single soft lo-fi chord
function playLofiChord(ctx: AudioContext, freqs: number[], startTime: number, duration: number) {
  if (!bgmActive) return;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(550, startTime);
  filter.frequency.exponentialRampToValueAtTime(750, startTime + duration - 0.5);
  filter.Q.value = 1.0;
  filter.connect(bgmVolumeNode || ctx.destination);

  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    // Triangle wave for warm electric piano / rhodes tone
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    
    // Add a tiny pitch vibrato (wobble) for wow & flutter tape effect
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = 4 + Math.random() * 2; // 4-6 Hz wobble
    vibratoGain.gain.value = 1.5; // pitch shift offset in Hz
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    
    // Chord envelope: slow attack, long release
    oscGain.gain.setValueAtTime(0.001, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.045, startTime + 0.8);
    oscGain.gain.setValueAtTime(0.045, startTime + duration - 0.6);
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.1);

    vibrato.start(startTime);
    osc.connect(oscGain);
    oscGain.connect(filter);

    osc.start(startTime);
    osc.stop(startTime + duration);
    vibrato.stop(startTime + duration);

    bgmNodes.push(osc);
    bgmNodes.push(vibrato as any); // Track vibrato osc
  });
}

// Start BGM loop
export function startLofiBgm() {
  try {
    const ctx = getAudioContext();
    if (bgmActive) return;
    bgmActive = true;
    currentChordIndex = 0;

    // Create main volume node for BGM to allow fading and clean shutdown
    bgmVolumeNode = ctx.createGain();
    bgmVolumeNode.gain.setValueAtTime(0.001, ctx.currentTime);
    bgmVolumeNode.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 1.5);
    bgmVolumeNode.connect(ctx.destination);

    // 1. Start continuous vinyl crackle
    const vinylBuffer = createVinylNoiseBuffer(ctx);
    const vinylSrc = ctx.createBufferSource();
    vinylSrc.buffer = vinylBuffer;
    vinylSrc.loop = true;

    // Pass vinyl noise through bandpass filter to sound like an old record
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 0.8;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.45; // subtle record crackle

    vinylSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(bgmVolumeNode);

    vinylSrc.start(ctx.currentTime);
    bgmNodes.push(vinylSrc);

    // 2. Start chord sequencing scheduler
    const chordDuration = 3.6; // 3.6 seconds per chord
    const scheduleAheadTime = 0.2;
    let nextChordTime = ctx.currentTime + 0.1;

    function scheduleLoop() {
      if (!bgmActive) return;
      
      const now = ctx.currentTime;
      while (nextChordTime < now + scheduleAheadTime) {
        const freqs = LOFI_CHORDS[currentChordIndex];
        playLofiChord(ctx, freqs, nextChordTime, chordDuration);
        nextChordTime += chordDuration - 0.2; // slight crossfade overlay
        currentChordIndex = (currentChordIndex + 1) % LOFI_CHORDS.length;
      }
      
      bgmTimer = setTimeout(scheduleLoop, 200);
    }
    
    scheduleLoop();
  } catch (e) {
    console.warn('Failed to start BGM', e);
  }
}

// Stop BGM loop
export function stopLofiBgm() {
  bgmActive = false;
  if (bgmTimer) {
    clearTimeout(bgmTimer);
    bgmTimer = null;
  }
  
  // Fade out BGM volume gracefully before stopping nodes
  if (bgmVolumeNode) {
    try {
      const ctx = getAudioContext();
      bgmVolumeNode.gain.setValueAtTime(bgmVolumeNode.gain.value, ctx.currentTime);
      bgmVolumeNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    } catch (e) {}
  }

  // Stop active sources and oscillators after fade out completes
  setTimeout(() => {
    bgmNodes.forEach((node) => {
      try {
        if ('stop' in node) {
          (node as any).stop();
        }
      } catch (e) {}
    });
    bgmNodes = [];
    bgmVolumeNode = null;
  }, 700);
}

