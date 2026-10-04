// ─── Web Audio Procedural Synthesizer ─────────────────────────────
// Authentic Kingdom Rush-style sound effects & ambient war music.
// Fully procedural using the Web Audio API — zero external assets required.

let audioCtx: AudioContext | null = null;
let muted = false;
let musicGain: GainNode | null = null;
let masterGain: GainNode | null = null;
let musicInterval: number | null = null;

// Initialize or resume AudioContext on user interaction
export function initAudio(): void {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.7;
      masterGain.connect(audioCtx.destination);
    }
  } else if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function setMuted(val: boolean): void {
  muted = val;
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(muted ? 0 : 0.7, audioCtx.currentTime);
  }
  if (muted) {
    stopMusic();
  }
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  setMuted(!muted);
  return muted;
}

// ─── Noise Buffer Generator ─────────────────────────────────────
let noiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
}

// ─── Sound Effect Synthesizers ──────────────────────────────────

export type SoundEffect =
  | 'arrow_shoot'
  | 'arrow_hit'
  | 'magic_shoot'
  | 'magic_hit'
  | 'cannon_shoot'
  | 'cannon_hit'
  | 'sword_clash'
  | 'soldier_rally'
  | 'reinforce'
  | 'meteor_fall'
  | 'meteor_impact'
  | 'enemy_death'
  | 'shaman_heal'
  | 'warlord_roar'
  | 'wave_horn'
  | 'button_click'
  | 'victory'
  | 'defeat'
  | 'gold_gain'
  | 'upgrade';

