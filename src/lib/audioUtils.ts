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
// LO-FI BGM SYNTHESIS SYSTEM (REMOVED)
// ==========================================

export function startLofiBgm() {
  // No-op: Background music disabled per user request
}

export function stopLofiBgm() {
  // No-op: Background music disabled per user request
}

/**
 * Play a retro booting/loading sound sequence (capacitor charge hum + warm synth sweep)
 */
export function playBootSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // 1. Low power-up hum (110Hz triangle oscillator)
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    
    humOsc.type = 'triangle';
    humOsc.frequency.setValueAtTime(110, now);
    humOsc.frequency.linearRampToValueAtTime(220, now + 3.0); // pitch ramps up slightly
    
    // Pass hum through lowpass filter to sound muffled and warm
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 3.0);
    
    humGain.gain.setValueAtTime(0.001, now);
    humGain.gain.linearRampToValueAtTime(0.08, now + 1.2); // swell in
    humGain.gain.setValueAtTime(0.08, now + 3.0);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 3.4); // fade out at slide
    
    humOsc.connect(filter);
    filter.connect(humGain);
    humGain.connect(ctx.destination);
    
    // 2. High frequency capacitor charging sweep (vintage flash charge)
    const chargeOsc = ctx.createOscillator();
    const chargeGain = ctx.createGain();
    
    chargeOsc.type = 'sine';
    chargeOsc.frequency.setValueAtTime(400, now + 0.5);
    chargeOsc.frequency.exponentialRampToValueAtTime(4000, now + 3.0); // rising sweep
    
    chargeGain.gain.setValueAtTime(0.001, now + 0.5);
    chargeGain.gain.exponentialRampToValueAtTime(0.015, now + 2.0); // very soft high-pitch whistle
    chargeGain.gain.setValueAtTime(0.015, now + 3.0);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
    
    chargeOsc.connect(chargeGain);
    chargeGain.connect(ctx.destination);
    
    // 3. Final shutter click and developed chime when overlay slides up
    const finalDelay = 3.3; // matches the slide up overlay timing in Preloader.tsx
    
    setTimeout(() => {
      // Play a soft shutter click
      playShutter();
      
      // developed chime chord (Cmajor7 C4 E4 G4 B4)
      const chimeGain = ctx.createGain();
      chimeGain.gain.setValueAtTime(0.001, ctx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.1);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      chimeGain.connect(ctx.destination);
      
      [261.63, 329.63, 392.00, 493.88].forEach((freq) => {
        const chimeOsc = ctx.createOscillator();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.value = freq;
        chimeOsc.connect(chimeGain);
        chimeOsc.start();
        chimeOsc.stop(ctx.currentTime + 1.5);
      });
    }, finalDelay * 1000);
    
    humOsc.start(now);
    humOsc.stop(now + 3.5);
    
    chargeOsc.start(now + 0.5);
    chargeOsc.stop(now + 3.3);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

