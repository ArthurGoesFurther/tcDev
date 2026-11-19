const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Sine that lingers at the extremes, so the pupils hold each side for a moment. */
const swing = (t, period) => clamp(Math.sin((TAU * t) / period) * 1.7, -1, 1);

/** Half-period boundary closest to the middle: switching there keeps the pupils from jumping. */
const midSwitch = (duration, period) =>
  Math.max(period / 2, Math.round(duration / period) * (period / 2));

/**
 * Each pose(t, duration) returns what the face does at second `t`
 * (see drawFace in sprite.js for the fields).
 */
export const EXERCISES = [
  { id: 'leftRight', pose: (t) => ({ lookX: swing(t, 2.4) }) },
  { id: 'upDown', pose: (t) => ({ lookY: -swing(t, 2.4) }) },
  {
    id: 'circles',
    pose: (t, duration) => {
      const w = TAU / 2.8;
      const half = duration / 2;
      const a = t < half ? w * t : w * (2 * half - t);
      return { lookX: Math.cos(a), lookY: Math.sin(a) };
    },
  },
  {
    id: 'diagonals',
    pose: (t, duration) => {
      const s = swing(t, 2.4);
      return t < midSwitch(duration, 2.4) ? { lookX: s, lookY: s } : { lookX: s, lookY: -s };
    },
  },
  {
    id: 'figureEight',
    pose: (t) => {
      const a = (TAU * t) / 3.4;
      return { lookX: Math.sin(a), lookY: Math.sin(2 * a) * 0.9 };
    },
  },
  { id: 'blink', pose: (t) => ({ lids: t % 0.6 < 0.16 ? 'closed' : 'open' }) },
  {
    id: 'squeeze',
    pose: (t) =>
      t % 3.6 < 2.2
        ? { lids: 'squeeze', mouth: 'tense', brows: 'tense' }
        : { mouth: 'o', brows: 'raised' },
  },
  {
    id: 'farAway',
    pose: (t) => ({
      lookX: 0.6 + Math.sin(t * 0.9) * 0.4,
      lookY: -0.8,
      lids: t % 4 < 0.18 ? 'closed' : 'open',
    }),
  },
  {
    id: 'nearFar',
    pose: (t) =>
      t % 3.2 < 1.6 ? { cross: 2, lookY: 0.6, mouth: 'o' } : { lookY: -0.6, mouth: 'smile' },
  },
  { id: 'palming', pose: () => ({ lids: 'relaxed' }) },
];

export const EXERCISE_IDS = EXERCISES.map((e) => e.id);

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id) ?? EXERCISES[0];

/** Pose for the whole popup: a short greeting, then the exercise itself. */
export const INTRO_SEC = 0.6;
export const poseAt = (exercise, t, duration) =>
  t < INTRO_SEC ? { mouth: 'open' } : exercise.pose(t - INTRO_SEC, duration - INTRO_SEC);
