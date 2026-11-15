// Sound: the effects, the ambience of wherever the player stands, and the music, all from the
// MP3s made through fal (public/audio/). Web Audio starts on the first touch, as browsers require.
//
// The recordings are clean; the island is not. In the lo-fi look everything is played as an old
// handheld would play it: through a small speaker's narrow band with a little tape saturation,
// the effects cut to a few dozen levels so they crunch, and the music wavering slightly in pitch
// like a worn cassette. (The crunch is on the effects alone: on something as quiet as the waves
// it would be a crackle.)

const base = import.meta.env.BASE_URL;

type Loop = { src: AudioBufferSourceNode; gain: GainNode };

/** How many levels each half of an effect's wave is cut to. */
const CRUSH = 28;

/** A wave-shaper's curve from a function of -1 to 1. */
function curve(f: (x: number) => number): Float32Array<ArrayBuffer> {
  const n = 4096;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = f((i / (n - 1)) * 2 - 1);
  return c;
}

export class Audio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private musicBus!: GainNode;
  private loops = new Map<string, Loop>();
  private music: { name: string; loop: Loop } | null = null;
  private musicWanted = '';
  muted = false;
  /** Play everything the lo-fi way (set before the first touch). */
  lofi = false;
  volumes = { sfx: 0.8, ambience: 0.7, music: 0.6 };

  /** Call from a touch: makes the audio context and starts whatever was asked for. */
  unlock(): void {
    if (this.muted) return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      if (this.lofi) {
        const low = this.ctx.createBiquadFilter();
        low.type = 'highpass';
        low.frequency.value = 150;
        const high = this.ctx.createBiquadFilter();
        high.type = 'lowpass';
        high.frequency.value = 4600;
        high.Q.value = 0.6;
        const tape = this.ctx.createWaveShaper();
        tape.curve = curve((x) => Math.tanh(1.7 * x) / Math.tanh(1.7));
        // The saturation makes it louder; brought back down.
        const trim = this.ctx.createGain();
        trim.gain.value = 0.8;
        this.master.connect(low).connect(high).connect(tape).connect(trim).connect(this.ctx.destination);
      } else this.master.connect(this.ctx.destination);
      this.sfxBus = this.bus(this.volumes.sfx);
      if (this.lofi) {
        // The effects alone are cut to a few dozen levels.
        const crush = this.ctx.createWaveShaper();
        crush.curve = curve((x) => Math.round(x * CRUSH) / CRUSH);
        this.sfxBus.disconnect();
        this.sfxBus.connect(crush).connect(this.master);
      }
      this.ambBus = this.bus(this.volumes.ambience);
      this.musicBus = this.bus(this.volumes.music * 0.55);
      // Fetch the effects up front so the first cast is not silent.
      for (const n of ['cast', 'plop', 'nibble', 'bite', 'reel', 'snap', 'splash', 'catch', 'rare', 'coin', 'click', 'open', 'step', 'stepwood', 'tick', 'chip', 'jingle-small', 'jingle-big', 'jingle-lose']) this.load(n);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private bus(v: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.value = v;
    g.connect(this.master);
    return g;
  }

  setVolumes(v: { sfx: number; ambience: number; music: number }): void {
    this.volumes = v;
    if (!this.ctx) return;
    this.sfxBus.gain.value = v.sfx;
    this.ambBus.gain.value = v.ambience;
    this.musicBus.gain.value = v.music * 0.55;
  }

  private load(name: string): Promise<AudioBuffer | null> {
    if (!this.buffers.has(name)) {
      this.buffers.set(
        name,
        fetch(`${base}audio/${name}.mp3`)
          .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
          .then((b) => this.ctx!.decodeAudioData(b))
          .catch(() => null),
      );
    }
    return this.buffers.get(name)!;
  }

  /** Play an effect once. `rate` changes its pitch. */
  play(name: string, opts: { volume?: number; rate?: number } = {}): void {
    if (!this.ctx || this.muted) return;
    void this.load(name).then((buf) => {
      if (!buf || !this.ctx) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? 1;
      const g = this.ctx.createGain();
      g.gain.value = opts.volume ?? 1;
      src.connect(g).connect(this.sfxBus);
      src.start();
    });
  }

  /** A single synthesised note on the effects bus: frequency in Hz, start in seconds from now. */
  tone(freq: number, at = 0, dur = 0.15, type: OscillatorType = 'triangle', volume = 0.18): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** The tick of a strip or reel going past a marker; rises in pitch as `k` goes from 0 to 1. */
  tick(k = 0): void {
    this.play('tick', { volume: 0.5, rate: 1 + k * 0.45 });
  }

  /**
   * A jingle for a win, grander as the win is (steel drums, from Kenney's CC0 jingles through
   * patch.gg); a soft sax for a loss. The biggest wins add a synthesised shimmer on top.
   */
  band(level: 'none' | 'small' | 'big' | 'huge' | 'jackpot'): void {
    const jingle = { none: 'jingle-lose', small: 'jingle-small', big: 'jingle-big', huge: 'jingle-huge', jackpot: 'jingle-jackpot' }[level];
    this.play(jingle, { volume: level === 'none' ? 0.55 : 0.85 });
    if (level === 'huge' || level === 'jackpot') {
      const n = (semi: number): number => 523.25 * 2 ** (semi / 12);
      for (let i = 0; i < 14; i++) this.tone(n(24 + ((i * 5) % 12)), 0.25 + i * 0.06, 0.14, 'sine', 0.04);
      this.play('chips', { volume: 0.6 });
    }
    if (level === 'jackpot') this.play('levelup', { volume: 0.5 });
  }

  /** A drum roll: ticks closing in, for while a reel or a fish keeps everyone waiting. */
  roll(secs: number): void {
    for (let t = 0; t < secs; t += 0.06 - (t / secs) * 0.03) this.tone(180 + Math.random() * 40, t, 0.05, 'triangle', 0.08);
  }

  /** A goose-like honk: two reedy notes bent downward. */
  honk(): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [at, f] of [[0, 340], [0.22, 300]] as const) {
      for (const det of [0, 7]) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f + det, t + at);
        o.frequency.exponentialRampToValueAtTime((f + det) * 0.82, t + at + 0.2);
        g.gain.setValueAtTime(0.0001, t + at);
        g.gain.exponentialRampToValueAtTime(0.12, t + at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.21);
        o.connect(g).connect(this.sfxBus);
        o.start(t + at);
        o.stop(t + at + 0.25);
      }
    }
  }

  /** The gull: a silly squawk. */
  squawk(): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [at, f0, f1] of [[0, 900, 600], [0.16, 1000, 520]] as const) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f0, t + at);
      o.frequency.exponentialRampToValueAtTime(f1, t + at + 0.14);
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(0.09, t + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.15);
      o.connect(g).connect(this.sfxBus);
      o.start(t + at);
      o.stop(t + at + 0.2);
    }
  }

  /** Thunder: a crack and a long low roll, made of noise. `far` (0 to 1) is how far off, which makes it later, duller and quieter. */
  thunder(far = 0.5): void {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const secs = 3.2;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * secs), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let low = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate;
      // Brown noise, loud at once and dying away in lumps.
      low = (low + (Math.random() * 2 - 1) * 0.08) * 0.985;
      d[i] = low * 6 * Math.exp(-t * 1.1) * (0.6 + 0.4 * Math.sin(t * 9 + Math.sin(t * 3) * 2));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 900 - far * 600;
    const g = ctx.createGain();
    g.gain.value = 0.9 - far * 0.5;
    src.connect(tone).connect(g).connect(this.ambBus ?? this.sfxBus);
    src.start(ctx.currentTime + 0.3 + far * 2.2);
  }

  /** A sound that keeps going while wanted (reeling, the ambience). Volume 0 lets it fade and stop. */
  loop(name: string, volume: number, bus: 'sfx' | 'ambience' = 'ambience', rate = 1): void {
    if (!this.ctx || this.muted) return;
    const have = this.loops.get(name);
    const now = this.ctx.currentTime;
    if (have) {
      have.gain.gain.setTargetAtTime(volume, now, 0.4);
      have.src.playbackRate.setTargetAtTime(rate, now, 0.1);
      return;
    }
    if (volume <= 0.001) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.connect(bus === 'sfx' ? this.sfxBus : this.ambBus);
    // Hold a place so it is not started twice while loading.
    const placeholder = { src: this.ctx.createBufferSource(), gain: g };
    this.loops.set(name, placeholder);
    void this.load(name).then((buf) => {
      if (!buf || !this.ctx) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.playbackRate.value = rate;
      src.connect(g);
      src.start(0, Math.random() * buf.duration);
      placeholder.src = src;
      g.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.5);
    });
  }

  /** Change the music, crossfading. A piece plays through, then there is a rest, then it comes back. */
  setMusic(name: string): void {
    if (!this.ctx || this.muted || this.musicWanted === name) return;
    this.musicWanted = name;
    if (this.music) {
      const old = this.music.loop;
      old.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 1.2);
      setTimeout(() => {
        try {
          old.src.stop();
        } catch {
          /* Already stopped. */
        }
      }, 6000);
      this.music = null;
    }
    // A change of mood starts the new piece soon, but not on top of the old one.
    clearTimeout(this.restTimer);
    this.restTimer = window.setTimeout(() => this.startPiece(), this.resting ? 1500 : 2500);
  }

  private restTimer = 0;
  private resting = false;
  /** Keep the music going without rests (a radio nearby). */
  keepPlaying = false;

  private startPiece(): void {
    const name = this.musicWanted;
    if (!this.ctx || !name) return;
    this.resting = false;
    void this.load(`music-${name}`).then((buf) => {
      if (!buf || !this.ctx || this.musicWanted !== name || this.music) return;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.connect(this.musicBus);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(g);
      if (this.lofi) {
        // A worn tape: the pitch wavers a little, quickly and slowly at once.
        for (const [hz, depth] of [[0.55, 0.0022], [0.13, 0.004]] as const) {
          const wobble = this.ctx.createOscillator();
          const amount = this.ctx.createGain();
          wobble.frequency.value = hz;
          amount.gain.value = depth;
          wobble.connect(amount).connect(src.playbackRate);
          wobble.start();
          src.addEventListener('ended', () => wobble.stop());
        }
      }
      src.start();
      g.gain.setTargetAtTime(1, this.ctx.currentTime, 2.5);
      // Fade out over the last few seconds.
      g.gain.setTargetAtTime(0, this.ctx.currentTime + buf.duration - 6, 2);
      this.music = { name, loop: { src, gain: g } };
      src.onended = () => {
        if (this.music?.loop.src !== src) return;
        this.music = null;
        this.resting = true;
        // Quiet for a minute or two: the waves and birds have the island to themselves.
        const rest = this.keepPlaying ? 2000 : 50000 + Math.random() * 70000;
        this.restTimer = window.setTimeout(() => this.startPiece(), rest);
      };
    });
  }
}