export function playSound(name: SoundEffect | string): void {
  if (muted) return;
  initAudio();
  if (!audioCtx || !masterGain) return;

  const now = audioCtx.currentTime;

  try {
    switch (name) {
      case 'arrow_shoot': {
        // High-pitched string release twang and air whistle
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.09);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      case 'arrow_hit': {
        // Wood thud impact
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.06);
        break;
      }

      case 'magic_shoot': {
        // Mystical FM frequency modulation zap
        const carrier = audioCtx.createOscillator();
        const mod = audioCtx.createOscillator();
        const modGain = audioCtx.createGain();
        const mainGain = audioCtx.createGain();

        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(540, now);
        carrier.frequency.exponentialRampToValueAtTime(220, now + 0.16);

        mod.type = 'sawtooth';
        mod.frequency.setValueAtTime(320, now);

        modGain.gain.setValueAtTime(400, now);
        modGain.gain.exponentialRampToValueAtTime(20, now + 0.16);

        mod.connect(carrier.frequency);
        carrier.connect(mainGain);
        mainGain.connect(masterGain);

        mainGain.gain.setValueAtTime(0.3, now);
        mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        carrier.start(now);
        mod.start(now);
        carrier.stop(now + 0.16);
        mod.stop(now + 0.16);
        break;
      }

      case 'magic_hit': {
        // Crystalline sparkle burst
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.15);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'cannon_shoot': {
        // Punchy low-end kick + explosion burst
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);
        oscGain.gain.setValueAtTime(0.65, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.28);

        // Noise crackle
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(100, now + 0.25);
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.5, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.25);
        break;
      }

      case 'cannon_hit': {
        // Subwoofer rumble & dirt crunch
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(70, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
        oscGain.gain.setValueAtTime(0.7, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }

      case 'sword_clash': {
        // Metallic steel ring (dual resonant peak synthesis)
        [1850, 2680].forEach(freq => {
          if (!audioCtx || !masterGain) return;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.12);
        });
        break;
      }

      case 'soldier_rally':
      case 'reinforce': {
        // Royal Brass Bugle Call (G4 -> C5 -> E5 -> G5)
        const notes = [392, 523, 659, 784];
        notes.forEach((freq, idx) => {
          if (!audioCtx || !masterGain) return;
          const t = now + idx * 0.08;
          const osc = audioCtx.createOscillator();
          const filter = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, t);

          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);

          osc.start(t);
          osc.stop(t + 0.14);
        });
        break;
      }

      case 'meteor_fall': {
        // Descending rushing flame roar
        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
        filter.Q.value = 3;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.45);
        break;
      }

      case 'meteor_impact': {
        // Cataclysmic detonation
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 0.6);
        oscGain.gain.setValueAtTime(0.9, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.6);

        const noise = audioCtx.createBufferSource();
        noise.buffer = getNoiseBuffer(audioCtx);
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.linearRampToValueAtTime(80, now + 0.5);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.5);
        break;
      }

      case 'shaman_heal': {
        // Angelic mystical chime arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          if (!audioCtx || !masterGain) return;
          const t = now + idx * 0.06;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.22);
        });
        break;
      }

      case 'warlord_roar': {
        // Deep guttural beast war cry
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(75, now + 0.5);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);

        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }

      case 'wave_horn': {
        // Iconic Kingdom Rush War Horn
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(165, now + 0.18);
        osc.frequency.linearRampToValueAtTime(130, now + 0.65);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.45, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.7);
        break;
      }

      case 'button_click': {
        // Crisp wooden button tap
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(720, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case 'gold_gain': {
        // Shimmering coin clink
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(1975, now); // B6
        osc2.frequency.setValueAtTime(2637, now); // E7
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.12);
        osc2.stop(now + 0.12);
        break;
      }

      case 'upgrade': {
        // Magical construction jingle
        [523, 659, 784, 1046].forEach((f, i) => {
          if (!audioCtx || !masterGain) return;
          const t = now + i * 0.05;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(t);
          osc.stop(t + 0.15);
        });
        break;
      }

      case 'enemy_death': {
        // Squishy death grunt / pop
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'victory': {
        // Triumphant Royal Brass Fanfare
        const melody = [
          { f: 523.25, d: 0.15 }, // C5
          { f: 659.25, d: 0.15 }, // E5
          { f: 783.99, d: 0.2 },  // G5
          { f: 1046.5, d: 0.5 },  // C6
        ];
        let offset = 0;
        melody.forEach(n => {
          if (!audioCtx || !masterGain) return;
          const t = now + offset;
          const osc = audioCtx.createOscillator();
          const filter = audioCtx.createBiquadFilter();
          const gain = audioCtx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(n.f, t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1600, t);

          gain.gain.setValueAtTime(0.35, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);

          osc.start(t);
          osc.stop(t + n.d);
          offset += n.d * 0.8;
        });
        break;
      }

      case 'defeat': {
        // Somber minor gong
        const osc = audioCtx.createOscillator();
        const filter = audioCtx.createBiquadFilter();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(92.5, now); // F#2

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 1.2);
        break;
      }
    }
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

// ─── Ambient Procedural War Drums (Background Music) ────────────

let isMusicPlaying = false;
let stepCounter = 0;

export function playMusic(_track = 'battle'): void {
  if (muted || isMusicPlaying) return;
  initAudio();
  if (!audioCtx) return;

  isMusicPlaying = true;
  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.35;
  musicGain.connect(masterGain!);

  const bpm = 110;
  const stepInterval = (60 / bpm) / 2; // 8th notes in ms
  stepCounter = 0;

  musicInterval = window.setInterval(() => {
    if (!audioCtx || !musicGain || muted) return;
    const now = audioCtx.currentTime;

    // Medieval War Drum pattern (Kick on 1 and 3, rim tap on off-beats)
    const beat = stepCounter % 8;

    if (beat === 0 || beat === 4) {
      // Deep war bass drum
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.18);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (beat === 2 || beat === 6) {
      // Snare / woodblock tap
      const noise = audioCtx.createBufferSource();
      noise.buffer = getNoiseBuffer(audioCtx);
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.Q.value = 2;
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(musicGain);
      noise.start(now);
      noise.stop(now + 0.06);
    }

    stepCounter++;
  }, stepInterval * 1000);
}

export function stopMusic(): void {
  if (musicInterval !== null) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
  isMusicPlaying = false;
}
