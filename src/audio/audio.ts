// Sound: the effects, the ambience of wherever the player stands, and the music, all from the
// MP3s made through fal (public/audio/). Web Audio starts on the first touch, as browsers require.

const base = import.meta.env.BASE_URL;

type Loop = { src: AudioBufferSourceNode; gain: GainNode };

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
  volumes = { sfx: 0.8, ambience: 0.7, music: 0.6 };

  /** Call from a touch: makes the audio context and starts whatever was asked for. */
  unlock(): void {
    if (this.muted) return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.bus(this.volumes.sfx);
      this.ambBus = this.bus(this.volumes.ambience);
      this.musicBus = this.bus(this.volumes.music * 0.55);
      // Fetch the effects up front so the first cast is not silent.
      for (const n of ['cast', 'plop', 'nibble', 'bite', 'reel', 'snap', 'splash', 'catch', 'rare', 'coin', 'click', 'open', 'step', 'stepwood']) this.load(n);
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
    this.tone(900 + k * 500, 0, 0.045, 'square', 0.05);
  }

  /** A little brass band for a win, grander as the win is; a slide down for a loss. */
  band(level: 'none' | 'small' | 'big' | 'huge' | 'jackpot'): void {
    const n = (semi: number): number => 523.25 * 2 ** (semi / 12);
    if (level === 'none') {
      [0, -1, -2, -5].forEach((s, i) => this.tone(n(s - 5), i * 0.18, 0.28, 'sawtooth', 0.06));
      return;
    }
    if (level === 'small') {
      [0, 4, 7].forEach((s, i) => this.tone(n(s), i * 0.07, 0.2, 'triangle', 0.14));
      return;
    }
    const line = level === 'big' ? [0, 4, 7, 12] : level === 'huge' ? [0, 4, 7, 12, 7, 12, 16] : [0, 4, 7, 12, 16, 19, 24, 19, 24, 28];
    line.forEach((s, i) => {
      this.tone(n(s), i * 0.09, 0.3, 'triangle', 0.15);
      this.tone(n(s - 12), i * 0.09, 0.3, 'square', 0.035);
    });
    const end = line.length * 0.09;
    // A held chord to finish, with a shimmer on the biggest wins.
    for (const s of [0, 4, 7, 12]) this.tone(n(s + 12), end, level === 'jackpot' ? 1.4 : 0.8, 'triangle', 0.08);
    if (level !== 'big') for (let i = 0; i < 12; i++) this.tone(n(24 + ((i * 5) % 12)), end + i * 0.05, 0.12, 'sine', 0.05);
    this.play(level === 'jackpot' ? 'levelup' : 'coin', { volume: 0.7 });
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
