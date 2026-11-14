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

  /** Change the music, crossfading. */
  setMusic(name: string): void {
    if (!this.ctx || this.muted || this.musicWanted === name) return;
    this.musicWanted = name;
    const now = this.ctx.currentTime;
    if (this.music) {
      const old = this.music.loop;
      old.gain.gain.setTargetAtTime(0, now, 1.2);
      setTimeout(() => old.src.stop(), 6000);
      this.music = null;
    }
    void this.load(`music-${name}`).then((buf) => {
      if (!buf || !this.ctx || this.musicWanted !== name) return;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.connect(this.musicBus);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(g);
      src.start();
      g.gain.setTargetAtTime(1, this.ctx.currentTime, 2);
      this.music = { name, loop: { src, gain: g } };
    });
  }
}
