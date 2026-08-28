/**
 * Web Audio API Ambient Sound & Breathing Bell Synthesizer
 * 100% Client-side synthetic audio generator (Zero external MP3 dependencies)
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private currentSource: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private currentTrackType: 'rain' | 'stream' | 'binaural' | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playBreathingBell() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(528, this.ctx.currentTime); // 528Hz Solfeggio frequency for calm
      osc.frequency.exponentialRampToValueAtTime(440, this.ctx.currentTime + 1.5);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 2.5);
    } catch (e) {
      console.warn('Audio bell error:', e);
    }
  }

  public startAmbientSound(type: 'rain' | 'stream' | 'binaural') {
    this.stopAmbientSound();
    this.initContext();
    if (!this.ctx) return;

    this.currentTrackType = type;
    this.isPlaying = true;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    if (type === 'rain' || type === 'stream') {
      // Pink/Brown noise generator for rain & streams
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Low pass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'rain' ? 800 : 450, this.ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(this.gainNode);
      whiteNoise.start();
      this.currentSource = whiteNoise;
    } else {
      // Binaural Calm 216Hz + 226Hz
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(216, this.ctx.currentTime);
      osc2.frequency.setValueAtTime(222, this.ctx.currentTime);

      osc1.connect(this.gainNode);
      osc2.connect(this.gainNode);

      osc1.start();
      osc2.start();
      this.currentSource = osc1;
    }
  }

  public stopAmbientSound() {
    if (this.currentSource) {
      try {
        (this.currentSource as any).stop?.();
      } catch (e) {}
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.currentTrackType = null;
  }

  public getPlaybackState() {
    return { isPlaying: this.isPlaying, track: this.currentTrackType };
  }
}

export const audioSynth = new AudioSynthesizer();
