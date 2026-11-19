let audio = null;

/** Short retro square-wave chirp, `notes` in Hz. */
export const chirp = (notes, step = 0.09) => {
  audio ??= new AudioContext();
  const start = audio.currentTime + 0.02;
  notes.forEach((freq, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const at = start + i * step;
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.05, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + step * 0.9);
    osc.connect(gain).connect(audio.destination);
    osc.start(at);
    osc.stop(at + step);
  });
};
